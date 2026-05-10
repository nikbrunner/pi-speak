/**
 * Unreal Speech TTS provider for pi-speak.
 *
 * Uses the V8 /stream endpoint for low-latency MP3 generation.
 */

import { debug } from "../../debug";
import type { BaseTTSConfig, SynthesisResult, TTSProvider } from "../provider";

export interface UnrealSpeechConfig extends BaseTTSConfig {
  provider: "unreal";
  voiceId: string;
  bitrate: string;
  speed: number;
  pitch: number;
}

const UNREAL_SPEECH_URL = "https://api.v8.unrealspeech.com/stream";

export class UnrealSpeechProvider implements TTSProvider<UnrealSpeechConfig> {
  private apiKey: string | null = null;

  constructor(public readonly config: UnrealSpeechConfig) {}

  async initialize(): Promise<void> {
    this.apiKey = process.env.UNREAL_SPEECH_API_KEY ?? null;
    if (!this.apiKey) {
      throw new Error("UNREAL_SPEECH_API_KEY not set");
    }
  }

  async synthesize(text: string): Promise<SynthesisResult> {
    if (!this.apiKey) {
      throw new Error("UnrealSpeechProvider not initialized");
    }

    debug(`unreal: synthesizing ${text.length} chars`);
    const audio = await this.fetchTTS(text);
    debug(`unreal: done — ${audio.length} bytes`);
    return { audio };
  }

  private async fetchTTS(text: string): Promise<Buffer> {
    const response = await fetch(UNREAL_SPEECH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        Text: text,
        VoiceId: this.config.voiceId,
        Bitrate: this.config.bitrate,
        Speed: this.config.speed,
        Pitch: this.config.pitch
      }),
      signal: AbortSignal.timeout(10_000)
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Unreal Speech API error ${response.status}: ${body}`);
    }

    const arrayBuf = await response.arrayBuffer();
    return Buffer.from(arrayBuf);
  }
}
