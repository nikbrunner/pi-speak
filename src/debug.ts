/**
 * Debug logger for pi-speak extension.
 *
 * Writes timestamped messages to the log file specified in config.
 * Can be disabled by setting PI_SPEAK_DEBUG=0 in the environment.
 */

import { appendFileSync, existsSync, statSync, truncateSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

/** Default debug log path */
const DEFAULT_LOG_PATH = join(homedir(), ".pi-speak-debug.log");
/** Default max log size in bytes (2 MB) */
const DEFAULT_LOG_MAX_BYTES = 2 * 1024 * 1024;

let _logPath = DEFAULT_LOG_PATH;
let _maxLogBytes = DEFAULT_LOG_MAX_BYTES;
let _enabled = process.env.PI_SPEAK_DEBUG !== "0";

/** Configure debug logger from config */
export function configureDebug(config: { enabled: boolean; logPath: string; logMaxBytes: number }): void {
  _enabled = config.enabled;
  _logPath = config.logPath.startsWith("~") ? join(homedir(), config.logPath.slice(1)) : config.logPath;
  _maxLogBytes = config.logMaxBytes;
}

/** Set debug logging enabled/disabled (e.g., from config.debug) */
export function setDebugEnabled(enabled: boolean): void {
  _enabled = enabled;
}

/** Rotate log if it exceeds max size */
function maybeRotate(): void {
  try {
    if (!existsSync(_logPath)) return;
    const stat = statSync(_logPath);
    if (stat.size >= _maxLogBytes) {
      truncateSync(_logPath, 0);
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
    appendFileSync(_logPath, `[${ts}] ${msg}\n`);
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
