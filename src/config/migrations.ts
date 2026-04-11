/**
 * Configuration migrations for pi-speak.
 *
 * Each migration transforms a config from version N to N+1.
 * On load, every config passes through the full chain from its current
 * version up to CURRENT_VERSION.
 */

import { SCHEMA_URL } from "./constants";
import { DEFAULT_CONFIG } from "./defaults";
import type { SpeakConfig } from "./schema";

type Migration = (cfg: Record<string, unknown>) => Record<string, unknown>;

/** v0 (flat) → v1 (nested schema) */
function migrateV0ToV1(raw: Record<string, unknown>): Record<string, unknown> {
  return {
    $schema: SCHEMA_URL,
    version: 1,
    tts: {
      voiceId: raw.voiceId ?? DEFAULT_CONFIG.tts.voiceId,
      bitrate: raw.bitrate ?? DEFAULT_CONFIG.tts.bitrate,
      speed: raw.speed ?? DEFAULT_CONFIG.tts.speed,
      pitch: raw.pitch ?? DEFAULT_CONFIG.tts.pitch,
      maxChunkChars: raw.maxChunkChars ?? DEFAULT_CONFIG.tts.maxChunkChars
    },
    behavior: {
      shortcut: raw.shortcut ?? DEFAULT_CONFIG.behavior.shortcut,
      pingEnabled: DEFAULT_CONFIG.behavior.pingEnabled,
      pingOnStartEnabled: DEFAULT_CONFIG.behavior.pingOnStartEnabled,
      fallbackPingText: DEFAULT_CONFIG.behavior.fallbackPingText
    },
    summarizer: {
      enabled: DEFAULT_CONFIG.summarizer.enabled,
      model: raw.summarizerModel ?? DEFAULT_CONFIG.summarizer.model,
      maxTokens: DEFAULT_CONFIG.summarizer.maxTokens,
      timeoutMs: DEFAULT_CONFIG.summarizer.timeoutMs,
      prompt: DEFAULT_CONFIG.summarizer.prompt
    },
    debug: {
      enabled: raw.debug ?? DEFAULT_CONFIG.debug.enabled,
      logPath: DEFAULT_CONFIG.debug.logPath,
      logMaxBytes: DEFAULT_CONFIG.debug.logMaxBytes
    },
    api: {
      unrealSpeechKey: DEFAULT_CONFIG.api.unrealSpeechKey,
      openRouterKey: DEFAULT_CONFIG.api.openRouterKey
    }
  };
}

/** v1 → v2 (add summarizer.prompt) */
function migrateV1ToV2(raw: Record<string, unknown>): Record<string, unknown> {
  const summarizer = (raw.summarizer ?? {}) as Record<string, unknown>;
  if (summarizer.prompt === undefined) {
    summarizer.prompt = DEFAULT_CONFIG.summarizer.prompt;
  }
  return { ...raw, version: 2, summarizer };
}

const migrations: Migration[] = [
  migrateV0ToV1, // index 0: runs for fromVersion === 0
  migrateV1ToV2 // index 1: runs for fromVersion === 1
];

export const CURRENT_VERSION = migrations.length;

/**
 * Migrate raw config to current schema version.
 * Applies each migration in sequence from fromVersion up to CURRENT_VERSION.
 */
export function migrate(raw: unknown, fromVersion: number): SpeakConfig {
  let cfg = raw as Record<string, unknown>;

  for (let i = fromVersion; i < migrations.length; i++) {
    cfg = migrations[i](cfg);
  }

  return cfg as SpeakConfig;
}
