import { describe, expect, it } from "vitest";
import { DEFAULT_CONFIG } from "./defaults";
import { CURRENT_VERSION, migrate } from "./migrations";
import type { SpeakConfig } from "./schema";

// ─── Helpers ───────────────────────────────────────────────────────────────────

function v0Config(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return { ...overrides };
}

function v1Config(overrides: Partial<SpeakConfig> = {}): SpeakConfig {
  return {
    $schema: "https://example.com/schema",
    version: 1,
    tts: { ...DEFAULT_CONFIG.tts },
    behavior: { ...DEFAULT_CONFIG.behavior },
    summarizer: { ...DEFAULT_CONFIG.summarizer },
    debug: { ...DEFAULT_CONFIG.debug },
    api: { ...DEFAULT_CONFIG.api },
    ...overrides
  };
}

// ─── v0 → v1 ─────────────────────────────────────────────────────────────────

describe("migrateV0ToV1", () => {
  it("should flatten v0 flat config to v1 nested schema", () => {
    const v0 = v0Config({
      voiceId: "Scarlett",
      bitrate: "128k",
      speed: 0.5,
      pitch: 1.2,
      maxChunkChars: 800,
      shortcut: "cmd+r",
      debug: false,
      summarizerModel: "anthropic/claude-3"
    });

    const migrated = migrate(v0, 0);

    expect(migrated.version).toBe(2);
    expect(migrated.tts.voiceId).toBe("Scarlett");
    expect(migrated.tts.bitrate).toBe("128k");
    expect(migrated.tts.speed).toBe(0.5);
    expect(migrated.tts.pitch).toBe(1.2);
    expect(migrated.tts.maxChunkChars).toBe(800);
    expect(migrated.behavior.shortcut).toBe("cmd+r");
    expect(migrated.debug.enabled).toBe(false);
    expect(migrated.summarizer.model).toBe("anthropic/claude-3");
    expect(migrated.summarizer.prompt).toBe(DEFAULT_CONFIG.summarizer.prompt);
  });

  it("should use defaults for missing v0 fields", () => {
    const v0 = v0Config({ voiceId: "Scarlett" });

    const migrated = migrate(v0, 0);

    expect(migrated.tts.voiceId).toBe("Scarlett");
    expect(migrated.tts.bitrate).toBe(DEFAULT_CONFIG.tts.bitrate);
    expect(migrated.behavior.shortcut).toBe(DEFAULT_CONFIG.behavior.shortcut);
    expect(migrated.summarizer.model).toBe(DEFAULT_CONFIG.summarizer.model);
  });

  it("should handle empty v0 config", () => {
    const migrated = migrate(v0Config({}), 0);

    expect(migrated.tts.voiceId).toBe(DEFAULT_CONFIG.tts.voiceId);
  });
});

// ─── v1 → v2 ─────────────────────────────────────────────────────────────────

describe("migrateV1ToV2", () => {
  it("should add summarizer.prompt with default value", () => {
    // Simulate old v1 config before prompt field existed
    const v1: Record<string, unknown> = {
      version: 1,
      tts: DEFAULT_CONFIG.tts,
      behavior: DEFAULT_CONFIG.behavior,
      summarizer: {
        enabled: true,
        model: "openai/gpt-oss-20b",
        maxTokens: 60,
        timeoutMs: 5000
      },
      debug: DEFAULT_CONFIG.debug,
      api: DEFAULT_CONFIG.api
    };

    const migrated = migrate(v1, 1);

    expect(migrated.summarizer.prompt).toBe(DEFAULT_CONFIG.summarizer.prompt);
    expect(migrated.summarizer.model).toBe("openai/gpt-oss-20b");
  });

  it("should preserve existing custom prompt", () => {
    const customPrompt = "Be funny and brief.";
    const v1 = v1Config({
      summarizer: {
        enabled: true,
        model: "openai/gpt-oss-20b",
        maxTokens: 60,
        timeoutMs: 5000,
        prompt: customPrompt
      }
    });

    const migrated = migrate(v1 as unknown as Record<string, unknown>, 1);

    expect(migrated.summarizer.prompt).toBe(customPrompt);
  });
});

// ─── Chained migration ───────────────────────────────────────────────────────

describe("chained migration (v0 → v2)", () => {
  it("should run full chain from v0 to current version", () => {
    const v0 = v0Config({
      voiceId: "Scarlett",
      summarizerModel: "anthropic/claude-3"
    });

    const migrated = migrate(v0, 0);

    expect(migrated.version).toBe(2);
    expect(migrated.tts.voiceId).toBe("Scarlett");
    expect(migrated.summarizer.model).toBe("anthropic/claude-3");
    expect(migrated.summarizer.prompt).toBe(DEFAULT_CONFIG.summarizer.prompt);
  });
});

// ─── CURRENT_VERSION ─────────────────────────────────────────────────────────

describe("CURRENT_VERSION", () => {
  it("should match migrations array length", () => {
    expect(CURRENT_VERSION).toBe(2);
  });
});
