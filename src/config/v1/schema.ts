import { z } from "zod";

const SCHEMA_URL = "https://raw.githubusercontent.com/nikbrunner/pi-speak/main/src/config/v1/schema.json";

const CONFIG_DIR = `${process.env.HOME}/.config/pi-speak`;
export const CONFIG_PATH = `${CONFIG_DIR}/config.json`;

// ─── Voice IDs ──────────────────────────────────────────────────────────────
// https://docs.v8.unrealspeech.com/

const VoiceId = z.enum([
  // American Female
  "Autumn",
  "Melody",
  "Hannah",
  "Emily",
  "Ivy",
  "Kaitlyn",
  "Luna",
  "Willow",
  "Lauren",
  "Sierra",
  // American Male
  "Noah",
  "Jasper",
  "Caleb",
  "Ronan",
  "Ethan",
  "Daniel",
  "Zane",
  // Chinese Female
  "Mei",
  "Lian",
  "Ting",
  "Jing",
  // Chinese Male
  "Wei",
  "Jian",
  "Hao",
  "Sheng",
  // Spanish Female
  "Lucía",
  // Spanish Male
  "Mateo",
  "Javier",
  // French Female
  "Élodie",
  // Hindi Female
  "Ananya",
  "Priya",
  // Hindi Male
  "Arjun",
  "Rohan",
  // Italian Female
  "Giulia",
  // Italian Male
  "Luca",
  // Portuguese Female
  "Camila",
  // Portuguese Male
  "Thiago",
  "Rafael"
]);

const Bitrate = z.enum(["16k", "32k", "48k", "64k", "128k", "192k", "256k", "320k"]);

// ─── Sub-schemas ─────────────────────────────────────────────────────────────

export const ReadbackConfigSchema = z.object({
  voiceId: VoiceId.describe("Unreal Speech voice name").default("Sierra"),
  bitrate: Bitrate.describe("Audio bitrate — lower saves bandwidth, higher improves fidelity").default("192k"),
  speed: z.number().min(-1).max(1).describe("Speech speed adjustment (-1 to 1)").default(0),
  pitch: z.number().min(0.5).max(1.5).describe("Speech pitch adjustment (0.5 to 1.5)").default(1.0),
  maxChunkChars: z
    .number()
    .int()
    .min(1)
    .max(1000)
    .describe("Max characters per TTS chunk (Unreal Speech limit is 1000)")
    .default(900)
});

export const SummarizerConfigSchema = z.object({
  enabled: z.boolean().describe("Use LLM to summarize agent output for voice notification").default(true),
  model: z.string().describe("OpenRouter model ID for summarization").default("google/gemini-2.5-flash-lite"),
  maxTokens: z.number().int().min(1).max(500).describe("Max tokens for summarizer response").default(150),
  timeoutMs: z.number().int().min(1000).max(60000).describe("Summarizer request timeout in milliseconds").default(5000),
  prompt: z
    .string()
    .describe("System prompt for the summarizer LLM")
    .default(
      "You caveman voice assistant. Summarize what code-agent did. Few word, max 2 sentence. Say session name if given. Be specific — what changed, what fixed, what built. No filler. No fluff. Grunt truth only."
    ),
  fallbackText: z
    .string()
    .describe("Fallback text when summarizer is disabled or fails")
    .default("Work done. Code better now.")
});

export const DebugConfigSchema = z.object({
  enabled: z.boolean().describe("Enable debug logging to file").default(true),
  logPath: z.string().describe("Path to the debug log file").default("~/.pi-speak-debug.log"),
  logMaxBytes: z
    .number()
    .int()
    .min(1024)
    .max(10 * 1024 * 1024)
    .describe("Max log file size in bytes before rotation")
    .default(2 * 1024 * 1024)
});

export const ApiConfigSchema = z.object({
  unrealSpeechKey: z.string().nullable().describe("Unreal Speech API key (env var takes precedence)").default(null),
  openRouterKey: z.string().nullable().describe("OpenRouter API key (env var takes precedence)").default(null)
});

// ─── Main schema ─────────────────────────────────────────────────────────────

export const SpeakConfigSchema = z.object({
  $schema: z.url().default(SCHEMA_URL),
  version: z.number().int().min(0).default(1),
  shortcut: z.string().describe("Keyboard shortcut for replay/stop").default("alt+r"),
  readback: ReadbackConfigSchema.prefault({}),
  summarizer: SummarizerConfigSchema.prefault({}),
  debug: DebugConfigSchema.prefault({}),
  api: ApiConfigSchema.prefault({})
});

export const defaultConfig = SpeakConfigSchema.parse({});

export type SpeakConfig = z.infer<typeof SpeakConfigSchema>;
