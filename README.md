# MaxMEM

MaxMEM is a local-first handoff layer for AI coding agents. It helps Codex, Claude Code, and OpenCode continue the same repo work without copying an entire chat transcript.

The first version is a wrapper plus hook installer:

```sh
bun install
bun run dev install-hooks
bun run dev codex
bun run dev claude
bun run dev opencode
```

After linking the package, use the shorter command:

```sh
bun link
maxmem install-hooks
maxmem codex
maxmem claude
maxmem opencode
```

## Commands

```sh
maxmem codex [args...]       # launch Codex through the MaxMEM wrapper
maxmem claude [args...]      # launch Claude Code through the MaxMEM wrapper
maxmem opencode [args...]    # launch OpenCode through the MaxMEM wrapper
maxmem handoff               # create and print a handoff capsule
maxmem handoff --copy        # copy the capsule on macOS
maxmem inject                # print the latest injectable context for this repo
maxmem install-hooks         # install Codex and Claude Code hooks
maxmem status                # show latest repo handoff status
```

## What Gets Shared

By default, MaxMEM stores a compact capsule:

- repo and branch
- changed files
- git status and diff stats
- source agent
- current goal
- recommended next prompt

It does not export raw chat by default.
