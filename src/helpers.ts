/**
 * Shared helpers for pi-speak extension.
 */

import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

/** Shell-quote a string for use in single-quoted context */
export function shellQuote(s: string): string {
  return `'${s.replace(/'/g, "'\\''")}'`;
}

/** Load a key from ~/.env (simple KEY=VALUE parser, no dependency) */
export function loadEnvKey(key: string): string | undefined {
  const envPath = join(homedir(), ".env");
  if (!existsSync(envPath)) return undefined;
  try {
    const contents = readFileSync(envPath, "utf-8");
    for (const line of contents.split("\n")) {
      const trimmed = line.trim();
      if (trimmed.startsWith("#") || trimmed.length === 0) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx === -1) continue;
      const k = trimmed.slice(0, eqIdx).trim();
      let v = trimmed.slice(eqIdx + 1).trim();
      // Strip surrounding quotes
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      if (k === key) return v;
    }
  } catch {
    // ignore
  }
  return undefined;
}

/** Strip markdown formatting for cleaner speech */
export function stripMarkdown(text: string): string {
  return (
    text
      // Remove code blocks
      .replace(/```[\s\S]*?```/g, match => {
        return match.replace(/```\w*\n?/g, "").trim();
      })
      // Remove inline code backticks
      .replace(/`([^`]+)`/g, "$1")
      // Remove bold/italic markers
      .replace(/\*{1,3}([^*]+)\*{1,3}/g, "$1")
      .replace(/_{1,3}([^_]+)_{1,3}/g, "$1")
      // Remove strikethrough
      .replace(/~~([^~]+)~~/g, "$1")
      // Remove links, keep text
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      // Remove headers markers
      .replace(/^#{1,6}\s+/gm, "")
      // Remove horizontal rules
      .replace(/^---+$/gm, "")
      // Remove list markers
      .replace(/^\s*[-*+]\s+/gm, "")
      .replace(/^\s*\d+\.\s+/gm, "")
      // Collapse multiple whitespace
      .replace(/\n{2,}/g, "\n\n")
      .trim()
  );
}

/** Split text into chunks at sentence boundaries, each ≤ maxChars */
export function chunkBySentences(text: string, maxChars: number): string[] {
  const chunks: string[] = [];
  let current = "";

  // Split on sentence boundaries (., !, ?, followed by space or end)
  const sentences = text.split(/(?<=[.!?])\s+/);

  for (const sentence of sentences) {
    if (current.length === 0) {
      current = sentence;
    } else if (current.length + 1 + sentence.length <= maxChars) {
      current += " " + sentence;
    } else {
      chunks.push(current);
      current = sentence;
    }
  }

  if (current.length > 0) {
    chunks.push(current);
  }

  // If a single chunk exceeds maxChars (no sentence boundaries), hard-split at maxChars
  const result: string[] = [];
  for (const chunk of chunks) {
    if (chunk.length <= maxChars) {
      result.push(chunk);
    } else {
      // Hard split at word boundaries
      let remaining = chunk;
      while (remaining.length > 0) {
        if (remaining.length <= maxChars) {
          result.push(remaining);
          break;
        }
        let splitAt = remaining.lastIndexOf(" ", maxChars);
        if (splitAt === -1) splitAt = maxChars;
        result.push(remaining.slice(0, splitAt));
        remaining = remaining.slice(splitAt).trim();
      }
    }
  }

  return result;
}

/** Generate a one-line summary for notifications */
export function summarize(text: string, maxLen = 80): string {
  const firstLine = text.split("\n")[0] ?? "";
  if (firstLine.length <= maxLen) return firstLine;
  return firstLine.slice(0, maxLen - 1) + "…";
}
