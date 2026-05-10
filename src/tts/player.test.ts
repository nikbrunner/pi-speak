import { type ChildProcess } from "node:child_process";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { chunkBySentences } from "../helpers";
import { TTSPlayer } from "./player";
import type { BaseTTSConfig, SynthesisResult, TTSProvider } from "./provider";

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("./debug", () => ({
  debug: vi.fn(),
  debugError: vi.fn()
}));

// ── Helpers ──────────────────────────────────────────────────────────────────

interface TestConfig extends BaseTTSConfig {
  voiceId: string;
  speed: number;
}

function createMockProvider(synthesizeImpl?: (text: string) => Promise<SynthesisResult>): TTSProvider<TestConfig> {
  return {
    config: { voiceId: "test-voice", speed: 0, maxChunkChars: 900 },
    initialize: vi.fn().mockResolvedValue(undefined),
    synthesize:
      synthesizeImpl ??
      vi.fn().mockImplementation(async () => ({
        audio: Buffer.from("mock-audio")
      }))
  };
}

function createMockPlatform() {
  return {
    playAudio: vi.fn().mockImplementation(async (_file: string, onProc: (proc: ChildProcess) => void) => {
      const mockProc = { kill: vi.fn(), killed: false } as unknown as ChildProcess;
      onProc(mockProc);
    })
  };
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("TTSPlayer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("speak", () => {
    it("should bail out when text is empty", async () => {
      const provider = createMockProvider();
      const platform = createMockPlatform();
      const player = new TTSPlayer(platform, provider);
      const ui = { setWidget: vi.fn(), notify: vi.fn() };

      await player.speak("", ui);
      expect(provider.synthesize).not.toHaveBeenCalled();
    });

    it("should synthesize and play audio", async () => {
      const provider = createMockProvider();
      const platform = createMockPlatform();
      const player = new TTSPlayer(platform, provider);
      const ui = { setWidget: vi.fn(), notify: vi.fn() };

      await player.speak("Hello world.", ui);
      expect(provider.synthesize).toHaveBeenCalledWith("Hello world.");
      expect(platform.playAudio).toHaveBeenCalled();
      expect(player.cachedFiles.length).toBeGreaterThan(0);
    });

    it("should not re-fetch when cache exists", async () => {
      const provider = createMockProvider();
      const platform = createMockPlatform();
      const player = new TTSPlayer(platform, provider);
      const ui = { setWidget: vi.fn(), notify: vi.fn() };

      // First call: no cache, fetches
      await player.speak("Hello.", ui);
      const afterFirst = vi.mocked(provider.synthesize).mock.calls.length;
      expect(afterFirst).toBeGreaterThan(0);

      // Second call: cache exists from first, should not fetch again
      const beforeSecond = afterFirst;
      await player.speak("Hello.", ui);
      expect(vi.mocked(provider.synthesize).mock.calls.length).toBe(beforeSecond);
    });

    it("should clear cache when calling clearCache", async () => {
      const provider = createMockProvider();
      const platform = createMockPlatform();
      const player = new TTSPlayer(platform, provider);
      const ui = { setWidget: vi.fn(), notify: vi.fn() };

      await player.speak("Hello.", ui);
      expect(player.cachedFiles.length).toBeGreaterThan(0);

      player.clearCache();
      expect(player.cachedFiles.length).toBe(0);
    });

    it("should notify UI on error", async () => {
      const provider = createMockProvider(async () => {
        throw new Error("Synthesis failed");
      });
      const platform = createMockPlatform();
      const player = new TTSPlayer(platform, provider);
      const ui = { setWidget: vi.fn(), notify: vi.fn() };

      await player.speak("Hello.", ui);
      expect(ui.notify).toHaveBeenCalledWith(expect.stringContaining("Synthesis failed"), "error");
    });

    it("should split long text into chunks", async () => {
      const provider = createMockProvider();
      provider.config.maxChunkChars = 50;
      const platform = createMockPlatform();
      const player = new TTSPlayer(platform, provider);
      const ui = { setWidget: vi.fn(), notify: vi.fn() };

      const longText =
        "First sentence. Second sentence. Third sentence. Fourth sentence. Fifth sentence. Sixth sentence.";
      await player.speak(longText, ui);

      expect(vi.mocked(provider.synthesize).mock.calls.length).toBeGreaterThan(1);
    });
  });

  describe("ping", () => {
    it("should bail out when text is empty", async () => {
      const provider = createMockProvider();
      const platform = createMockPlatform();
      const player = new TTSPlayer(platform, provider);

      await player.ping("");
      expect(provider.synthesize).not.toHaveBeenCalled();
    });

    it("should synthesize and play ping audio", async () => {
      const provider = createMockProvider();
      const platform = createMockPlatform();
      const player = new TTSPlayer(platform, provider);

      await player.ping("Task completed.");
      expect(provider.synthesize).toHaveBeenCalledWith("Task completed.");
      expect(platform.playAudio).toHaveBeenCalled();
    });

    it("should not affect cached files", async () => {
      const provider = createMockProvider();
      const platform = createMockPlatform();
      const player = new TTSPlayer(platform, provider);

      const before = player.cachedFiles.length;
      await player.ping("Done.");
      expect(player.cachedFiles.length).toBe(before);
    });

    it("should not throw on fetch error", async () => {
      const provider = createMockProvider(async () => {
        throw new Error("API down");
      });
      const platform = createMockPlatform();
      const player = new TTSPlayer(platform, provider);

      await expect(player.ping("Done.")).resolves.not.toThrow();
    });

    it("should notify UI on error when ui is provided", async () => {
      const provider = createMockProvider(async () => {
        throw new Error("API down");
      });
      const platform = createMockPlatform();
      const player = new TTSPlayer(platform, provider);
      const ui = { setWidget: vi.fn(), notify: vi.fn() };

      await player.ping("Done.", ui);
      expect(ui.notify).toHaveBeenCalledWith(expect.stringContaining("API down"), "error");
    });
  });

  describe("stop", () => {
    it("should stop playing", async () => {
      const provider = createMockProvider();
      const player = new TTSPlayer(createMockPlatform(), provider);
      const ui = { setWidget: vi.fn(), notify: vi.fn() };

      const speakPromise = player.speak("Hello.", ui);
      await new Promise(r => setTimeout(r, 10));
      player.stop();

      await speakPromise;
      expect(player.playing).toBe(false);
    });

    it("should set playing to false", () => {
      const provider = createMockProvider();
      const player = new TTSPlayer(createMockPlatform(), provider);

      player.stop();
      expect(player.playing).toBe(false);
    });
  });

  describe("clearCache", () => {
    it("should clear cached files", () => {
      const provider = createMockProvider();
      const player = new TTSPlayer(createMockPlatform(), provider);

      player.clearCache();
      expect(player.cachedFiles.length).toBe(0);
    });
  });

  describe("state", () => {
    it("should start empty and not playing", () => {
      const provider = createMockProvider();
      const player = new TTSPlayer(createMockPlatform(), provider);

      expect(player.cachedFiles).toEqual([]);
      expect(player.playing).toBe(false);
    });

    it("should track playing state during speak", async () => {
      const provider = createMockProvider();
      const platform = createMockPlatform();
      const player = new TTSPlayer(platform, provider);
      const ui = { setWidget: vi.fn(), notify: vi.fn() };

      const promise = player.speak("Hello.", ui);
      expect(player.playing).toBe(true);
      await promise;
      expect(player.playing).toBe(false);
    });
  });

  describe("chunkBySentences", () => {
    it("should keep short text in one chunk", () => {
      const chunks = chunkBySentences("Hello world.", 200);
      expect(chunks).toHaveLength(1);
      expect(chunks[0]).toBe("Hello world.");
    });
  });
});
