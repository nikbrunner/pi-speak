/**
 * Configuration migrations for pi-speak.
 *
 * Handles upgrades from older config versions to the current schema.
 */

import { SCHEMA_URL } from "./constants";
import { DEFAULT_CONFIG } from "./defaults";
import type { SpeakConfig } from "./schema";

// ─── Types ───────────────────────────────────────────────────────────────────

interface LegacyConfigV0 {
  voiceId?: string;
  bitrate?: string;
  speed?: number;
  pitch?: number;
  maxChunkChars?: number;
  shortcut?: string;
  debug?: boolean;
  summarizerModel?: string;
}

// ─── Migrations ──────────────────────────────────────────────────────────────

/**
 * Migrate v0 (flat) config to v1 (nested) schema.
 */
function migrateV0ToV1(raw: LegacyConfigV0): SpeakConfig {
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
      timeoutMs: DEFAULT_CONFIG.summarizer.timeoutMs
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

// ─── Export migration function ───────────────────────────────────────────────

export const CURRENT_VERSION = 1;

/**
 * Migrate raw config to current schema version.
 */
export function migrate(raw: unknown, fromVersion: number): SpeakConfig {
  const cfg = raw as Record<string, unknown>;

  if (fromVersion < 1) {
    return migrateV0ToV1(cfg as LegacyConfigV0);
  }

  // Future migrations:
  // if (fromVersion < 2) { ... }

  return cfg as SpeakConfig;
}
