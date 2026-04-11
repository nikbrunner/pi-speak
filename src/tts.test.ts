import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { SpeakConfig } from "./config/v1/schema";
import { TTSPlayer } from "./tts";

// Mock modules before importing TTSPlayer
vi.mock("./debug", () => ({
  debug: vi.fn(),
  debugError: vi.fn()
}));

vi.mock("node:fs", () => ({
  default: {
    existsSync: vi.fn().mockReturnValue(true),
    unlinkSync: vi.fn(),
    writeFileSync: vi.fn()
  },
  existsSync: vi.fn().mockReturnValue(true),
  unlinkSync: vi.fn(),
  writeFileSync: vi.fn()
}));

vi.mock("node:os", () => ({
  default: { tmpdir: () => "/tmp" },
  tmpdir: () => "/tmp"
}));

vi.mock("node:path", () => ({
  default: { join: (...args: string[]) => args.join("/") },
  join: (...args: string[]) => args.join("/")
}));

// Mock fetch for API calls
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("TTSPlayer", () => {
  beforeAll(() => {
    // Set required env var for TTS
    process.env.UNREAL_SPEECH_API_KEY = "test-api-key";
  });

  afterAll(() => {
    delete process.env.UNREAL_SPEECH_API_KEY;
  });

  const mockPlayAudio = vi.fn().mockResolvedValue(undefined);

  const createPlayer = (config?: Partial<SpeakConfig>): TTSPlayer => {
    const defaultConfig: SpeakConfig = {
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
        timeoutMs: 5000,
        prompt: "You write voice notifications."
      },
      debug: {
        enabled: true,
        logPath: "~/.pi-speak-debug.log",
        logMaxBytes: 2097152
      },
      api: {
        unrealSpeechKey: null,
        openRouterKey: null
      },
      ...config
    };

    return new TTSPlayer(
      {
        supported: true,
        isMuted: false,
        playAudio: mockPlayAudio
      },
      defaultConfig
    );
  };

  let player: TTSPlayer;

  beforeEach(() => {
    vi.clearAllMocks();
    player = createPlayer();
  });

  afterEach(() => {
    player.stop();
  });

  describe("initialization", () => {
    it("should not be playing initially", () => {
      expect(player.playing).toBe(false);
    });

    it("should have empty cache initially", () => {
      expect(player.cachedFiles).toEqual([]);
    });
  });

  describe("clearCache", () => {
    it("should clear all cached files", () => {
      // Access private field to set up test
      player["cachedAudioFiles"] = ["/tmp/test1.mp3", "/tmp/test2.mp3"];

      player.clearCache();

      expect(player.cachedFiles).toEqual([]);
    });
  });

  describe("stop", () => {
    it("should stop playback and reset playing state", () => {
      // Manually set playing state to test stop
      player["isPlaying"] = true;

      player.stop();

      expect(player.playing).toBe(false);
    });

    it("should increment generation to cancel pending playback", () => {
      const initialGeneration = player["playGeneration"];

      player.stop();

      expect(player["playGeneration"]).toBeGreaterThan(initialGeneration);
    });
  });

  describe("speak", () => {
    beforeEach(() => {
      // Mock successful TTS API response
      mockFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: async () => new ArrayBuffer(100)
      });
    });

    it("should fetch audio from Unreal Speech API", async () => {
      const ui = { setWidget: vi.fn(), notify: vi.fn() };

      await player.speak("Hello world", ui);

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.v8.unrealspeech.com/stream",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            Authorization: expect.stringContaining("Bearer")
          }),
          body: expect.stringContaining("Hello world")
        })
      );
    });

    it("should handle API errors gracefully", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => "Internal Server Error"
      });

      const ui = { setWidget: vi.fn(), notify: vi.fn() };

      await player.speak("Hello", ui);

      // Should notify user of error
      expect(ui.notify).toHaveBeenCalledWith(expect.stringContaining("500"), "error");
    });

    it("should play audio after fetching", async () => {
      const ui = { setWidget: vi.fn(), notify: vi.fn() };

      await player.speak("Hello", ui);

      expect(mockPlayAudio).toHaveBeenCalled();
    });

    it("should handle network errors", async () => {
      mockFetch.mockRejectedValue(new Error("Network error"));

      const ui = { setWidget: vi.fn(), notify: vi.fn() };

      await player.speak("Hello", ui);

      expect(ui.notify).toHaveBeenCalledWith(expect.stringContaining("Network error"), "error");
    });
  });

  describe("ping", () => {
    beforeEach(() => {
      mockFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: async () => new ArrayBuffer(100)
      });
    });

    it("should fetch and play ping audio", async () => {
      await player.ping("Work finished");

      expect(mockFetch).toHaveBeenCalled();
      expect(mockPlayAudio).toHaveBeenCalled();
    });

    it("should skip empty ping text", async () => {
      await player.ping("");

      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe("generation cancellation", () => {
    it("should increment generation when stop is called", () => {
      const initialGeneration = player["playGeneration"];

      player.stop();

      // Generation should be incremented, canceling any pending speak
      expect(player["playGeneration"]).toBe(initialGeneration + 1);
    });
  });

  describe("configuration", () => {
    it("should use custom voiceId from config", () => {
      const customPlayer = createPlayer({
        tts: { voiceId: "Melody", bitrate: "192k", speed: 0, pitch: 1.0, maxChunkChars: 900 }
      });

      expect(customPlayer["config"].voiceId).toBe("Melody");
    });

    it("should use custom maxChunkChars from config", () => {
      const customPlayer = createPlayer({
        tts: { voiceId: "Sierra", bitrate: "192k", speed: 0, pitch: 1.0, maxChunkChars: 500 }
      });

      expect(customPlayer["maxChunkChars"]).toBe(500);
    });

    it("should use custom shortcut label from config", () => {
      const customPlayer = createPlayer({
        behavior: {
          shortcut: "cmd+r",
          pingEnabled: true,
          pingOnStartEnabled: false,
          fallbackPingText: "Work finished."
        }
      });

      expect(customPlayer["shortcutLabel"]).toBe("cmd+r");
    });
  });
});
