/**
 * TTS Provider interface and shared types for pi-speak.
 *
 * TTSPlayer delegates to a provider to synthesize text into audio buffers.
 */

/** Configuration common to all TTS providers */
export interface BaseTTSConfig {
  /** Max characters per TTS chunk */
  maxChunkChars: number;
}

/** Result from a provider's synthesize call */
export interface SynthesisResult {
  /** MP3 audio buffer */
  audio: Buffer;
}

/** A TTS provider synthesizes text into audio */
export interface TTSProvider<TConfig extends BaseTTSConfig = BaseTTSConfig> {
  /** One-time initialization (e.g. validate API key) */
  initialize(): Promise<void>;

  /** Synthesize text into an audio buffer */
  synthesize(text: string): Promise<SynthesisResult>;

  /** Provider-specific config */
  readonly config: TConfig;
}
