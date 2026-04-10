/**
 * pi-speak — Voice readback extension for Pi
 *
 * When the agent finishes a turn, this extension:
 *   1. Speaks a short voice ping: what was done + which tmux session
 *   2. Registers alt+r (or configured shortcut) to replay / stop the last response
 *   3. Shows a status widget below the editor
 *
 * Settings: see ~/.config/pi-speak/config.json
 * API key: set UNREAL_SPEECH_API_KEY in your environment (source ~/.env in your shell)
 * Optional: OPENROUTER_API_KEY for smarter voice ping summaries
 */

import { execSync } from "node:child_process";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { initConfig, loadConfig } from "./config.js";
import { debug, debugError, setDebugEnabled } from "./debug.js";
import { stripMarkdown } from "./helpers.js";
import { createPlatform, isPlatformSupported } from "./platform.js";
import { summarizeForPing } from "./summarizer.js";
import { TTSPlayer } from "./tts.js";

export interface UI {
  setWidget(key: string, content: string[] | undefined): void;
  notify(msg: string, type: "info" | "warning" | "error"): void;
}

export default function (pi: ExtensionAPI) {
  const config = loadConfig();
  setDebugEnabled(config.debug);

  // Warn if platform is not supported
  if (!isPlatformSupported()) {
    debug(`platform "${process.platform}" is not supported — audio playback disabled`);
    pi.ui.notify(
      `speak: platform "${process.platform}" is not supported. Only macOS is supported for audio playback.`,
      "warning"
    );
    pi.ui.setWidget("speak", ["🔊 Platform not supported"]);
  }

  const platform = createPlatform();
  const player = new TTSPlayer(platform, config);

  // ── State ──────────────────────────────────────────────────────────────────

  let lastResponseText = "";
  let disabled = false;
  let sessionName = "";

  // ── Extract assistant text ────────────────────────────────────────────────

  function extractAssistantText(
    messages: { role?: string; content?: Array<{ type: string; text?: string }> }[]
  ): string {
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      if (msg?.role !== "assistant") continue;

      const textParts: string[] = [];
      for (const block of msg.content ?? []) {
        if (block.type === "text" && typeof block.text === "string") {
          textParts.push(block.text);
        }
      }

      if (textParts.length > 0) {
        return stripMarkdown(textParts.join("\n"));
      }
    }
    return "";
  }

  // ── Session start ─────────────────────────────────────────────────────────

  pi.on("session_start", async (_event, ctx) => {
    debug("=== session_start ===");

    // Capture session name for voice ping
    if (process.env.TMUX_PANE) {
      try {
        sessionName = execSync(`tmux display-message -p -t '${process.env.TMUX_PANE}' '#{session_name}'`, {
          encoding: "utf-8",
          stdio: ["pipe", "pipe", "pipe"]
        }).trim();
      } catch {
        sessionName = "";
      }
    }

    // Create default config file if missing
    initConfig();

    // Clear stale audio cache from previous sessions
    player.clearCache();

    // Check for required API key (should be set in user's environment)
    if (!process.env.UNREAL_SPEECH_API_KEY) {
      disabled = true;
      debug("session_start: NO API KEY — extension disabled");
      ctx.ui.notify(
        "speak: UNREAL_SPEECH_API_KEY not set — voice readback disabled. Set it in your environment (e.g., source ~/.env)",
        "warning"
      );
      ctx.ui.setWidget("speak", undefined);
      return;
    }

    debug("session_start: API key loaded, extension enabled");
    ctx.ui.setWidget("speak", ["🔊 " + config.shortcut + " read aloud"]);
  });

  // ── Agent end ─────────────────────────────────────────────────────────────

  pi.on("agent_end", async (event, ctx) => {
    debug("=== agent_end ===");
    if (disabled) {
      debug("agent_end: SKIPPED (disabled)");
      return;
    }

    const text = extractAssistantText(event.messages);
    debug(`agent_end: extracted text length=${text.length} preview="${text.slice(0, 80)}"`);
    if (!text) {
      debug("agent_end: no assistant text — skipping");
      return;
    }

    // Clear cached audio from previous response (conversation moved on)
    if (text !== lastResponseText) {
      debug(`agent_end: new response (${text.length} chars), clearing old cache`);
      player.clearCache();
    }
    lastResponseText = text;
    ctx.ui.setWidget("speak", ["🔊 Ready  " + config.shortcut + " replay"]);

    // Generate short voice ping summary (LLM if OpenRouter key, else fallback)
    const ping = await summarizeForPing({
      responseText: text,
      sessionName: sessionName || undefined,
      model: config.summarizerModel
    });
    debug(`agent_end: voice ping = "${ping}"`);

    // Speak the ping (short, not cached — alt+r replays the full response)
    player.ping(ping);
  });

  // ── Shortcut: alt+r — replay / stop ───────────────────────────────────────

  pi.registerShortcut(config.shortcut, {
    description: "Replay last response aloud / stop current playback",
    handler: ctx => {
      debug(`=== shortcut: ${config.shortcut} pressed ===`);
      if (disabled) {
        debug(`shortcut: SKIPPED (disabled)`);
        return;
      }

      if (player.playing) {
        debug(`shortcut: STOP (was playing)`);
        player.stop();
        ctx.ui.setWidget("speak", ["🔊 Ready  " + config.shortcut + " replay"]);
        return;
      }

      if (!lastResponseText) {
        debug(`shortcut: no response to replay`);
        ctx.ui.notify("speak: no response to replay yet", "info");
        return;
      }

      debug(`shortcut: REPLAY (text length=${lastResponseText.length})`);
      try {
        player.speak(lastResponseText, ctx.ui);
      } catch (err) {
        debugError("shortcut: speak() threw", err);
        ctx.ui.notify(`speak: replay error — ${err instanceof Error ? err.message : String(err)}`, "error");
      }
    }
  });
}
