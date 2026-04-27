#!/usr/bin/env bun
import { fileURLToPath } from "node:url";
import { runHandoffCommand } from "../commands/handoff";
import { showStatus } from "../commands/status";
import { getInjectionContext } from "../core/capsule";
import type { Agent } from "../core/types";
import {
  handleClaudeStatusLine,
  handleSessionStartHook,
  handleStopHook,
} from "../integrations/hooks";
import {
  installAllHooks,
  installClaudeHooks,
  installCodexHooks,
  installOpenCodePlugin,
} from "../integrations/installers";
import { runWrapper } from "../ui/wrapper";
import { hasFlag } from "./options";

interface CommandInput {
  command: string | undefined;
  args: string[];
}

interface AgentCommandInput {
  command: string;
  args: string[];
}

interface ArgsInput {
  args: string[];
}

const entryPath = fileURLToPath(import.meta.url);
const agents = ["codex", "claude", "opencode"] as const;

const isAgent = (value: string) => agents.some((agent) => agent === value);

const printHelp = () => {
  console.log(
    [
      "maxMEM",
      "",
      "Usage:",
      "  maxmem codex [args...]",
      "  maxmem claude [args...]",
      "  maxmem opencode [args...]",
      "  maxmem handoff [--agent codex|claude|opencode] [--goal text] [--copy] [--select]",
      "  maxmem inject",
      "  maxmem install-hooks [codex|claude|opencode|all]",
      "  maxmem status [--verbose]",
      "",
      "MaxMEM stores compact handoff capsules locally and avoids raw chat export by default.",
    ].join("\n"),
  );
};

const installHooks = ({ args }: ArgsInput) => {
  const target = args.at(0) ?? "all";
  const messages =
    target === "codex"
      ? installCodexHooks({ entryPath })
      : target === "claude"
        ? installClaudeHooks({ entryPath })
        : target === "opencode"
          ? installOpenCodePlugin({ entryPath })
          : installAllHooks({ entryPath });

  messages.map((message) => console.log(message));
};

const runAgent = async ({ command, args }: AgentCommandInput) => {
  if (!isAgent(command)) {
    printHelp();
    return 1;
  }

  return runWrapper({ agent: command as Agent, args, cwd: process.cwd() });
};

const runHook = async ({ args }: ArgsInput) => {
  const hook = args.at(0);

  if (hook === "codex-session-start") {
    await handleSessionStartHook({ agent: "codex" });
    return;
  }

  if (hook === "claude-session-start") {
    await handleSessionStartHook({ agent: "claude" });
    return;
  }

  if (hook === "codex-stop") {
    await handleStopHook({ agent: "codex" });
    return;
  }

  if (hook === "claude-stop") {
    await handleStopHook({ agent: "claude" });
    return;
  }

  if (hook === "opencode-stop") {
    await handleStopHook({ agent: "opencode" });
  }
};

const runStatusLine = async ({ args }: ArgsInput) => {
  if (args.at(0) === "claude") {
    await handleClaudeStatusLine();
  }
};

const main = async ({ command, args }: CommandInput) => {
  if (!command || command === "help" || command === "--help" || command === "-h") {
    printHelp();
    return 0;
  }

  if (isAgent(command)) {
    return runAgent({ command, args });
  }

  if (command === "handoff") {
    await runHandoffCommand({ args, cwd: process.cwd() });
    return 0;
  }

  if (command === "inject") {
    console.log(
      getInjectionContext({ cwd: process.cwd() }) || "No maxMEM handoff found for this repo.",
    );
    return 0;
  }

  if (command === "install-hooks") {
    installHooks({ args });
    return 0;
  }

  if (command === "hook") {
    await runHook({ args });
    return 0;
  }

  if (command === "statusline") {
    await runStatusLine({ args });
    return 0;
  }

  if (command === "status") {
    showStatus({ cwd: process.cwd(), verbose: hasFlag({ args, name: "verbose" }) });
    return 0;
  }

  printHelp();
  return 1;
};

const [command, ...args] = process.argv.slice(2);

main({ command, args })
  .then((exitCode) => {
    process.exitCode = exitCode;
  })
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
