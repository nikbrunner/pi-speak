# pi-speak

Voice readback extension for [Pi](https://github.com/mariozechner/pi-coding-agent).

## Features

- **Voice readback** — Hear agent responses via Unreal Speech TTS
- **Voice ping** — Spoken summary when agent finishes (LLM-powered via OpenRouter, or fallback)
- **Audio caching** — Responses cached for instant replay
- **Replay shortcut** — `alt+r` to replay last response or stop playback
- **Status widget** — Shows current playback state in the UI
- **Lint feedback** — Auto-runs ESLint + Prettier after write/edit operations
- **macOS support** — Platform abstraction exists for future Linux/Windows support

## Installation

> [!NOTE]
> Not published on npm yet

1. Install the extension:

```bash
pi install git:github.com/nikbrunner/pi-speak
```

2. Add your API key to your environment by sourcing `~/.env` in your shell:

```sh
# Add to your shell profile (~/.zshrc, ~/.bashrc, etc.)
source ~/.env

# Or set it inline:
UNREAL_SPEECH_API_KEY=your-key-here pi
```

3. Reload Pi — the extension is auto-discovered.

## Configuration

On first run, a default config is created at `~/.config/pi-speak/config.json`:

See the default config [here](./src/config/schema.json).

| Key                           | Type         | Default                   | Description                                                 |
| ----------------------------- | ------------ | ------------------------- | ----------------------------------------------------------- |
| `tts.voiceId`                 | string       | `"Sierra"`                | [Unreal Speech voice ID](https://docs.v8.unrealspeech.com/) |
| `tts.bitrate`                 | string       | `"192k"`                  | Audio bitrate                                               |
| `tts.speed`                   | number       | `0`                       | Speech speed (-1.0 to 1.0)                                  |
| `tts.pitch`                   | number       | `1.0`                     | Speech pitch (0.5 to 1.5)                                   |
| `tts.maxChunkChars`           | number       | `900`                     | Max chars per TTS request (API limit: 1000)                 |
| `behavior.shortcut`           | string       | `"alt+r"`                 | Keyboard shortcut for replay/stop                           |
| `behavior.pingEnabled`        | boolean      | `true`                    | Speak ping on agent_end                                     |
| `behavior.pingOnStartEnabled` | boolean      | `false`                   | Speak welcome on session_start                              |
| `behavior.fallbackPingText`   | string       | `"Work finished."`        | Fallback ping text when summarizer disabled                 |
| `summarizer.enabled`          | boolean      | `true`                    | Use LLM for ping summaries (vs fallback)                    |
| `summarizer.model`            | string       | `"openai/gpt-oss-20b"`    | [OpenRouter model](https://openrouter.ai/models)            |
| `summarizer.maxTokens`        | number       | `60`                      | Max tokens for summarizer                                   |
| `summarizer.timeoutMs`        | number       | `5000`                    | Timeout for summarizer API call                             |
| `debug.enabled`               | boolean      | `true`                    | Write to debug log                                          |
| `debug.logPath`               | string       | `"~/.pi-speak-debug.log"` | Path to debug log file                                      |
| `debug.logMaxBytes`           | number       | `2097152`                 | Max size before log rotation                                |
| `api.unrealSpeechKey`         | string\|null | `null`                    | Unreal Speech API key (env var takes precedence)            |
| `api.openRouterKey`           | string\|null | `null`                    | OpenRouter API key (env var takes precedence)               |

## Usage

- **Notification**: When the agent finishes, a notification appears with the session name and summary. Navigate to the session yourself, then press `alt+r` to hear the response.
- **`alt+r`**: Press to replay the last response. Press again during playback to stop.

## Debugging

Set `PI_SPEAK_DEBUG=0` to disable the debug log, or set `"debug": false` in config.
Log file: `~/.pi-speak-debug.log`

## Releases

This project uses [release-please](https://github.com/googleapis/release-please) for automated versioning and changelog generation via [Conventional Commits](https://www.conventionalcommits.org/).

## TODO

- [x] Add release-please
- [x] Config location follows XDG spec (`~/.config/pi-speak/config.json`) — no standard convention exists for pi-package extension config
- [x] Config Migration Support
- [x] Remove ~/.env file loading (use process.env directly)
- [x] If muted, don't generate TTS to save costs.
  - don't play the summarizer, and show notification for the readback inside the TUI that its muted
- [ ] Publish on npm
- [ ] Linux support
- [ ] Windows support
