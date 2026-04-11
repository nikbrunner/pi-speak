import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { debug } from "../debug";
import { CONFIG_PATH, defaultConfig, SpeakConfigSchema, type SpeakConfig } from "./v1/schema";

// ─── Load ───────────────────────────────────────────────────────────────────

/** Warn about unknown config keys that will be ignored */
function warnUnknownKeys(raw: Record<string, unknown>): void {
  const knownKeys = new Set(Object.keys(SpeakConfigSchema.shape));
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

export function loadConfig(defaultConfig: SpeakConfig): SpeakConfig {
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
    return { ...defaultConfig };
  }

  if (parseError) {
    pendingValidationErrors = [{ path: "config", message: "JSON parse error", value: undefined }];
    return { ...defaultConfig };
  }

  warnUnknownKeys(rawConfig);

  const result = SpeakConfigSchema.safeParse(rawConfig);

  if (!result.success) {
    captureValidationErrors(result, rawConfig);
    const errors = result.error.issues.map(issue => `${issue.path.join(".")}: ${issue.message}`).join("; ");
    debug(`loadConfig: validation failed — ${errors}`);
    debug(`loadConfig: using defaults due to validation errors`);
    return { ...defaultConfig };
  }

  debug(
    `loadConfig: voiceId=${result.data.tts.voiceId} bitrate=${result.data.tts.bitrate} ` +
      `speed=${result.data.tts.speed} pitch=${result.data.tts.pitch} shortcut=${result.data.behavior.shortcut}`
  );

  return result.data;
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

  const rawConfig = (() => {
    try {
      return JSON.parse(readFileSync(CONFIG_PATH, "utf-8"));
    } catch {
      pendingValidationErrors = [{ path: "config", message: "JSON parse error", value: undefined }];
      return null;
    }
  })();

  if (rawConfig === null) return;

  const result = SpeakConfigSchema.safeParse(rawConfig);
  pendingValidationErrors = result.success ? [] : (captureValidationErrors(result, rawConfig), pendingValidationErrors);
}

// ─── Init ────────────────────────────────────────────────────────────────────

export function initConfig(configPath: string): void {
  if (existsSync(configPath)) return;

  const defaultConfigJson = JSON.stringify(defaultConfig, null, 2);

  try {
    mkdirSync(dirname(configPath), { recursive: true });
    writeFileSync(configPath, defaultConfigJson + "\n");
    debug(`initConfig: created default config at ${configPath}`);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    debug(`initConfig: failed to create ${configPath}: ${message}`);
  }
}
