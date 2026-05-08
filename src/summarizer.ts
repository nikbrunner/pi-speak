/**
 * LLM-powered summarizer for pi-speak notification ping.
 *
 * Uses OpenRouter API with a cheap fast model to generate
 * a 2-sentence "what was done, where" summary for the voice ping.
 */

import type { SpeakConfig } from "./config/v1/schema";
import { debug, debugError } from "./debug";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

export interface SummarizeContext {
  /** What the assistant did (truncated text of the response) */
  responseText: string;
  /** Human-readable project name (derived from cwd) */
  projectName?: string;
  /** Config for the summarizer */
  config: SpeakConfig["summarizer"];
  /** API key override */
  apiKey?: string;
  /** Fallback text */
  fallbackText: string;
}

/** Call OpenRouter with a system prompt and user message */
async function callOpenRouter(opts: {
  systemPrompt: string;
  userMessage: string;
  model: string;
  maxTokens: number;
  timeoutMs: number;
  apiKey: string;
}): Promise<string | null> {
  const response = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${opts.apiKey}`
    },
    body: JSON.stringify({
      model: opts.model,
      max_tokens: opts.maxTokens,
      messages: [
        { role: "system", content: opts.systemPrompt },
        { role: "user", content: opts.userMessage }
      ]
    }),
    signal: AbortSignal.timeout(opts.timeoutMs)
  });

  if (!response.ok) {
    debug(`openrouter: error ${response.status}`);
    return null;
  }

  const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return data.choices?.[0]?.message?.content?.trim() || null;
}

/** Generate a 2-sentence voice ping summary via OpenRouter */
export async function summarizeForPing(ctx: SummarizeContext): Promise<string> {
  if (!ctx.config.enabled) {
    debug("summarizer: disabled — using fallback summary");
    return fallbackSummary(ctx);
  }

  const apiKey = ctx.apiKey ?? process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    debug("summarizer: no OPENROUTER_API_KEY — using fallback summary");
    return fallbackSummary(ctx);
  }

  const where = ctx.projectName ? ` in the "${ctx.projectName}" project` : "";

  try {
    const summary = await callOpenRouter({
      systemPrompt: ctx.config.prompt,
      userMessage: `Write a voice notification: what was done${where}. What: ${ctx.responseText.slice(0, 500)}`,
      model: ctx.config.model,
      maxTokens: ctx.config.maxTokens,
      timeoutMs: ctx.config.timeoutMs,
      apiKey
    });

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
  const where = ctx.projectName ? ` in ${ctx.projectName}` : "";
  const preview = ctx.responseText.slice(0, 100).replace(/\n/g, " ").trim();
  return `${ctx.fallbackText}${where}. ${preview}…`;
}
