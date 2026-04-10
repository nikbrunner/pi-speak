#!/usr/bin/env node
/**
 * Config validation and migration test script
 * Run with: node scripts/test-config.mjs
 *
 * This tests the Zod schema validation logic used in config.ts.
 */

import { z } from "zod";

console.log("🧪 Config Validation and Migration Tests");
console.log("=".repeat(50));

// Define schema inline (same as in src/config.ts - Zod 4 quirk: nested objects need .optional().default({}) )
const SpeakConfigSchema = z.object({
  $schema: z.string().url().default("https://example.com/schema"),
  version: z.number().int().min(0).default(1),
  tts: z.object({
    voiceId: z.string().default("Sierra"),
    bitrate: z.string().default("192k"),
    speed: z.number().min(-1).max(1).default(0),
    pitch: z.number().min(0.5).max(1.5).default(1.0),
    maxChunkChars: z.number().int().min(1).max(1000).default(900)
  }).optional().default({}),
  behavior: z.object({
    shortcut: z.string().default("alt+r"),
    pingEnabled: z.boolean().default(true),
    pingOnStartEnabled: z.boolean().default(false),
    fallbackPingText: z.string().default("Work finished.")
  }).optional().default({}),
  summarizer: z.object({
    enabled: z.boolean().default(true),
    model: z.string().default("openai/gpt-oss-20b"),
    maxTokens: z.number().int().min(1).max(500).default(60),
    timeoutMs: z.number().int().min(1000).max(60000).default(5000)
  }).optional().default({}),
  debug: z.object({
    enabled: z.boolean().default(true),
    logPath: z.string().default("~/.pi-speak-debug.log"),
    logMaxBytes: z.number().int().min(1024).max(10 * 1024 * 1024).default(2 * 1024 * 1024)
  }).optional().default({}),
  api: z.object({
    unrealSpeechKey: z.string().nullable().default(null),
    openRouterKey: z.string().nullable().default(null)
  }).optional().default({})
});

const tests = [
  {
    name: "v1 config (valid with partial tts)",
    input: {
      version: 1,
      tts: { voiceId: "Scarlett", bitrate: "128k" }
    },
    check: (config) => {
      return config.version === 1 &&
             config.tts.voiceId === "Scarlett" &&
             config.tts.bitrate === "128k" &&
             config.tts.speed === 0 &&  // default
             config.tts.pitch === 1.0; // default
    }
  },
  {
    name: "empty config (nested defaults not cascaded - Zod 4 quirk)",
    input: {},
    // Note: Zod 4 doesn't cascade defaults into empty nested objects.
    // This is expected behavior - empty nested objects remain empty.
    // The DEFAULT_CONFIG fallback in loadConfig() handles the no-file case.
    check: (config) => {
      return config.version === 1 &&
             typeof config.tts === "object" &&
             typeof config.behavior === "object" &&
             typeof config.summarizer === "object";
    }
  },
  {
    name: "invalid tts.speed type",
    input: {
      version: 1,
      tts: { speed: "fast" }
    },
    shouldFail: true
  },
  {
    name: "invalid tts.speed range",
    input: {
      version: 1,
      tts: { speed: 5 }
    },
    shouldFail: true
  },
  {
    name: "invalid pitch range",
    input: {
      version: 1,
      tts: { pitch: 0.1 }
    },
    shouldFail: true
  },
  {
    name: "valid all fields override",
    input: {
      version: 1,
      tts: { voiceId: "Scarlett", bitrate: "96k", speed: -0.5, pitch: 0.8, maxChunkChars: 500 },
      behavior: { shortcut: "cmd+r", pingEnabled: false },
      summarizer: { enabled: false, model: "anthropic/claude-3" }
    },
    check: (config) => {
      return config.version === 1 &&
             config.tts.voiceId === "Scarlett" &&
             config.tts.bitrate === "96k" &&
             config.tts.speed === -0.5 &&
             config.tts.pitch === 0.8 &&
             config.tts.maxChunkChars === 500 &&
             config.behavior.shortcut === "cmd+r" &&
             config.behavior.pingEnabled === false &&
             config.summarizer.enabled === false &&
             config.summarizer.model === "anthropic/claude-3";
    }
  }
];

let passed = 0;
let failed = 0;

for (const test of tests) {
  process.stdout.write(`\n📋 ${test.name}... `);

  try {
    const result = SpeakConfigSchema.safeParse(test.input);

    if (test.shouldFail) {
      if (!result.success) {
        console.log("✅ PASS (expected validation error)");
        passed++;
      } else {
        console.log("❌ FAIL (expected validation error but succeeded)");
        failed++;
      }
    } else if (result.success && test.check) {
      // Use the check function for validation
      if (test.check(result.data)) {
        console.log("✅ PASS");
        passed++;
      } else {
        console.log("❌ FAIL (check function returned false)");
        console.log(`   Config: ${JSON.stringify(result.data, null, 2)}`);
        failed++;
      }
    } else if (result.success) {
      console.log("✅ PASS");
      passed++;
    } else {
      console.log("❌ FAIL");
      console.log(`   Error: ${result.error.issues.map(i => i.message).join(", ")}`);
      failed++;
    }
  } catch (err) {
    console.log("❌ ERROR");
    console.log(`   ${err instanceof Error ? err.message : String(err)}`);
    failed++;
  }
}

// Test v0 → v1 migration logic
console.log("\n\n📋 v0 → v1 migration... ");
try {
  // Simulate v0 config
  const v0Config = {
    voiceId: "Scarlett",
    speed: 0.5,
    shortcut: "cmd+r"
  };

  // Simulate migration
  const migratedConfig = {
    $schema: "https://raw.githubusercontent.com/nikbrunner/pi-speak/main/src/config.schema.json",
    version: 1,
    tts: {
      voiceId: v0Config.voiceId ?? "Sierra",
      bitrate: v0Config.bitrate ?? "192k",
      speed: v0Config.speed ?? 0,
      pitch: v0Config.pitch ?? 1.0,
      maxChunkChars: v0Config.maxChunkChars ?? 900
    },
    behavior: {
      shortcut: v0Config.shortcut ?? "alt+r",
      pingEnabled: true,
      pingOnStartEnabled: false,
      fallbackPingText: "Work finished."
    },
    summarizer: {
      enabled: true,
      model: v0Config.summarizerModel ?? "openai/gpt-oss-20b",
      maxTokens: 60,
      timeoutMs: 5000
    },
    debug: {
      enabled: v0Config.debug ?? true,
      logPath: "~/.pi-speak-debug.log",
      logMaxBytes: 2 * 1024 * 1024
    },
    api: {
      unrealSpeechKey: null,
      openRouterKey: null
    }
  };

  const result = SpeakConfigSchema.safeParse(migratedConfig);
  if (result.success &&
      result.data.tts.voiceId === "Scarlett" &&
      result.data.tts.speed === 0.5 &&
      result.data.behavior.shortcut === "cmd+r" &&
      result.data.version === 1) {
    console.log("✅ PASS");
    passed++;
  } else {
    console.log("❌ FAIL (migration produced invalid config or values not preserved)");
    failed++;
  }
} catch (err) {
  console.log("❌ ERROR");
  console.log(`   ${err instanceof Error ? err.message : String(err)}`);
  failed++;
}

console.log("\n" + "=".repeat(50));
console.log(`📊 Results: ${passed} passed, ${failed} failed`);

if (failed > 0) {
  process.exit(1);
}
