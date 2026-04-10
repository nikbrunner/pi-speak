import { describe, expect, it } from "vitest";
import { DEFAULT_CONFIG } from "./defaults";
import { CURRENT_VERSION, migrate } from "./migrations";
import { SpeakConfigSchema, type SpeakConfig } from "./schema";

// Full valid config for testing
const FULL_CONFIG: SpeakConfig = {
  $schema: "https://example.com/schema",
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
    logMaxBytes: 2097152
  },
  api: {
    unrealSpeechKey: null,
    openRouterKey: null
  }
};

describe("SpeakConfigSchema", () => {
  describe("valid configs", () => {
    it("should accept full valid config", () => {
      const result = SpeakConfigSchema.safeParse(FULL_CONFIG);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.tts.voiceId).toBe("Sierra");
        expect(result.data.behavior.shortcut).toBe("alt+r");
        expect(result.data.summarizer.enabled).toBe(true);
      }
    });

    it("should accept tts overrides", () => {
      const input = {
        ...FULL_CONFIG,
        tts: { ...FULL_CONFIG.tts, voiceId: "Scarlett", bitrate: "128k", speed: -0.5 }
      };
      const result = SpeakConfigSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.tts.voiceId).toBe("Scarlett");
        expect(result.data.tts.bitrate).toBe("128k");
        expect(result.data.tts.speed).toBe(-0.5);
      }
    });

    it("should accept behavior overrides", () => {
      const input = {
        ...FULL_CONFIG,
        behavior: { ...FULL_CONFIG.behavior, shortcut: "cmd+r", pingEnabled: false }
      };
      const result = SpeakConfigSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.behavior.shortcut).toBe("cmd+r");
        expect(result.data.behavior.pingEnabled).toBe(false);
      }
    });

    it("should accept summarizer overrides", () => {
      const input = {
        ...FULL_CONFIG,
        summarizer: { ...FULL_CONFIG.summarizer, enabled: false, model: "anthropic/claude-3" }
      };
      const result = SpeakConfigSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.summarizer.enabled).toBe(false);
        expect(result.data.summarizer.model).toBe("anthropic/claude-3");
      }
    });

    it("should accept api key overrides", () => {
      const input = {
        ...FULL_CONFIG,
        api: { unrealSpeechKey: "test-key", openRouterKey: "router-key" }
      };
      const result = SpeakConfigSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.api.unrealSpeechKey).toBe("test-key");
        expect(result.data.api.openRouterKey).toBe("router-key");
      }
    });
  });

  describe("invalid configs", () => {
    it("should reject tts.speed out of range (too high)", () => {
      const input = { ...FULL_CONFIG, tts: { ...FULL_CONFIG.tts, speed: 5 } };
      const result = SpeakConfigSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("should reject tts.speed out of range (too low)", () => {
      const input = { ...FULL_CONFIG, tts: { ...FULL_CONFIG.tts, speed: -2 } };
      const result = SpeakConfigSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("should reject tts.pitch out of range (too low)", () => {
      const input = { ...FULL_CONFIG, tts: { ...FULL_CONFIG.tts, pitch: 0.1 } };
      const result = SpeakConfigSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("should reject tts.pitch out of range (too high)", () => {
      const input = { ...FULL_CONFIG, tts: { ...FULL_CONFIG.tts, pitch: 2.0 } };
      const result = SpeakConfigSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("should reject maxChunkChars too small", () => {
      const input = { ...FULL_CONFIG, tts: { ...FULL_CONFIG.tts, maxChunkChars: 0 } };
      const result = SpeakConfigSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("should reject maxChunkChars exceeding limit", () => {
      const input = { ...FULL_CONFIG, tts: { ...FULL_CONFIG.tts, maxChunkChars: 1001 } };
      const result = SpeakConfigSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("should reject summarizer.maxTokens too small", () => {
      const input = { ...FULL_CONFIG, summarizer: { ...FULL_CONFIG.summarizer, maxTokens: 0 } };
      const result = SpeakConfigSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("should reject summarizer.maxTokens too large", () => {
      const input = { ...FULL_CONFIG, summarizer: { ...FULL_CONFIG.summarizer, maxTokens: 501 } };
      const result = SpeakConfigSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("should reject summarizer.timeoutMs too small", () => {
      const input = { ...FULL_CONFIG, summarizer: { ...FULL_CONFIG.summarizer, timeoutMs: 500 } };
      const result = SpeakConfigSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("should reject summarizer.timeoutMs too large", () => {
      const input = { ...FULL_CONFIG, summarizer: { ...FULL_CONFIG.summarizer, timeoutMs: 70000 } };
      const result = SpeakConfigSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("should reject invalid logMaxBytes (too small)", () => {
      const input = { ...FULL_CONFIG, debug: { ...FULL_CONFIG.debug, logMaxBytes: 512 } };
      const result = SpeakConfigSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("should reject invalid logMaxBytes (too large)", () => {
      const input = { ...FULL_CONFIG, debug: { ...FULL_CONFIG.debug, logMaxBytes: 20 * 1024 * 1024 } };
      const result = SpeakConfigSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  describe("boundary values", () => {
    it("should accept min tts.speed (-1)", () => {
      const input = { ...FULL_CONFIG, tts: { ...FULL_CONFIG.tts, speed: -1 } };
      const result = SpeakConfigSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("should accept max tts.speed (1)", () => {
      const input = { ...FULL_CONFIG, tts: { ...FULL_CONFIG.tts, speed: 1 } };
      const result = SpeakConfigSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("should accept min tts.pitch (0.5)", () => {
      const input = { ...FULL_CONFIG, tts: { ...FULL_CONFIG.tts, pitch: 0.5 } };
      const result = SpeakConfigSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("should accept max tts.pitch (1.5)", () => {
      const input = { ...FULL_CONFIG, tts: { ...FULL_CONFIG.tts, pitch: 1.5 } };
      const result = SpeakConfigSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("should accept min maxChunkChars (1)", () => {
      const input = { ...FULL_CONFIG, tts: { ...FULL_CONFIG.tts, maxChunkChars: 1 } };
      const result = SpeakConfigSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("should accept max maxChunkChars (1000)", () => {
      const input = { ...FULL_CONFIG, tts: { ...FULL_CONFIG.tts, maxChunkChars: 1000 } };
      const result = SpeakConfigSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("should accept min summarizer.maxTokens (1)", () => {
      const input = { ...FULL_CONFIG, summarizer: { ...FULL_CONFIG.summarizer, maxTokens: 1 } };
      const result = SpeakConfigSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("should accept max summarizer.maxTokens (500)", () => {
      const input = { ...FULL_CONFIG, summarizer: { ...FULL_CONFIG.summarizer, maxTokens: 500 } };
      const result = SpeakConfigSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("should accept min summarizer.timeoutMs (1000)", () => {
      const input = { ...FULL_CONFIG, summarizer: { ...FULL_CONFIG.summarizer, timeoutMs: 1000 } };
      const result = SpeakConfigSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("should accept max summarizer.timeoutMs (60000)", () => {
      const input = { ...FULL_CONFIG, summarizer: { ...FULL_CONFIG.summarizer, timeoutMs: 60000 } };
      const result = SpeakConfigSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("should accept min logMaxBytes (1024)", () => {
      const input = { ...FULL_CONFIG, debug: { ...FULL_CONFIG.debug, logMaxBytes: 1024 } };
      const result = SpeakConfigSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("should accept max logMaxBytes (10MB)", () => {
      const input = { ...FULL_CONFIG, debug: { ...FULL_CONFIG.debug, logMaxBytes: 10 * 1024 * 1024 } };
      const result = SpeakConfigSchema.safeParse(input);
      expect(result.success).toBe(true);
    });
  });
});

describe("migrate", () => {
  it("should migrate v0 flat config to v1 nested", () => {
    const v0Config = {
      voiceId: "Scarlett",
      bitrate: "128k",
      speed: 0.5,
      pitch: 1.2,
      maxChunkChars: 800,
      shortcut: "cmd+r",
      debug: false,
      summarizerModel: "anthropic/claude-3"
    };

    const migrated = migrate(v0Config, 0);

    expect(migrated.version).toBe(1);
    expect(migrated.tts.voiceId).toBe("Scarlett");
    expect(migrated.tts.bitrate).toBe("128k");
    expect(migrated.tts.speed).toBe(0.5);
    expect(migrated.tts.pitch).toBe(1.2);
    expect(migrated.tts.maxChunkChars).toBe(800);
    expect(migrated.behavior.shortcut).toBe("cmd+r");
    expect(migrated.debug.enabled).toBe(false);
    expect(migrated.summarizer.model).toBe("anthropic/claude-3");
  });

  it("should use defaults for missing v0 fields", () => {
    const v0Config = { voiceId: "Scarlett" };

    const migrated = migrate(v0Config, 0);

    expect(migrated.tts.voiceId).toBe("Scarlett");
    expect(migrated.tts.bitrate).toBe(DEFAULT_CONFIG.tts.bitrate);
    expect(migrated.behavior.shortcut).toBe(DEFAULT_CONFIG.behavior.shortcut);
    expect(migrated.summarizer.model).toBe(DEFAULT_CONFIG.summarizer.model);
  });

  it("should handle empty v0 config", () => {
    const v0Config = {};

    const migrated = migrate(v0Config, 0);

    expect(migrated.version).toBe(1);
    expect(migrated.tts.voiceId).toBe(DEFAULT_CONFIG.tts.voiceId);
  });

  it("should return current config if already at current version", () => {
    const v1Config: SpeakConfig = {
      ...FULL_CONFIG,
      tts: { ...FULL_CONFIG.tts, voiceId: "Scarlett" }
    };

    const result = migrate(v1Config, 1);

    expect(result.tts.voiceId).toBe("Scarlett");
  });
});

describe("CURRENT_VERSION", () => {
  it("should be 1", () => {
    expect(CURRENT_VERSION).toBe(1);
  });
});
