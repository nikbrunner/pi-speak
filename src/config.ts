import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { debug } from "./debug.js";

/**
 * Configuration for pi-speak extension.
 *
 * Reads from ~/.config/pi-speak/config.json, with sensible defaults.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SpeakConfig {
  /** Unreal Speech voice ID. Default: "Sierra" */
  voiceId: string;
  /** Audio bitrate. Default: "192k" */
  bitrate: string;
  /** Speech speed. -1.0 to 1.0. Default: 0 */
  speed: number;
  /** Speech pitch. 0.5 to 1.5. Default: 1.0 */
  pitch: number;
  /** Max chars per TTS chunk (Unreal Speech limit is 1000). Default: 900 */
  maxChunkChars: number;
  /** Keyboard shortcut for replay/stop. Default: "alt+r" */
  shortcut: string;
  /** Enable debug logging to ~/.pi-speak-debug.log. Default: true */
  debug: boolean;
  /** OpenRouter model for summarizer. Default: "openai/gpt-oss-20b" */
  summarizerModel: string;
}

const DEFAULT_CONFIG: SpeakConfig = {
  voiceId: "Sierra",
  bitrate: "192k",
  speed: 0,
  pitch: 1.0,
  maxChunkChars: 900,
  shortcut: "alt+r",
  debug: true,
  summarizerModel: "openai/gpt-oss-20b"
};

// ─── File path ───────────────────────────────────────────────────────────────

const CONFIG_DIR = join(homedir(), ".config", "pi-speak");
const CONFIG_PATH = join(CONFIG_DIR, "config.json");

// ─── Load ───────────────────────────────────────────────────────────────────

export function loadConfig(): SpeakConfig {
  let fileConfig: Partial<SpeakConfig> = {};

  if (existsSync(CONFIG_PATH)) {
    try {
      const raw = readFileSync(CONFIG_PATH, "utf-8");
      fileConfig = JSON.parse(raw);
      debug(`loadConfig: loaded from ${CONFIG_PATH}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      debug(`loadConfig: failed to parse ${CONFIG_PATH}: ${message}`);
    }
  } else {
    debug(`loadConfig: no config file at ${CONFIG_PATH}, using defaults`);
  }

  const config = { ...DEFAULT_CONFIG, ...fileConfig };
  debug(
    `loadConfig: voiceId=${config.voiceId} bitrate=${config.bitrate} speed=${config.speed} pitch=${config.pitch} shortcut=${config.shortcut}`
  );

  return config;
}

// ─── Init (create default config if missing) ─────────────────────────────────

export function initConfig(): void {
  if (existsSync(CONFIG_PATH)) return;

  try {
    mkdirSync(CONFIG_DIR, { recursive: true });
    writeFileSync(CONFIG_PATH, JSON.stringify(DEFAULT_CONFIG, null, 2) + "\n");
    debug(`initConfig: created default config at ${CONFIG_PATH}`);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    debug(`initConfig: failed to create ${CONFIG_PATH}: ${message}`);
  }
}
