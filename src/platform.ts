/**
 * Platform abstraction for pi-speak extension.
 *
 * All OS-specific calls are isolated behind the Platform interface
 * so Linux and Windows implementations can be dropped in later.
 */

import { spawn, type ChildProcess } from "node:child_process";
import { debug, debugError } from "./debug.js";

export interface Platform {
  /** Play an MP3 file. Resolves when playback finishes. */
  playAudio(filePath: string, onProcess?: (proc: ChildProcess) => void): Promise<void>;
  /** Whether this platform is supported */
  readonly supported: boolean;
}

/** Check if the current platform is supported */
export function isPlatformSupported(): boolean {
  return process.platform === "darwin";
}

export function createPlatform(): Platform {
  switch (process.platform) {
    case "darwin":
      return createMacOSPlatform();
    default:
      return {
        playAudio: async () => {
          debug(`playAudio: platform "${process.platform}" is not supported — no audio playback`);
        },
        supported: false
      } as Platform;
  }
}

function createMacOSPlatform(): Platform {
  return {
    async playAudio(filePath, onProcess) {
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
