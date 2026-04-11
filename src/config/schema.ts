/**
 * Zod schemas for pi-speak configuration.
 *
 * Uses Zod for runtime validation and TypeScript inference.
 */

import { z } from "zod";
import { SCHEMA_URL } from "./constants";

// ─── Sub-schemas ─────────────────────────────────────────────────────────────

export const TTSConfigSchema = z.object({
  // https://docs.v8.unrealspeech.com/
  voiceId: z.string().default("Sierra"),
  bitrate: z.string().default("192k"),
  speed: z.number().min(-1).max(1).default(0),
  pitch: z.number().min(0.5).max(1.5).default(1.0),
  maxChunkChars: z.number().int().min(1).max(1000).default(900)
});

export const BehaviorConfigSchema = z.object({
  shortcut: z.string().default("alt+r"),
  pingEnabled: z.boolean().default(true),
  pingOnStartEnabled: z.boolean().default(false),
  fallbackPingText: z.string().default("Work finished.")
});

export const SummarizerConfigSchema = z.object({
  // https://openrouter.ai/models
  enabled: z.boolean().default(true),
  model: z.string().default("openai/gpt-oss-20b"),
  maxTokens: z.number().int().min(1).max(500).default(60),
  timeoutMs: z.number().int().min(1000).max(60000).default(5000),
  prompt: z
    .string()
    .default(
      "You write ultra-concise voice notifications. Always include the session name if given. Max 2 sentences. Be specific about what was done."
    )
});

export const DebugConfigSchema = z.object({
  enabled: z.boolean().default(true),
  logPath: z.string().default("~/.pi-speak-debug.log"),
  logMaxBytes: z
    .number()
    .int()
    .min(1024)
    .max(10 * 1024 * 1024)
    .default(2 * 1024 * 1024)
});

export const ApiConfigSchema = z.object({
  unrealSpeechKey: z.string().nullable().default(null),
  openRouterKey: z.string().nullable().default(null)
});

// ─── Main schema ─────────────────────────────────────────────────────────────

export { SCHEMA_URL } from "./constants";

export const SpeakConfigSchema = z.object({
  $schema: z.string().url().default(SCHEMA_URL),
  version: z.number().int().min(0).default(1),
  tts: TTSConfigSchema,
  behavior: BehaviorConfigSchema,
  summarizer: SummarizerConfigSchema,
  debug: DebugConfigSchema,
  api: ApiConfigSchema
});

export type SpeakConfig = z.infer<typeof SpeakConfigSchema>;
