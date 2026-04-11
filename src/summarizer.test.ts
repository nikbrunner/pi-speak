import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SpeakConfig } from "./config/v1/schema";
import { summarizeForPing } from "./summarizer";

// Mock the debug module
vi.mock("./debug", () => ({
  debug: vi.fn(),
  debugError: vi.fn()
}));

describe("summarizeForPing", () => {
  const defaultConfig: SpeakConfig["summarizer"] = {
    enabled: true,
    model: "openai/gpt-oss-20b",
    maxTokens: 60,
    timeoutMs: 5000,
    prompt: "You write voice notifications."
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock fetch globally
    global.fetch = vi.fn();
  });

  describe("fallback behavior", () => {
    it("should use fallback when summarizer is disabled", async () => {
      const result = await summarizeForPing({
        responseText: "Hello world",
        config: { ...defaultConfig, enabled: false },
        fallbackPingText: "Work finished."
      });

      expect(result).toBe("Work finished.. Hello world…");
    });

    it("should use fallback when no API key provided", async () => {
      const result = await summarizeForPing({
        responseText: "Hello world",
        config: defaultConfig,
        apiKey: undefined,
        fallbackPingText: "Done."
      });

      expect(result).toBe("Done.. Hello world…");
    });

    it("should include session name in fallback", async () => {
      const result = await summarizeForPing({
        responseText: "Hello",
        sessionName: "my-session",
        config: { ...defaultConfig, enabled: false },
        fallbackPingText: "Done"
      });

      expect(result).toContain("my-session");
    });

    it("should truncate long response text in fallback", async () => {
      const longText = "a".repeat(200);
      const result = await summarizeForPing({
        responseText: longText,
        config: { ...defaultConfig, enabled: false },
        fallbackPingText: "Done"
      });

      expect(result.length).toBeLessThan(longText.length + 20);
      expect(result).toContain("…");
    });
  });

  describe("LLM summarizer", () => {
    it("should call OpenRouter API when summarizer enabled and key provided", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ choices: [{ message: { content: "Test summary" } }] })
      });
      global.fetch = mockFetch;

      const result = await summarizeForPing({
        responseText: "Hello world",
        config: defaultConfig,
        apiKey: "test-key",
        fallbackPingText: "Done"
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "https://openrouter.ai/api/v1/chat/completions",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            Authorization: "Bearer test-key"
          })
        })
      );
      expect(result).toBe("Test summary");
    });

    it("should fall back on API error", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500
      });
      global.fetch = mockFetch;

      const result = await summarizeForPing({
        responseText: "Hello",
        config: defaultConfig,
        apiKey: "test-key",
        fallbackPingText: "Error fallback"
      });

      expect(result).toContain("Error fallback");
    });

    it("should fall back on empty response", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ choices: [] })
      });
      global.fetch = mockFetch;

      const result = await summarizeForPing({
        responseText: "Hello",
        config: defaultConfig,
        apiKey: "test-key",
        fallbackPingText: "Empty response"
      });

      expect(result).toContain("Empty response");
    });

    it("should fall back on fetch error", async () => {
      const mockFetch = vi.fn().mockRejectedValue(new Error("Network error"));
      global.fetch = mockFetch;

      const result = await summarizeForPing({
        responseText: "Hello",
        config: defaultConfig,
        apiKey: "test-key",
        fallbackPingText: "Network error"
      });

      expect(result).toContain("Network error");
    });
  });
});
