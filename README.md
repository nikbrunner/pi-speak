# pi-speak

Voice readback extension for [Pi](https://github.com/mariozechner/pi-coding-agent).

## Features

- **Voice readback** — Hear agent responses via Unreal Speech TTS
- **Summary notifications** — macOS notification with session summary when agent finishes
- **Audio caching** — Responses cached for instant replay
- **Replay shortcut** — `alt+r` to replay last response or stop playback
- **Status widget** — Shows current playback state in the UI
- **Lint feedback** — Auto-runs ESLint + Prettier after write/edit operations
- **Cross-platform ready** — Platform abstraction exists for future Linux/Windows support

## Installation

> [!NOTE]
> Not published on npm yet

```bash
pi install git:github.com/nikbrunner/pi-speak
```

2. Add your API key to `~/.env`:

```sh
export UNREAL_SPEECH_API_KEY=your-key-here

# or bring source it inline
UNREAL_SPEECH_API_KEY=your-key-here pi
```

3. Reload Pi — the extension is auto-discovered.

## Configuration

<!-- TODO: Is this the documented default dir? -->

On first run, a default config is created at `~/.config/pi-speak/config.json`:

```json
{
  "voiceId": "Sierra",
  "bitrate": "192k",
  "speed": 0,
  "pitch": 1.0,
  "maxChunkChars": 900,
  "shortcut": "alt+r",
  "debug": true,
  "summarizerModel": "openai/gpt-oss-20b"
}
```

| Key               | Type    | Default                | Description                                 |
| ----------------- | ------- | ---------------------- | ------------------------------------------- |
| `voiceId`         | string  | `"Sierra"`             | Unreal Speech voice ID                      |
| `bitrate`         | string  | `"192k"`               | Audio bitrate                               |
| `speed`           | number  | `0`                    | Speech speed (-1.0 to 1.0)                  |
| `pitch`           | number  | `1.0`                  | Speech pitch (0.5 to 1.5)                   |
| `maxChunkChars`   | number  | `900`                  | Max chars per TTS request (API limit: 1000) |
| `shortcut`        | string  | `"alt+r"`              | Keyboard shortcut for replay/stop           |
| `debug`           | boolean | `true`                 | Write to `~/.pi-speak-debug.log`            |
| `summarizerModel` | string  | `"openai/gpt-oss-20b"` | OpenRouter model for voice ping summaries   |

Environment variables override file config: `PI_SPEAK_VOICE`, `PI_SPEAK_BITRATE`, `PI_SPEAK_SPEED`, `PI_SPEAK_PITCH`, `PI_SPEAK_SHORTCUT`, `PI_SPEAK_DEBUG`, `PI_SPEAK_SUMMARIZER_MODEL`.

## Usage

- **Notification**: When the agent finishes, a notification appears with the session name and summary. Navigate to the session yourself, then press `alt+r` to hear the response.
- **`alt+r`**: Press to replay the last response. Press again during playback to stop.

## Debugging

Set `PI_SPEAK_DEBUG=0` to disable the debug log, or set `"debug": false` in config.
Log file: `~/.pi-speak-debug.log`

## TODO

- [ ] Verify config setup
- [ ] Config Migration Support
- [ ] Discard env var override support
- [ ] Publish on npm
- [ ] Linux support
- [ ] Windows support
