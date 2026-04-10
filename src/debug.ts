/**
 * Debug logger for pi-speak extension.
 *
 * Writes timestamped messages to ~/.pi-speak-debug.log
 * Can be disabled by setting PI_SPEAK_DEBUG=0 in the environment.
 */

import { appendFileSync, existsSync, statSync, truncateSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const DEBUG_LOG = join(homedir(), ".pi-speak-debug.log");
const MAX_LOG_BYTES = 2 * 1024 * 1024; // 2 MB — rotate if larger
const enabled = process.env.PI_SPEAK_DEBUG !== "0";

/** Rotate log if it exceeds MAX_LOG_BYTES */
function maybeRotate(): void {
  try {
    if (!existsSync(DEBUG_LOG)) return;
    const stat = statSync(DEBUG_LOG);
    if (stat.size >= MAX_LOG_BYTES) {
      truncateSync(DEBUG_LOG, 0);
    }
  } catch {
    // ignore
  }
}

export function debug(msg: string): void {
  if (!enabled) return;
  maybeRotate();
  const ts = new Date().toISOString();
  try {
    appendFileSync(DEBUG_LOG, `[${ts}] ${msg}\n`);
  } catch {
    // ignore — logging is best-effort
  }
}

/** Log an error with full stack trace */
export function debugError(msg: string, err: unknown): void {
  if (!enabled) return;
  const detail = err instanceof Error ? `${err.message}\n${err.stack ?? ""}` : String(err);
  debug(`${msg}: ${detail}`);
}
