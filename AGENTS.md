# pi-speak — Project Context

## What This Is

A **Pi coding agent extension** that adds voice readback via Unreal Speech TTS. Not a standalone app — runs inside Pi.

## Pi Extension Structure

Read more about Pi Packages and Extensions here:

- https://github.com/badlogic/pi-mono/blob/main/packages/coding-agent/docs/packages.md
- https://github.com/badlogic/pi-mono/blob/main/packages/coding-agent/docs/extensions.md

## Linting

- `.pi/extensions/lint.ts` auto-runs ESLint + Prettier after every write/edit
- Errors are injected into the conversation automatically
- No manual lint step needed — trust the hook

## Platform

macOS for now. Platform abstraction exists (`src/platform.ts`) for future Linux/Windows support.

## Packaging

Planned as a **pi-package** for distribution via `pi install npm:pi-speak`.

See **README.md** for full details.
