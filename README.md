# pi-speak

[![npm version](https://img.shields.io/npm/v/@nbr/pi-speak.svg)](https://www.npmjs.com/package/@nbr/pi-speak)
[![Test Status](https://github.com/nikbrunner/pi-speak/actions/workflows/ci.yml/badge.svg)](https://github.com/nikbrunner/pi-speak/actions)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Voice readback extension for [Pi](https://github.com/mariozechner/pi-coding-agent).

## Features

- **Voice readback** — Press a keybind to hear agent responses via Unreal Speech TTS
- **Voice ping** — Spoken summary when agent finishes (LLM-powered via OpenRouter, or fallback)
- **Audio caching** — Responses cached for instant replay
- **Status widget** — Shows current playback state in the UI
- **macOS support** — Platform abstraction exists for future Linux/Windows support

## Installation

1. Install the extension:

```bash
pi install npm:@nbr/pi-speak
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

On first run, a default config is created at `~/.config/pi-speak/config.json`.

All available options with descriptions and defaults are defined in the schema:

- **[schema.ts](./src/config/v1/schema.ts)** — Zod source with descriptions, defaults, and enums
- **[schema.json](./src/config/v1/schema.json)** — Generated JSON Schema (enables editor autocomplete via `$schema`)

## Usage

- **Notification**: When the agent finishes, a notification appears with the session name and summary. Navigate to the session yourself, then press `alt+r` to hear the response.
- **`alt+r`**: Press to replay the last response. Press again during playback to stop.

## Debugging

Set `PI_SPEAK_DEBUG=0` to disable the debug log, or set `"debug": false` in config.
Log file: `~/.pi-speak-debug.log`

## Development

### Prerequisites

- Node.js 20+
- npm

### Setup

```bash
# Clone the repository
git clone https://github.com/nikbrunner/pi-speak.git
cd pi-speak

# Install dependencies
npm install
```

### Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run all quality checks
npm run test:all
```

### Quality Assurance

```bash
# Lint
npm run test:lint

# Format check
npm run test:format

# Type check
npm run test:compile

# Regenerate JSON schema after changing schema.ts
npm run generate:schema

# Fix lint and format issues
npm run lint
npm run format
```

## Releases

This project uses [release-please](https://github.com/googleapis/release-please) for automated versioning and changelog generation via [Conventional Commits](https://www.conventionalcommits.org/).

## Troubleshooting

### Voice readback not working

1. Ensure `UNREAL_SPEECH_API_KEY` is set in your environment
2. Check if system audio is not muted
3. Look at `~/.pi-speak-debug.log` for error messages

### Extension not loading

1. Verify the extension is installed: `pi install npm:@nbr/pi-speak`
2. Check Pi logs for extension errors
3. Ensure you're on macOS (Linux/Windows audio not yet supported)

### Config issues

The config file is at `~/.config/pi-speak/config.json`. Delete it to reset to defaults.

## License

MIT
