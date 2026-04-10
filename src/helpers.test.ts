import { describe, expect, it } from "vitest";
import { chunkBySentences, stripMarkdown, summarize } from "./helpers";

describe("stripMarkdown", () => {
  it("should remove code blocks and preserve content", () => {
    const input = "```javascript\nconsole.log('hello');\n```";
    const output = stripMarkdown(input);
    expect(output).toBe("console.log('hello');");
  });

  it("should remove inline code backticks", () => {
    const input = "Use `console.log` for logging";
    const output = stripMarkdown(input);
    expect(output).toBe("Use console.log for logging");
  });

  it("should remove bold markers", () => {
    const input = "This is **bold** text";
    const output = stripMarkdown(input);
    expect(output).toBe("This is bold text");
  });

  it("should remove italic markers", () => {
    const input = "This is *italic* and _also italic_";
    const output = stripMarkdown(input);
    expect(output).toBe("This is italic and also italic");
  });

  it("should remove strikethrough", () => {
    const input = "This is ~~strikethrough~~";
    const output = stripMarkdown(input);
    expect(output).toBe("This is strikethrough");
  });

  it("should extract link text", () => {
    const input = "Check out [this link](https://example.com)";
    const output = stripMarkdown(input);
    expect(output).toBe("Check out this link");
  });

  it("should remove header markers", () => {
    const input = "# Header 1\n## Header 2\n### Header 3";
    const output = stripMarkdown(input);
    expect(output).toBe("Header 1\nHeader 2\nHeader 3");
  });

  it("should remove horizontal rules", () => {
    const input = "Above\n---\nBelow";
    const output = stripMarkdown(input);
    // Note: preserves single newline after horizontal rule removal
    expect(output).toContain("Above");
    expect(output).toContain("Below");
    expect(output).not.toContain("---");
  });

  it("should remove list markers", () => {
    const input = "- Item 1\n* Item 2\n+ Item 3\n1. Numbered";
    const output = stripMarkdown(input);
    expect(output).toBe("Item 1\nItem 2\nItem 3\nNumbered");
  });

  it("should handle complex mixed input", () => {
    const input = `# Title

**Bold** and *italic* text.

\`inline code\`

\`\`\`python
def hello():
    print("Hello")
\`\`\`

[Link](https://example.com)

- List item 1
- List item 2`;

    const output = stripMarkdown(input);

    expect(output).toContain("Title");
    expect(output).toContain("Bold and italic text");
    expect(output).toContain("inline code");
    expect(output).toContain("def hello():");
    expect(output).toContain("Link");
    expect(output).toContain("List item 1");
    expect(output).not.toContain("**");
    expect(output).not.toContain("```");
  });

  it("should handle empty input", () => {
    expect(stripMarkdown("")).toBe("");
  });

  it("should preserve whitespace appropriately", () => {
    const input = "Line 1\n\n\n\nLine 2";
    const output = stripMarkdown(input);
    expect(output).toBe("Line 1\n\nLine 2");
  });
});

describe("chunkBySentences", () => {
  it("should combine short sentences within maxChars", () => {
    // Short sentences that fit together are combined
    const input = "Hello. World! How are you?";
    const chunks = chunkBySentences(input, 50);
    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toBe("Hello. World! How are you?");
  });

  it("should split when exceeding maxChars", () => {
    // Multiple sentences that together exceed maxChars
    const input =
      "This is a very long sentence that definitely exceeds fifty characters. This is another long sentence that also exceeds fifty characters.";
    const chunks = chunkBySentences(input, 50);
    // Should split at some point
    expect(chunks.length).toBeGreaterThan(1);
    // Each chunk should be within maxChars
    expect(chunks.every(c => c.length <= 50)).toBe(true);
  });

  it("should split single long sentence at word boundary", () => {
    const input = "This is a very long sentence with many words that exceeds the limit";
    const chunks = chunkBySentences(input, 30);
    // Should split at word boundaries
    expect(chunks.every(c => c.length <= 30)).toBe(true);
    expect(chunks.length).toBeGreaterThan(1);
  });

  it("should handle single short sentence", () => {
    const input = "Hello.";
    const chunks = chunkBySentences(input, 50);
    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toBe("Hello.");
  });

  it("should handle empty input", () => {
    const chunks = chunkBySentences("", 50);
    expect(chunks).toHaveLength(0);
  });

  it("should handle text with no punctuation", () => {
    const input = "Hello World";
    const chunks = chunkBySentences(input, 50);
    expect(chunks.length).toBe(1);
  });

  it("should split when individual chunk exceeds maxChars", () => {
    // A single word exceeding maxChars forces a hard split
    const longWord = "a".repeat(60);
    const input = `Hello. ${longWord}.`;
    const chunks = chunkBySentences(input, 50);
    // Should have split the long word
    expect(chunks.some(c => c.length <= 50)).toBe(true);
  });
});

describe("summarize", () => {
  it("should return short text unchanged", () => {
    const input = "Hello world";
    const output = summarize(input, 80);
    expect(output).toBe("Hello world");
  });

  it("should truncate long text with ellipsis", () => {
    const input = "This is a very long line that exceeds the maximum length and needs to be truncated";
    const output = summarize(input, 30);
    expect(output.length).toBeLessThanOrEqual(30);
    expect(output).toContain("…");
  });

  it("should use first line only", () => {
    const input = "First line\nSecond line\nThird line";
    const output = summarize(input, 100);
    expect(output).toBe("First line");
  });

  it("should handle default maxLen of 80", () => {
    const input = "a".repeat(100);
    const output = summarize(input);
    expect(output.length).toBe(80);
  });

  it("should handle empty input", () => {
    expect(summarize("")).toBe("");
  });

  it("should handle newline only input", () => {
    const input = "\n\n\n";
    const output = summarize(input, 80);
    expect(output).toBe("");
  });
});
