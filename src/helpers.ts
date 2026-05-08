/**
 * Shared helpers for pi-speak extension.
 */

/** Strip markdown formatting for cleaner speech */
export function stripMarkdown(text: string): string {
  return (
    text
      // Remove fenced code blocks entirely (reading code aloud is terrible)
      .replace(/```[\s\S]*?```/g, "")
      // Remove markdown tables (converted to nothing — too noisy spoken)
      .replace(/^\|.*\|$/gm, "")
      // Remove table separator/delimiter rows
      .replace(/^\|[\s:-]+\|$/gm, "")
      // Remove inline code backticks, keep the content (short names are fine spoken)
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
      // Remove HTML tags
      .replace(/<[^>]+>/g, "")
      // Collapse multiple blank lines (code/table removal leaves gaps)
      .replace(/\n{3,}/g, "\n\n")
      // Remove leading blank lines
      .replace(/^\n+/, "")
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

/** Extract a human-readable project name from the current working directory */
export function getProjectName(): string {
  try {
    const cwd = process.cwd();
    const dirName = cwd.split("/").pop() ?? cwd;
    // Convert kebab-case and snake_case to spaces, title case each word
    return dirName
      .replace(/[-_]/g, " ")
      .split(" ")
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  } catch {
    return "";
  }
}

/** Generate a one-line summary for notifications */
export function summarize(text: string, maxLen = 80): string {
  const firstLine = text.split("\n")[0] ?? "";
  if (firstLine.length <= maxLen) return firstLine;
  return firstLine.slice(0, maxLen - 1) + "…";
}
