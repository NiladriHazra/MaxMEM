# MaxMEM

![MaxMEM ink-wash hero](assets/readme/hero.png)

MaxMEM is a local-first handoff layer for AI coding agents. It lets Codex, Claude Code, and OpenCode continue the same repository work without copying an entire chat transcript.

The project is intentionally small: a Bun CLI, local SQLite storage, hook installers, transcript parsing, redaction, and compact handoff capsules.

## Why It Exists

Agent sessions are useful, but handoffs are usually messy. MaxMEM stores the parts that matter:

- repository and branch
- changed files
- recent commits
- transcript-derived commands, files, decisions, and blockers
- source agent
- current goal
- next recommended prompt

Raw chat is not exported by default.

## Install

```sh
bun install
bun link
```

MaxMEM also runs setup automatically on install and on the first normal `maxmem` command. To force it again:

```sh
maxmem setup
```

For local development, run the CLI through the Bun shim:

```sh
bun run dev status
bun run dev handoff --select
```

There is no committed `dist/cli.js`. The package bin is `bin/maxmem`, and the readable implementation lives in `src`.

## Commands

```sh
maxmem codex [args...]       # launch Codex through the MaxMEM wrapper
maxmem claude [args...]      # launch Claude Code through the MaxMEM wrapper
maxmem opencode [args...]    # launch OpenCode through the MaxMEM wrapper

maxmem handoff               # create and print a compact handoff capsule
maxmem handoff --copy        # copy the capsule on macOS
maxmem handoff --select      # choose exactly what to include
maxmem handoff --raw-chat    # explicitly include redacted raw chat snippets
maxmem handoff --verbosity standard
maxmem handoff --verbosity full

maxmem inspect               # inspect latest parsed transcript/capsule state
maxmem inspect --agent claude
maxmem inspect --transcript path/to/session.jsonl
maxmem inspect --capsule

maxmem launch codex          # create a handoff and open Codex in a new terminal
maxmem launch claude         # create a handoff and open Claude Code in a new terminal
maxmem launch opencode       # create a handoff and open OpenCode in a new terminal
maxmem companion             # open the local capsule viewer and launcher
maxmem mcp                   # run the stdio MCP server

maxmem inject                # print the latest injectable context for this repo
maxmem install-hooks         # install Codex, Claude Code, and OpenCode integrations
maxmem status                # show latest repo handoff status
maxmem status --verbose
```

## Handoff Flow

1. An agent hook or wrapper calls MaxMEM.
2. MaxMEM reads git state and the latest known transcript path.
3. The agent adapter selects the right transcript parser.
4. Transcript parsing extracts commands, files, decisions, blockers, and optional raw chat snippets.
5. Redaction runs before any capsule is saved or rendered.
6. The next agent receives compact context through hooks, wrapper injection, or clipboard export.

## Verbosity

MaxMEM has three presets:

- `compact`: default, no raw chat, short extracted context
- `standard`: more transcript-derived context, still no raw chat
- `full`: includes redacted raw chat snippets when explicitly selected

The default stays privacy-first. Use `--raw-chat` or `--verbosity full` only when you want raw snippets included.

## Integrations

- Codex: installs `SessionStart` and `Stop` hooks, the MaxMEM MCP server, and a local command plugin.
- Claude Code: installs hooks, status line, MCP config, and `/maxmem-*` slash commands.
- OpenCode: installs a plugin, MCP config, and `maxmem-*` commands.

## Project Layout

```text
bin/       Bun executable shim
src/       CLI, commands, core logic, integrations, and UI
tests/     parser, capsule, and redaction tests
scripts/   build and local install helpers
assets/    README and project assets
```

Core modules:

- `src/core/agents.ts`: typed agent adapter registry
- `src/core/transcript.ts`: agent-aware transcript parsing
- `src/core/capsule.ts`: capsule creation and rendering
- `src/core/launch.ts`: cross-agent launch helpers
- `src/core/store.ts`: local SQLite storage
- `src/core/redaction.ts`: secret and raw-chat redaction
- `src/mcp/server.ts`: stdio MCP server

## Development

```sh
bun run format
bun run build
npx tsc --noEmit
bun run lint
bun test
```

Before committing, run:

```sh
bun run build
npx tsc --noEmit
bun run lint
bun run format
```

## Roadmap

- Add more provider-specific transcript fixtures as formats evolve.
- Add package publishing automation once the package name is finalized.
- Harden Linux and Windows terminal launching beyond the macOS path.
- Add richer companion history filters and per-repo capsule search.
