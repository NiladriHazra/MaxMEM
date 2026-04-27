# Architecture

MaxMEM is split by responsibility:

- `src/cli` parses command arguments.
- `src/commands` owns user-facing commands.
- `src/core` owns git context, capsules, transcript parsing, redaction, and storage.
- `src/integrations` installs and handles Codex, Claude Code, and OpenCode hooks.
- `src/ui` owns wrapper preflight UI and terminal status rendering.
- `src/platform` owns OS/process helpers.

The package bin points to `bin/maxmem`, a tiny Bun shim that loads the readable source in `src`. `bun run build` compiles to a temporary directory only to catch bundling errors; generated output is not part of normal development.

## Handoff Flow

1. Agent hook or wrapper calls MaxMEM.
2. MaxMEM reads git state and the latest known transcript path.
3. Transcript parsing extracts commands, files, decisions, blockers, and optional raw chat snippets.
4. Redaction runs before any capsule is saved or rendered.
5. The next agent receives a compact handoff through hooks, wrapper injection, or clipboard export.

## Integration Surfaces

- Codex: `~/.codex/hooks.json` with `SessionStart` and `Stop`.
- Claude Code: `~/.claude/settings.json` with `SessionStart`, `Stop`, and `statusLine`.
- OpenCode: `~/.config/opencode/plugins/maxmem.js` with `session.idle`, `experimental.session.compacting`, and `shell.env`.
