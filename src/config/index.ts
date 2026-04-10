/**
 * Configuration module for pi-speak extension.
 *
 * Reads from ~/.config/pi-speak/config.json, with sensible defaults.
 * Uses Zod for runtime validation and supports versioned migrations.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { debug } from "../debug.js";
import { CONFIG_PATH, SCHEMA_URL } from "./constants.js";
import { DEFAULT_CONFIG } from "./defaults.js";
import { CURRENT_VERSION, migrate } from "./migrations.js";
import { SpeakConfigSchema, type SpeakConfig } from "./schema.js";

// ─── Load ───────────────────────────────────────────────────────────────────

/** Warn about unknown config keys that will be ignored */
function warnUnknownKeys(raw: Record<string, unknown>): void {
  const knownKeys = new Set(["$schema", "version", "tts", "behavior", "summarizer", "debug", "api"]);
  const unknownKeys = Object.keys(raw).filter(key => !knownKeys.has(key));

  if (unknownKeys.length > 0) {
    debug(`loadConfig: WARNING — ignoring unknown config keys: ${unknownKeys.join(", ")}`);
  }
}

export function loadConfig(): SpeakConfig {
  let rawConfig: Record<string, unknown> = {};

  if (existsSync(CONFIG_PATH)) {
    try {
      rawConfig = JSON.parse(readFileSync(CONFIG_PATH, "utf-8"));
      debug(`loadConfig: loaded from ${CONFIG_PATH}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      debug(`loadConfig: failed to parse ${CONFIG_PATH}: ${message}`);
      debug(`loadConfig: using defaults due to parse error`);
      return { ...DEFAULT_CONFIG };
    }
  } else {
    debug(`loadConfig: no config file at ${CONFIG_PATH}, using defaults`);
    return { ...DEFAULT_CONFIG };
  }

  warnUnknownKeys(rawConfig);

  const fileVersion = (rawConfig.version as number | undefined) ?? 0;

  if (fileVersion < CURRENT_VERSION) {
    debug(`loadConfig: migrating from v${fileVersion} to v${CURRENT_VERSION}`);
    return migrate(rawConfig, fileVersion);
  }

  const result = SpeakConfigSchema.safeParse(rawConfig);

  if (!result.success) {
    const errors = result.error.issues.map(issue => `${issue.path.join(".")}: ${issue.message}`).join("; ");
    debug(`loadConfig: validation failed — ${errors}`);
    debug(`loadConfig: using defaults due to validation errors`);
    return { ...DEFAULT_CONFIG };
  }

  debug(
    `loadConfig: voiceId=${result.data.tts.voiceId} bitrate=${result.data.tts.bitrate} ` +
      `speed=${result.data.tts.speed} pitch=${result.data.tts.pitch} shortcut=${result.data.behavior.shortcut}`
  );

  return result.data;
}

// ─── Init ────────────────────────────────────────────────────────────────────

export function initConfig(): void {
  if (existsSync(CONFIG_PATH)) return;

  try {
    mkdirSync(CONFIG_PATH.replace("/config.json", ""), { recursive: true });
    writeFileSync(CONFIG_PATH, generateDefaultConfigContent() + "\n");
    debug(`initConfig: created default config at ${CONFIG_PATH}`);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    debug(`initConfig: failed to create ${CONFIG_PATH}: ${message}`);
  }
}

function generateDefaultConfigContent(): string {
  return JSON.stringify(
    {
      $schema: SCHEMA_URL,
      version: 1,
      // https://docs.v8.unrealspeech.com/
      tts: {
        voiceId: "Sierra",
        bitrate: "192k",
        speed: 0,
        pitch: 1.0,
        maxChunkChars: 900
      },
      behavior: {
        shortcut: "alt+r",
        pingEnabled: true,
        pingOnStartEnabled: false,
        fallbackPingText: "Work finished."
      },
      // https://openrouter.ai/models
      summarizer: {
        enabled: true,
        model: "openai/gpt-oss-20b",
        maxTokens: 60,
        timeoutMs: 5000
      },
      debug: {
        enabled: true,
        logPath: "~/.pi-speak-debug.log",
        logMaxBytes: 2097152
      },
      api: {
        // Optional: set API keys here (env vars take precedence)
        unrealSpeechKey: null,
        openRouterKey: null
      }
    },
    null,
    2
  );
}

// Re-export types and schema for external use
export type { SpeakConfig } from "./schema.js";
export { SpeakConfigSchema, SCHEMA_URL } from "./schema.js";
