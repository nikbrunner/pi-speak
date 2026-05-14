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

// ─── Provider sub-schemas ───────────────────────────────────────────────────

const OpenAIReadbackSchema = z.object({
  provider: z.literal("openai"),
  voice: z
    .enum([
      "alloy",
      "ash",
      "ballad",
      "coral",
      "echo",
      "fable",
      "onyx",
      "nova",
      "sage",
      "shimmer",
      "verse",
      "marin",
      "cedar"
    ])
    .describe("OpenAI TTS voice name")
    .default("nova"),
  model: z.string().describe("OpenAI TTS model ID").default("gpt-4o-mini-tts"),
  instructions: z
    .string()
    .describe("Natural language instructions for voice personality, tone, emotion, pacing")
    .default(
      `
      Personality/affect: a high-energy cheerleader helping with administrative tasks

      Voice: Enthusiastic, and bubbly, with an uplifting and motivational quality.

      Tone: Encouraging and playful, making even simple tasks feel exciting and fun.
      `
    ),
  speed: z.number().min(0.25).max(4).describe("Speech speed (0.25 to 4.0, 1.0 = normal)").default(1),
  format: z.enum(["mp3", "opus", "aac", "flac", "wav", "pcm"]).describe("Audio output format").default("mp3"),
  baseUrl: z
    .string()
    .url()
    .describe("Base URL for the TTS API (supports OpenRouter: https://openrouter.ai/api/v1)")
    .default("https://api.openai.com/v1"),
  maxChunkChars: z.number().int().min(1).max(4096).describe("Max characters per TTS chunk").default(1000)
});

const UnrealReadbackSchema = z.object({
  provider: z.literal("unreal"),
  voiceId: VoiceId.describe("Unreal Speech voice name").default("Sierra"),
  bitrate: Bitrate.describe("Audio bitrate — lower saves bandwidth, higher improves fidelity").default("192k"),
  speed: z.number().min(-1).max(1).describe("Speech speed adjustment (-1 to 1, -0.1 = 10% slower)").default(-0.1),
  pitch: z.number().min(0.5).max(1.5).describe("Speech pitch adjustment (0.5 to 1.5)").default(0.98),
  maxChunkChars: z
    .number()
    .int()
    .min(1)
    .max(1000)
    .describe("Max characters per TTS chunk (Unreal Speech limit is 1000)")
    .default(900)
});

export const ReadbackConfigSchema = z.discriminatedUnion("provider", [UnrealReadbackSchema, OpenAIReadbackSchema]);

export const SummarizerConfigSchema = z.object({
  enabled: z.boolean().describe("Use LLM to summarize agent output for voice notification").default(true),
  model: z.string().describe("OpenRouter model ID for summarization").default("google/gemini-2.5-flash-lite"),
  maxTokens: z.number().int().min(1).max(500).describe("Max tokens for summarizer response").default(150),
  timeoutMs: z.number().int().min(1000).max(60000).describe("Summarizer request timeout in milliseconds").default(5000),
  prompt: z
    .string()
    .describe("System prompt for the summarizer LLM")
    .default(
      "You are the AI agent that just helped a developer. Summarize what actually happened — not what was discussed or planned. Important: Only claim an action was done ('I fixed', 'I updated', 'I added') if the response clearly indicates the work was completed. If the conversation discusses what needs to be done, lists open tasks, or describes goals, summarize it honestly: 'Discussed next steps for Phase 1 — helper imports and monitor wiring are still blocking', 'Reviewed the commits, there is still a revert pending on monitor-server.ts', 'Assessed what is left for Phase 1 — helper files still need updating.' Never claim something was built, fixed, or changed if the text only mentions it as something that still needs to happen. Never attribute user actions (commits, PRs, etc.) to the AI. In one natural sentence, first person ('I'), casual tone, no praise, no evaluation, just the facts. Weave in the project name naturally if provided."
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
  enabled: z.boolean().describe("Enable or disable voice readback globally").default(true),
  shortcut: z.string().describe("Keyboard shortcut for replay/stop").default("alt+r"),
  readback: ReadbackConfigSchema,
  summarizer: SummarizerConfigSchema.prefault({}),
  debug: DebugConfigSchema.prefault({}),
  api: ApiConfigSchema.prefault({})
});

const DEFAULT_READBACK = OpenAIReadbackSchema.parse({ provider: "openai" });

export const defaultConfig = SpeakConfigSchema.parse({
  readback: DEFAULT_READBACK,
  summarizer: {},
  debug: {},
  api: {}
});

export { UnrealReadbackSchema, OpenAIReadbackSchema };

export type SpeakConfig = z.infer<typeof SpeakConfigSchema>;
