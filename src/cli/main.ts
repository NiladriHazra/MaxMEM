#!/usr/bin/env bun
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { runHandoffCommand } from "../commands/handoff";
import { runInspectCommand } from "../commands/inspect";
import { showStatus } from "../commands/status";
import { agentBySessionStartHook, agentByStopHook, isAgent } from "../core/agents";
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

const entryPath = resolve(process.argv[1] ?? fileURLToPath(import.meta.url));

const printHelp = () => {
  console.log(
    [
      "maxMEM",
      "",
      "Usage:",
      "  maxmem codex [args...]",
      "  maxmem claude [args...]",
      "  maxmem opencode [args...]",
      "  maxmem handoff [--agent codex|claude|opencode] [--goal text] [--verbosity compact|standard|full] [--copy] [--select]",
      "  maxmem inspect [--agent codex|claude|opencode] [--transcript path] [--capsule]",
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
  const sessionStartAgent = hook ? agentBySessionStartHook(hook) : undefined;
  const stopAgent = hook ? agentByStopHook(hook) : undefined;

  if (sessionStartAgent) {
    await handleSessionStartHook({ agent: sessionStartAgent });
    return;
  }

  if (stopAgent) {
    await handleStopHook({ agent: stopAgent });
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

  if (command === "inspect") {
    runInspectCommand({ args, cwd: process.cwd() });
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
