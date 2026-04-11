import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { z } from "zod";
import { debug } from "../debug";
import { CONFIG_PATH, defaultConfig, SpeakConfigSchema, type SpeakConfig } from "./v1/schema";

// ─── Helpers ────────────────────────────────────────────────────────────────

function warnUnknownKeys(raw: Record<string, unknown>): void {
  const knownKeys = new Set(Object.keys(SpeakConfigSchema.shape));
  const unknownKeys = Object.keys(raw).filter(key => !knownKeys.has(key));

  if (unknownKeys.length > 0) {
    debug(`loadConfig: WARNING — ignoring unknown config keys: ${unknownKeys.join(", ")}`);
  }
}

function readJsonFile(path: string): Record<string, unknown> {
  return JSON.parse(readFileSync(path, "utf-8"));
}

// ─── Load ───────────────────────────────────────────────────────────────────

export function loadConfig(defaultConfig: SpeakConfig): { config: SpeakConfig; error: z.ZodError | Error | null } {
  if (!existsSync(CONFIG_PATH)) {
    debug(`loadConfig: no config file at ${CONFIG_PATH}, using defaults`);
    return { config: { ...defaultConfig }, error: null };
  }

  let rawConfig: Record<string, unknown>;
  try {
    rawConfig = readJsonFile(CONFIG_PATH);
    debug(`loadConfig: loaded from ${CONFIG_PATH}`);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    debug(`loadConfig: failed to parse ${CONFIG_PATH}: ${message}`);
    return { config: { ...defaultConfig }, error: new Error(`JSON parse error: ${message}`) };
  }

  warnUnknownKeys(rawConfig);

  const result = SpeakConfigSchema.safeParse(rawConfig);

  if (!result.success) {
    const summary = result.error.issues.map(issue => `${issue.path.join(".")}: ${issue.message}`).join("; ");
    debug(`loadConfig: validation failed — ${summary}`);
    return { config: { ...defaultConfig }, error: result.error };
  }

  debug(
    `loadConfig: voiceId=${result.data.tts.voiceId} bitrate=${result.data.tts.bitrate} ` +
      `speed=${result.data.tts.speed} pitch=${result.data.tts.pitch} shortcut=${result.data.behavior.shortcut}`
  );

  return { config: result.data, error: null };
}

// ─── Revalidate ─────────────────────────────────────────────────────────────

export function revalidateConfig(): z.ZodError | Error | null {
  if (!existsSync(CONFIG_PATH)) return null;

  let rawConfig: Record<string, unknown>;
  try {
    rawConfig = readJsonFile(CONFIG_PATH);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return new Error(`JSON parse error: ${message}`);
  }

  const result = SpeakConfigSchema.safeParse(rawConfig);
  return result.success ? null : result.error;
}

// ─── Init ───────────────────────────────────────────────────────────────────

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
