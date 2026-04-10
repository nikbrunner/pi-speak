/**
 * Unreal Speech TTS client for pi-speak extension.
 *
 * Uses the V8 /stream endpoint for low-latency MP3 generation.
 * Responses are cached to disk for instant replay.
 */

import { type ChildProcess } from "node:child_process";
import { existsSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { SpeakConfig } from "./config.js";
import { debug } from "./debug.js";
import { chunkBySentences } from "./helpers.js";
import type { Platform } from "./platform.js";

const TEMP_FILE_PREFIX = "pi-speak-";

/** TTS configuration — the voice/audio subset of SpeakConfig */
export interface TTSConfig {
  voiceId: string;
  bitrate: string;
  speed: number;
  pitch: number;
}

const DEFAULT_TTS_CONFIG: TTSConfig = {
  voiceId: "Sierra",
  bitrate: "192k",
  speed: 0,
  pitch: 1.0
};

/** Fetch MP3 audio from Unreal Speech /stream endpoint */
async function fetchTTS(text: string, config: TTSConfig): Promise<Buffer> {
  const apiKey = process.env.UNREAL_SPEECH_API_KEY;
  if (!apiKey) throw new Error("UNREAL_SPEECH_API_KEY not set");

  const response = await fetch("https://api.v8.unrealspeech.com/stream", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      Text: text,
      VoiceId: config.voiceId,
      Bitrate: config.bitrate,
      Speed: config.speed,
      Pitch: config.pitch
    })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Unreal Speech API error ${response.status}: ${body}`);
  }

  const arrayBuf = await response.arrayBuffer();
  return Buffer.from(arrayBuf);
}

/** Stateful TTS playback manager with caching and generation-based cancellation */
export class TTSPlayer {
  private cachedAudioFiles: string[] = [];
  private currentPlayback: ChildProcess | null = null;
  private isPlaying = false;
  private playGeneration = 0;
  private config: TTSConfig;
  private maxChunkChars: number;
  private shortcutLabel: string;

  constructor(
    private platform: Platform,
    config?: Partial<SpeakConfig>
  ) {
    this.config = {
      voiceId: config?.voiceId ?? DEFAULT_TTS_CONFIG.voiceId,
      bitrate: config?.bitrate ?? DEFAULT_TTS_CONFIG.bitrate,
      speed: config?.speed ?? DEFAULT_TTS_CONFIG.speed,
      pitch: config?.pitch ?? DEFAULT_TTS_CONFIG.pitch
    };
    this.maxChunkChars = config?.maxChunkChars ?? 900;
    this.shortcutLabel = config?.shortcut ?? "alt+r";
  }

  get playing(): boolean {
    return this.isPlaying;
  }

  get cachedFiles(): string[] {
    return this.cachedAudioFiles;
  }

  /** Delete all cached audio files */
  clearCache(): void {
    debug(`clearCache: deleting ${this.cachedAudioFiles.length} files`);
    for (const f of this.cachedAudioFiles) {
      try {
        unlinkSync(f);
      } catch {
        // ignore — file may already be gone
      }
    }
    this.cachedAudioFiles = [];
  }

  /** Speak a short ping notification (not cached — does not affect alt+r replay). */
  async ping(text: string): Promise<void> {
    if (!text) return;

    debug(`ping: speaking "${text.slice(0, 80)}"`);

    try {
      const mp3Data = await fetchTTS(text, this.config);
      const tmpFile = join(tmpdir(), `${TEMP_FILE_PREFIX}ping-${Date.now()}.mp3`);
      writeFileSync(tmpFile, mp3Data);

      await this.platform.playAudio(tmpFile, proc => {
        this.currentPlayback = proc;
      });

      // Clean up ping temp file
      try {
        unlinkSync(tmpFile);
      } catch {
        /* ignore */
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      debug(`ping: ERROR: ${message}`);
    }
  }

  /** Speak text aloud. Uses cached files if available, fetches otherwise. */
  async speak(
    text: string,
    ui: { setWidget: (key: string, content: string[] | undefined) => void; notify: (msg: string, type: string) => void }
  ): Promise<void> {
    if (!text) return;

    const myGeneration = ++this.playGeneration;
    this.isPlaying = true;
    this.updateWidget(ui);

    const chunks = chunkBySentences(text, this.maxChunkChars);
    const newFiles: string[] = [];
    debug(`speak: gen=${myGeneration} chunks=${chunks.length} cachedFiles=${this.cachedAudioFiles.length}`);

    try {
      for (let i = 0; i < chunks.length; i++) {
        if (this.playGeneration !== myGeneration) {
          debug(`speak: gen=${myGeneration} aborted at chunk ${i} (current gen=${this.playGeneration})`);
          break;
        }

        const existingFile = this.cachedAudioFiles[i];
        let playFile: string;

        if (existingFile && existsSync(existingFile)) {
          playFile = existingFile;
          debug(`speak: gen=${myGeneration} chunk ${i}: CACHE HIT → ${playFile}`);
        } else {
          debug(`speak: gen=${myGeneration} chunk ${i}: FETCHING from Unreal Speech...`);
          const chunk = chunks[i];
          if (chunk === undefined) break;
          const mp3Data = await fetchTTS(chunk, this.config);

          if (this.playGeneration !== myGeneration) {
            debug(`speak: gen=${myGeneration} aborted after fetch at chunk ${i}`);
            break;
          }
          playFile = join(tmpdir(), `${TEMP_FILE_PREFIX}${Date.now()}-${i}.mp3`);
          writeFileSync(playFile, mp3Data);
          debug(`speak: gen=${myGeneration} chunk ${i}: FETCHED → ${playFile} (${mp3Data.length} bytes)`);
        }

        newFiles.push(playFile);

        if (this.playGeneration !== myGeneration) break;

        await this.platform.playAudio(playFile, proc => {
          this.currentPlayback = proc;
        });
      }
    } catch (err: unknown) {
      if (this.playGeneration === myGeneration) {
        const message = err instanceof Error ? err.message : String(err);
        debug(`speak: gen=${myGeneration} ERROR: ${message}`);
        ui.notify(`speak: TTS error — ${message}`, "error");
      }
    } finally {
      if (this.playGeneration === myGeneration) {
        this.isPlaying = false;
        this.currentPlayback = null;

        // Replace cache with the files we just produced/used
        const oldFiles = this.cachedAudioFiles.filter(f => !newFiles.includes(f));
        for (const f of oldFiles) {
          try {
            unlinkSync(f);
          } catch {
            /* ignore */
          }
        }
        this.cachedAudioFiles = newFiles;
        debug(
          `speak: gen=${myGeneration} done. cachedFiles=${this.cachedAudioFiles.length} path=${this.cachedAudioFiles[0] ?? "none"}`
        );

        this.updateWidget(ui);
      }
    }
  }

  /** Stop current playback (does not restart) */
  stop(): void {
    this.playGeneration++; // Invalidate any running speak so its finally block is a no-op
    this.isPlaying = false;
    if (this.currentPlayback) {
      this.currentPlayback.kill("SIGTERM");
      this.currentPlayback = null;
    }
  }

  /** Update the status widget */
  private updateWidget(
    ui: { setWidget: (key: string, content: string[] | undefined) => void },
    disabled = false
  ): void {
    if (disabled) {
      ui.setWidget("speak", undefined);
      return;
    }
    if (this.isPlaying) {
      ui.setWidget("speak", [`🔊 Speaking…  ${this.shortcutLabel} stop`]);
    } else if (this.cachedAudioFiles.length > 0) {
      ui.setWidget("speak", [`🔊 Ready  ${this.shortcutLabel} replay`]);
    } else {
      ui.setWidget("speak", [`🔊 ${this.shortcutLabel} read aloud`]);
    }
  }
}
