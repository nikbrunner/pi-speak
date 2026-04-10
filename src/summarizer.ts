/**
 * LLM-powered summarizer for pi-speak notification ping.
 *
 * Uses OpenRouter API with a cheap fast model to generate
 * a 2-sentence "what was done, where" summary for the voice ping.
 */

import { debug, debugError } from "./debug.js";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MAX_TOKENS = 60;

export interface SummarizeContext {
  /** What the assistant did (truncated text of the response) */
  responseText: string;
  /** tmux session name (if available) */
  sessionName?: string;
  /** OpenRouter model to use. Default: "openai/gpt-oss-20b" */
  model?: string;
}

/** Generate a 2-sentence voice ping summary via OpenRouter */
export async function summarizeForPing(ctx: SummarizeContext): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    debug("summarizer: no OPENROUTER_API_KEY — using fallback summary");
    return fallbackSummary(ctx);
  }

  const model = ctx.model ?? "openai/gpt-oss-20b";
  const where = ctx.sessionName ? ` in the "${ctx.sessionName}" session` : "";

  try {
    const response = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        max_tokens: MAX_TOKENS,
        messages: [
          {
            role: "system",
            content:
              "You write ultra-concise voice notifications. Always include the session name if given. Max 2 sentences. Be specific about what was done."
          },
          {
            role: "user",
            content: `Write a voice notification: what was done${where}. What: ${ctx.responseText.slice(0, 500)}`
          }
        ]
      })
    });

    if (!response.ok) {
      debug(`summarizer: OpenRouter error ${response.status}`);
      return fallbackSummary(ctx);
    }

    const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const summary = data.choices?.[0]?.message?.content?.trim();
    if (!summary) {
      debug("summarizer: empty response from OpenRouter");
      return fallbackSummary(ctx);
    }

    debug(`summarizer: LLM summary = "${summary}"`);
    return summary;
  } catch (err) {
    debugError("summarizer: fetch failed", err);
    return fallbackSummary(ctx);
  }
}

/** Fallback: simple truncate-based summary if LLM is unavailable */
function fallbackSummary(ctx: SummarizeContext): string {
  const where = ctx.sessionName ? ` in ${ctx.sessionName}` : "";
  const preview = ctx.responseText.slice(0, 100).replace(/\n/g, " ").trim();
  return `Work finished${where}. ${preview}…`;
}
