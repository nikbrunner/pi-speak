/**
 * Platform abstraction for pi-speak extension.
 *
 * All OS-specific calls are isolated behind the Platform interface
 * so Linux and Windows implementations can be dropped in later.
 */

import { execSync, spawn, type ChildProcess } from "node:child_process";
import { debug, debugError } from "./debug";

export interface Platform {
  /** Play an MP3 file. Resolves when playback finishes. */
  playAudio(filePath: string, onProcess?: (proc: ChildProcess) => void): Promise<void>;
  /** Whether this platform is supported */
  readonly supported: boolean;
  /** Whether this platform output is muted */
  readonly isMuted: boolean;
}

/**
 * Check if macOS output is muted using AppleScript.
 * Returns true if muted, false otherwise.
 */
export function isMacMuted(): boolean {
  try {
    const volumeOutput = execSync('osascript -e "output volume of (get volume settings)"', {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"]
    }).trim();
    const volume = parseInt(volumeOutput, 10);

    const mutedOutput = execSync('osascript -e "output muted of (get volume settings)"', {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"]
    }).trim();

    debug(`isMacMuted: volume=${volume} muted=${mutedOutput}`);
    return volume === 0 || mutedOutput === "true";
  } catch (err) {
    debug(`isMacMuted: failed to check — ${err instanceof Error ? err.message : String(err)}`);
    return false;
  }
}

/** Check if the current platform is supported */
export function isPlatformSupported(): boolean {
  return process.platform === "darwin";
}

export function createPlatform(): Platform {
  const muted = isMacMuted();

  switch (process.platform) {
    case "darwin":
      return createMacOSPlatform(muted);
    default:
      return {
        playAudio: async () => {
          debug(`playAudio: platform "${process.platform}" is not supported — no audio playback`);
        },
        supported: false,
        isMuted: false
      };
  }
}

function createMacOSPlatform(isMuted: boolean): Platform {
  return {
    supported: true,
    isMuted,
    async playAudio(filePath, onProcess) {
      if (isMuted) {
        debug(`playAudio: skipped — system is muted`);
        return;
      }

      debug(`playAudio: ${filePath}`);
      return new Promise<void>((resolve, reject) => {
        const proc = spawn("afplay", [filePath], { stdio: "ignore" });
        debug(`playAudio: afplay pid=${proc.pid}`);
        if (onProcess) onProcess(proc);
        proc.on("close", code => {
          debug(`playAudio: afplay pid=${proc.pid} exited with code=${code}`);
          if (code === 0 || code === null) resolve();
          else reject(new Error(`afplay exited with code ${code}`));
        });
        proc.on("error", err => {
          debugError(`playAudio: afplay pid=${proc.pid} error`, err);
          reject(err);
        });
      });
    }
  };
}
