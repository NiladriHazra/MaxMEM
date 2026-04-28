#!/usr/bin/env bun
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { runCompanionCommand } from "../commands/companion";
import { runHandoffCommand } from "../commands/handoff";
import { runInspectCommand } from "../commands/inspect";
import { runLaunchCommand } from "../commands/launch";
import { runMemoryCommand } from "../commands/memory";
import { ensureAutoSetup, runSetupCommand } from "../commands/setup";
import { showStatus } from "../commands/status";
import { agentBySessionStartHook, agentByStopHook, isAgent } from "../core/agents";
import { getInjectionContext } from "../core/capsule";
import type { Agent } from "../core/types";
import { runMcpServer } from "../mcp/server";
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
  agent: Agent;
  args: string[];
}

interface ArgsInput {
  args: string[];
}

const entryPath = resolve(process.argv[1] ?? fileURLToPath(import.meta.url));
const helpCommands = new Set(["help", "--help", "-h"]);
const hookInstallers = {
  all: installAllHooks,
  claude: installClaudeHooks,
  codex: installCodexHooks,
  opencode: installOpenCodePlugin,
};

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
      "  maxmem launch codex|claude|opencode [--goal text] [--same-window]",
      "  maxmem companion [--port 3838]",
      "  maxmem memory [--add text] [--kind note|decision|blocker|verification|completed_task]",
      "  maxmem mcp",
      "  maxmem inject",
      "  maxmem setup [--quiet]",
      "  maxmem install-hooks [codex|claude|opencode|all]",
      "  maxmem status [--verbose]",
      "",
      "MaxMEM stores compact handoff capsules locally and avoids raw chat export by default.",
    ].join("\n"),
  );
};

const isHookInstaller = (target: string): target is keyof typeof hookInstallers =>
  target in hookInstallers;

const installHooks = ({ args }: ArgsInput) => {
  const target = args.at(0) ?? "all";
  const installer = isHookInstaller(target) ? hookInstallers[target] : hookInstallers.all;
  const messages = installer({ entryPath });

  messages.map((message) => console.log(message));
};

const runAgent = async ({ agent, args }: AgentCommandInput) =>
  runWrapper({ agent, args, cwd: process.cwd() });

const runHook = async ({ args }: ArgsInput) => {
  const hook = args.at(0);
  const dispatch = [
    {
      agent: hook ? agentBySessionStartHook(hook) : undefined,
      handler: handleSessionStartHook,
    },
    {
      agent: hook ? agentByStopHook(hook) : undefined,
      handler: handleStopHook,
    },
  ].find(({ agent }) => agent);

  return dispatch?.agent ? dispatch.handler({ agent: dispatch.agent }) : undefined;
};

const statusLineHandlers = {
  claude: handleClaudeStatusLine,
};

const isStatusLineHandler = (target: string): target is keyof typeof statusLineHandlers =>
  target in statusLineHandlers;

const runStatusLine = async ({ args }: ArgsInput) => {
  const target = args.at(0) ?? "";

  return isStatusLineHandler(target) ? statusLineHandlers[target]() : undefined;
};

const commandHandlers = {
  companion: async ({ args }: ArgsInput) => {
    await runCompanionCommand({ args, cwd: process.cwd(), entryPath });
    return 0;
  },
  handoff: async ({ args }: ArgsInput) => {
    await runHandoffCommand({ args, cwd: process.cwd() });
    return 0;
  },
  hook: async ({ args }: ArgsInput) => {
    await runHook({ args });
    return 0;
  },
  inject: () => {
    console.log(
      getInjectionContext({ cwd: process.cwd() }) || "No maxMEM handoff found for this repo.",
    );
    return 0;
  },
  "install-hooks": ({ args }: ArgsInput) => {
    installHooks({ args });
    return 0;
  },
  inspect: ({ args }: ArgsInput) => {
    runInspectCommand({ args, cwd: process.cwd() });
    return 0;
  },
  launch: ({ args }: ArgsInput) => {
    runLaunchCommand({ args, cwd: process.cwd(), entryPath });
    return 0;
  },
  memory: ({ args }: ArgsInput) => {
    runMemoryCommand({ args, cwd: process.cwd() });
    return 0;
  },
  mcp: async () => {
    await runMcpServer();
    return 0;
  },
  setup: ({ args }: ArgsInput) => {
    runSetupCommand({ args, entryPath });
    return 0;
  },
  status: ({ args }: ArgsInput) => {
    showStatus({ cwd: process.cwd(), verbose: hasFlag({ args, name: "verbose" }) });
    return 0;
  },
  statusline: async ({ args }: ArgsInput) => {
    await runStatusLine({ args });
    return 0;
  },
};

const isCommandHandler = (command: string): command is keyof typeof commandHandlers =>
  command in commandHandlers;

const main = async ({ command, args }: CommandInput) => {
  ensureAutoSetup({ command, entryPath });

  if (!command || helpCommands.has(command)) {
    printHelp();
    return 0;
  }

  if (isAgent(command)) {
    return runAgent({ agent: command as Agent, args });
  }

  if (isCommandHandler(command)) {
    return commandHandlers[command]({ args });
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
