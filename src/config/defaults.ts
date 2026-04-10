/**
 * Default configuration values for pi-speak.
 */

import type { SpeakConfig } from "./schema";

export const DEFAULT_CONFIG: SpeakConfig = {
  $schema: "https://raw.githubusercontent.com/nikbrunner/pi-speak/main/src/config/schema.json",
  version: 1,
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
  summarizer: {
    enabled: true,
    model: "openai/gpt-oss-20b",
    maxTokens: 60,
    timeoutMs: 5000
  },
  debug: {
    enabled: true,
    logPath: "~/.pi-speak-debug.log",
    logMaxBytes: 2 * 1024 * 1024
  },
  api: {
    unrealSpeechKey: null,
    openRouterKey: null
  }
};
