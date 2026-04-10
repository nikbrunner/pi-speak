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
let _enabled = process.env.PI_SPEAK_DEBUG !== "0";

/** Set debug logging enabled/disabled (e.g., from config.debug) */
export function setDebugEnabled(enabled: boolean): void {
  _enabled = enabled;
}

/** Rotate log if it exceeds MAX_LOG_BYTES */
function maybeRotate(): void {
  try {
    if (!existsSync(DEBUG_LOG)) return;
    const stat = statSync(DEBUG_LOG);
    if (stat.size >= MAX_LOG_BYTES) {
      truncateSync(DEBUG_LOG, 0);
    }
  } catch (err) {
    console.warn(`[pi-speak] debug: failed to rotate log: ${err instanceof Error ? err.message : String(err)}`);
  }
}

export function debug(msg: string): void {
  if (!_enabled) return;
  maybeRotate();
  const ts = new Date().toISOString();
  try {
    appendFileSync(DEBUG_LOG, `[${ts}] ${msg}\n`);
  } catch (err) {
    // Fallback to console when file logging fails
    console.log(`[pi-speak] ${msg}`);
    console.warn(`[pi-speak] debug: failed to write to log file: ${err instanceof Error ? err.message : String(err)}`);
  }
}

/** Log an error with full stack trace */
export function debugError(msg: string, err: unknown): void {
  if (!_enabled) return;
  const detail = err instanceof Error ? `${err.message}\n${err.stack ?? ""}` : String(err);
  debug(`${msg}: ${detail}`);
}
