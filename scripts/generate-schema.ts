import { writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { SpeakConfigSchema } from "../src/config/v1/schema";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outputPath = resolve(__dirname, "../src/config/v1/schema.json");

const jsonSchema = z.toJSONSchema(SpeakConfigSchema, {
  target: "draft-07",
  io: "input"
});

writeFileSync(outputPath, JSON.stringify(jsonSchema, null, 2) + "\n");

console.log(`Generated ${outputPath}`);
