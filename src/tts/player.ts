/**
 * Stateful TTS playback manager for pi-speak extension.
 *
 * Delegates voice synthesis to a pluggable TTSProvider (Unreal Speech, OpenAI, etc).
 * Caches audio files to disk for instant alt+r replay.
 *
 * Note: speak() is not re-entrant — callers should await speak() before calling again.
 * Concurrent calls will cause race conditions on cachedAudioFiles.
 */

import { type ChildProcess } from "node:child_process";
import { existsSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { debug, debugError } from "../debug";
import { chunkBySentences } from "../helpers";
import type { BaseTTSConfig, TTSProvider } from "./provider";

const TEMP_FILE_PREFIX = "pi-speak-";

export class TTSPlayer<TConfig extends BaseTTSConfig = BaseTTSConfig> {
  private cachedAudioFiles: string[] = [];
  private currentPlayback: ChildProcess | null = null;
  private isPlaying = false;
  private playGeneration = 0;
  private shortcutLabel: string;

  constructor(
    private platform: { playAudio: (file: string, onProc: (proc: ChildProcess) => void) => Promise<void> },
    private provider: TTSProvider<TConfig>,
    shortcut?: string
  ) {
    this.shortcutLabel = shortcut ?? "alt+r";
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
        debug(`clearCache: deleted ${f}`);
      } catch (err: unknown) {
        debug(`clearCache: failed to delete ${f}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
    this.cachedAudioFiles = [];
  }

  /** Speak a short ping notification (not cached — does not affect alt+r replay). */
  async ping(
    text: string,
    ui?: {
      setWidget: (k: string, c: string[] | undefined) => void;
      notify: (m: string, t: "info" | "warning" | "error") => void;
    }
  ): Promise<void> {
    if (!text) return;

    debug(`ping: speaking "${text.slice(0, 80)}"`);

    try {
      const { audio } = await this.provider.synthesize(text);
      const tmpFile = join(tmpdir(), `${TEMP_FILE_PREFIX}ping-${Date.now()}.mp3`);
      writeFileSync(tmpFile, audio);

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
      debugError("ping: failed", err);
      if (ui) {
        const message = err instanceof Error ? err.message : String(err);
        ui.notify(`speak: TTS error — ${message}`, "error");
      }
    }
  }

  /** Speak text aloud. Uses cached files if available, fetches otherwise. */
  async speak(
    text: string,
    ui: {
      setWidget: (k: string, c: string[] | undefined) => void;
      notify: (m: string, t: "info" | "warning" | "error") => void;
    }
  ): Promise<void> {
    if (!text) return;

    const myGeneration = ++this.playGeneration;
    this.isPlaying = true;
    this.updateWidget(ui);

    const maxChunkChars = this.provider.config.maxChunkChars;
    const chunks = chunkBySentences(text, maxChunkChars);
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
          debug(`speak: gen=${myGeneration} chunk ${i}: FETCHING from provider...`);
          const chunk = chunks[i];
          if (chunk === undefined) break;
          const { audio } = await this.provider.synthesize(chunk);

          if (this.playGeneration !== myGeneration) {
            debug(`speak: gen=${myGeneration} aborted after fetch at chunk ${i}`);
            break;
          }
          playFile = join(tmpdir(), `${TEMP_FILE_PREFIX}${Date.now()}-${i}.mp3`);
          writeFileSync(playFile, audio);
          debug(`speak: gen=${myGeneration} chunk ${i}: FETCHED → ${playFile} (${audio.length} bytes)`);
        }

        newFiles.push(playFile);

        if (this.playGeneration !== myGeneration) break;

        await this.platform.playAudio(playFile, proc => {
          this.currentPlayback = proc;
        });
      }
    } catch (err: unknown) {
      if (this.playGeneration === myGeneration) {
        debugError(`speak: gen=${myGeneration} ERROR`, err);
        const message = err instanceof Error ? err.message : String(err);
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
      } else {
        // Aborted — clean up any files we fetched but didn't cache
        for (const f of newFiles) {
          try {
            unlinkSync(f);
          } catch {
            /* ignore */
          }
        }
        debug(`speak: gen=${myGeneration} aborted, cleaned up ${newFiles.length} orphaned files`);
      }
    }
  }

  /** Stop current playback (does not restart) */
  stop(): void {
    this.playGeneration++; // Invalidate any running speak so its finally block is a no-op
    this.isPlaying = false;
    if (this.currentPlayback) {
      this.currentPlayback.kill("SIGTERM");
      const proc = this.currentPlayback;
      setTimeout(() => {
        if (!proc.killed) {
          debug("stop: SIGTERM didn't work, sending SIGKILL");
          proc.kill("SIGKILL");
        }
      }, 500);
      this.currentPlayback = null;
    }
  }

  /** Update the status widget */
  private updateWidget(ui: { setWidget: (k: string, c: string[] | undefined) => void }, disabled = false): void {
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
