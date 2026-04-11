/**
 * Configuration module for pi-speak extension.
 *
 * Reads from ~/.config/pi-speak/config.json, with sensible defaults.
 * Uses Zod for runtime validation and supports versioned migrations.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { debug } from "../debug";
import { CONFIG_PATH, SCHEMA_URL } from "./constants";
import { DEFAULT_CONFIG } from "./defaults";
import { CURRENT_VERSION, migrate } from "./migrations";
import { SpeakConfigSchema, type SpeakConfig } from "./schema";

// ─── Load ───────────────────────────────────────────────────────────────────

/** Warn about unknown config keys that will be ignored */
function warnUnknownKeys(raw: Record<string, unknown>): void {
  const knownKeys = new Set(["$schema", "version", "tts", "behavior", "summarizer", "debug", "api"]);
  const unknownKeys = Object.keys(raw).filter(key => !knownKeys.has(key));

  if (unknownKeys.length > 0) {
    debug(`loadConfig: WARNING — ignoring unknown config keys: ${unknownKeys.join(", ")}`);
  }
}

/** Validation errors to report to user */
let pendingValidationErrors: { path: string; message: string; value: unknown }[] = [];

/**
 * Extracts the faulty value from a Zod issue for display.
 */
function extractFaultyValue(issue: { code: string; path: PropertyKey[] }, raw: Record<string, unknown>): unknown {
  if (issue.code === "invalid_type") return (issue as { received?: unknown }).received;
  // For range errors (too_big, too_small), return the actual config value at the path
  const path = issue.path.join(".");
  return path in raw ? raw[path] : undefined;
}

/**
 * Captures validation errors from a Zod result into the module state.
 */
function captureValidationErrors(
  result: { error: { issues: Array<{ code: string; path: PropertyKey[]; message: string }> } },
  raw: Record<string, unknown>
): void {
  pendingValidationErrors = result.error.issues.map(issue => ({
    path: issue.path.join(".") || "root",
    message: issue.message,
    value: extractFaultyValue(issue as { code: string; path: string[] }, raw)
  }));
}

/**
 * Returns validation errors (can be called multiple times without consuming).
 */
export function getValidationErrors(): { path: string; message: string; value: unknown }[] {
  return pendingValidationErrors;
}

export function loadConfig(): SpeakConfig {
  let rawConfig: Record<string, unknown> = {};
  let parseError = false;

  if (existsSync(CONFIG_PATH)) {
    try {
      rawConfig = JSON.parse(readFileSync(CONFIG_PATH, "utf-8"));
      debug(`loadConfig: loaded from ${CONFIG_PATH}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      debug(`loadConfig: failed to parse ${CONFIG_PATH}: ${message}`);
      debug(`loadConfig: using defaults due to parse error`);
      parseError = true;
    }
  } else {
    debug(`loadConfig: no config file at ${CONFIG_PATH}, using defaults`);
    return { ...DEFAULT_CONFIG };
  }

  if (parseError) {
    pendingValidationErrors = [{ path: "config", message: "JSON parse error", value: undefined }];
    return { ...DEFAULT_CONFIG };
  }

  warnUnknownKeys(rawConfig);

  const fileVersion = (rawConfig.version as number | undefined) ?? 0;

  // Migrate if needed and save back to file
  if (fileVersion < CURRENT_VERSION) {
    debug(`loadConfig: migrating from v${fileVersion} to v${CURRENT_VERSION}`);
    const migratedConfig = migrate(rawConfig, fileVersion);
    saveConfig(migratedConfig);
    return migratedConfig;
  }

  const result = SpeakConfigSchema.safeParse(rawConfig);

  if (!result.success) {
    captureValidationErrors(result, rawConfig);
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

/** Save config to file */
function saveConfig(config: SpeakConfig): void {
  try {
    writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2) + "\n");
    debug(`saveConfig: saved migrated config to ${CONFIG_PATH}`);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    debug(`saveConfig: failed to save ${CONFIG_PATH}: ${message}`);
  }
}

// ─── Revalidate ───────────────────────────────────────────────────────────────

/**
 * Re-reads and re-validates the config file, updating validation errors.
 * Call this on user input to detect config fixes without reloading.
 */
export function revalidateConfig(): void {
  if (!existsSync(CONFIG_PATH)) {
    pendingValidationErrors = [];
    return;
  }

  let rawConfig: Record<string, unknown> = {};
  try {
    rawConfig = JSON.parse(readFileSync(CONFIG_PATH, "utf-8"));
  } catch {
    pendingValidationErrors = [{ path: "config", message: "JSON parse error", value: undefined }];
    return;
  }

  const result = SpeakConfigSchema.safeParse(rawConfig);
  if (!result.success) {
    captureValidationErrors(result, rawConfig);
    return;
  }

  pendingValidationErrors = [];
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
export type { SpeakConfig } from "./schema";
export { SpeakConfigSchema, SCHEMA_URL } from "./schema";
