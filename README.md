# MaxMEM

MaxMEM is a local-first handoff layer for AI coding agents. It helps Codex, Claude Code, and OpenCode continue the same repo work without copying an entire chat transcript.

MaxMEM ships as a wrapper plus hook/plugin installer:

```sh
bun install
bun link
maxmem install-hooks
bun run dev codex
bun run dev claude
bun run dev opencode
```

For local development:

```sh
bun run dev handoff --select
bun run build
```

There is no committed `dist/cli.js`. The package bin is a tiny Bun shim in `bin/maxmem`, and the readable implementation lives in `src`.

## Commands

```sh
maxmem codex [args...]       # launch Codex through the MaxMEM wrapper
maxmem claude [args...]      # launch Claude Code through the MaxMEM wrapper
maxmem opencode [args...]    # launch OpenCode through the MaxMEM wrapper
maxmem handoff               # create and print a handoff capsule
maxmem handoff --copy        # copy the capsule on macOS
maxmem handoff --select      # choose exactly what to include
maxmem handoff --raw-chat    # explicitly include redacted raw chat snippets
maxmem inject                # print the latest injectable context for this repo
maxmem install-hooks         # install Codex, Claude Code, and OpenCode integrations
maxmem status                # show latest repo handoff status
```

## What Gets Shared

By default, MaxMEM stores a compact capsule:

- repo and branch
- changed files
- git status and diff stats
- transcript-derived commands, decisions, and blockers when available
- source agent
- current goal
- recommended next prompt

It does not export raw chat by default.

## Docs

- [Architecture](documentation/ARCHITECTURE.md)
- [Demo](documentation/DEMO.md)
- [Roadmap](documentation/ROADMAP.md)
