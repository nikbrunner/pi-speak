/**
 * OpenAI TTS provider for pi-speak.
 *
 * Uses the gpt-4o-mini-tts model via /v1/audio/speech for expressive,
 * personality-steerable voice synthesis.
 */

import { debug } from "../../debug";
import type { BaseTTSConfig, SynthesisResult, TTSProvider } from "../provider";

export interface OpenAITTSConfig extends BaseTTSConfig {
  provider: "openai";
  voice: string;
  model: string;
  instructions: string;
  speed: number;
  format: string;
  /** Base URL override (e.g. https://openrouter.ai/api/v1 for OpenRouter) */
  baseUrl: string;
}

export class OpenAITTSProvider implements TTSProvider<OpenAITTSConfig> {
  private apiKey: string | null = null;

  constructor(public readonly config: OpenAITTSConfig) {}

  async initialize(): Promise<void> {
    const isOpenRouter = this.config.baseUrl.includes("openrouter");
    this.apiKey =
      (isOpenRouter ? process.env.OPENROUTER_API_KEY : process.env.OPENAI_API_KEY) ??
      (isOpenRouter ? process.env.OPENAI_API_KEY : process.env.OPENROUTER_API_KEY) ??
      null;
    if (!this.apiKey) {
      throw new Error("OPENAI_API_KEY or OPENROUTER_API_KEY not set");
    }
    const source = isOpenRouter
      ? process.env.OPENROUTER_API_KEY
        ? "OPENROUTER_API_KEY"
        : "OPENAI_API_KEY"
      : process.env.OPENAI_API_KEY
        ? "OPENAI_API_KEY"
        : "OPENROUTER_API_KEY";

    // Validate the key with a minimal API call
    try {
      const url = `${this.config.baseUrl}/audio/speech`;
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: this.config.model,
          voice: this.config.voice,
          input: ".",
          response_format: "mp3"
        }),
        signal: AbortSignal.timeout(10_000)
      });
      if (!response.ok) {
        const body = await response.text();
        throw new Error(`OpenAI TTS API error ${response.status}: ${body}`);
      }
      // Consume the response body to avoid memory leaks
      await response.arrayBuffer();
    } catch (err) {
      this.apiKey = null;
      throw err;
    }

    debug(`openai: init OK — key=${this.apiKey} from ${source}`);
  }

  async synthesize(text: string): Promise<SynthesisResult> {
    if (!this.apiKey) {
      throw new Error("OpenAITTSProvider not initialized");
    }

    debug(`openai: synthesizing ${text.length} chars (voice=${this.config.voice})`);
    const url = `${this.config.baseUrl}/audio/speech`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: this.config.model,
        voice: this.config.voice,
        input: text,
        instructions: this.config.instructions,
        speed: this.config.speed,
        response_format: this.config.format
      }),
      signal: AbortSignal.timeout(30_000)
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`OpenAI TTS API error ${response.status}: ${body}`);
    }

    const arrayBuf = await response.arrayBuffer();
    const audio = Buffer.from(arrayBuf);
    debug(`openai: done — ${audio.length} bytes`);
    return { audio };
  }
}
