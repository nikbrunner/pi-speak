---
name: pi-speak-dev
description: Context for developing the pi-speak voice readback extension
argument-hint: [optional: specific topic to focus on]
user-invocable: false
---

# pi-speak Development

## Extension Architecture

### Entry Point

`src/index.ts` — exports the default extension function that receives `ExtensionAPI`.

### Key Extension Events

| Event                | Purpose                                                             |
| -------------------- | ------------------------------------------------------------------- |
| `session_start`      | Initialize TTS player, check API keys, warn on unsupported platform |
| `agent_end`          | Extract assistant text, generate voice ping, speak summary          |
| `tool_execution_end` | Triggers lint checks (handled by separate extension)                |

### Shortcuts

- `alt+r` (configurable): Replay last response / stop playback

### Files

| File                       | Purpose                                                             |
| -------------------------- | ------------------------------------------------------------------- |
| `src/index.ts`             | Extension entry + event handlers                                    |
| `src/tts.ts`               | TTSPlayer class — chunks text, calls Unreal Speech API, plays audio |
| `src/summarizer.ts`        | OpenRouter LLM call to generate ping text                           |
| `src/platform.ts`          | macOS audio playback (afplay), mute detection                       |
| `src/config/`              | Zod schema, defaults, migrations                                    |
| `src/helpers.ts`           | stripMarkdown, chunkText utilities                                  |
| `src/debug.ts`             | Debug logging to file                                               |
| `.pi/extensions/checks.ts` | Lint hook — runs on write/edit                                      |

## Config Schema

Located at `src/config/schema.ts` — Zod-based validation.

Default config path: `~/.config/pi-speak/config.json`

## API Keys

| Key                     | Purpose         | Config location          |
| ----------------------- | --------------- | ------------------------ |
| `UNREAL_SPEECH_API_KEY` | TTS voice       | env (required) or config |
| `OPENROUTER_API_KEY`    | Summarizer ping | env (optional) or config |

## Testing

```bash
npm test           # unit tests with Vitest
npm run test:watch # watch mode
npm run test:all   # full quality gate (test + lint + format + type check)
```

## Releases

Release-please handles versioning via Conventional Commits.
