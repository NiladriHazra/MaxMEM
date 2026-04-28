import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { agentCommands, agentLabels } from "./agents";
import { createCapsule } from "./capsule";
import type { Agent } from "./types";

export interface LaunchAgentInput {
  agent: Agent;
  cwd: string;
  entryPath: string;
  goal?: string;
  sourceAgent?: Agent;
  sameWindow?: boolean;
}

interface TerminalCommandInput {
  cwd: string;
  entryPath: string;
  agent: Agent;
}

interface OpenTerminalInput {
  command: string;
}

const shellQuote = (value: string) => `'${value.replaceAll("'", "'\"'\"'")}'`;

const terminalCommand = ({ cwd, entryPath, agent }: TerminalCommandInput) =>
  [
    `cd ${shellQuote(cwd)}`,
    `${shellQuote(process.execPath)} ${shellQuote(entryPath)} ${shellQuote(agent)}`,
  ].join(" && ");

const openMacTerminal = ({ command }: OpenTerminalInput) =>
  spawnSync(
    "osascript",
    ["-e", `tell application "Terminal" to do script ${JSON.stringify(command)}`],
    {
      stdio: "ignore",
    },
  );

const openLinuxTerminal = ({ command }: OpenTerminalInput) => {
  const candidates = [process.env.TERMINAL ?? "", "gnome-terminal", "konsole", "xterm"].filter(
    Boolean,
  );
  const result = candidates
    .map((terminal) =>
      spawnSync(
        terminal,
        terminal.includes("gnome-terminal") ? ["--", "sh", "-lc", command] : ["-e", command],
        {
          stdio: "ignore",
        },
      ),
    )
    .find((candidate) => !candidate.error);

  return result ?? { status: 1, error: new Error("No terminal emulator found") };
};

const openWindowsTerminal = ({ command }: OpenTerminalInput) =>
  spawnSync("cmd.exe", ["/c", "start", "wt", "powershell", "-NoExit", "-Command", command], {
    stdio: "ignore",
  });

const openTerminal = ({ command }: OpenTerminalInput) =>
  process.platform === "darwin"
    ? openMacTerminal({ command })
    : process.platform === "win32"
      ? openWindowsTerminal({ command })
      : openLinuxTerminal({ command });

export const launchAgent = ({
  agent,
  cwd,
  entryPath,
  goal,
  sourceAgent = agent,
  sameWindow,
}: LaunchAgentInput) => {
  const resolvedCwd = resolve(cwd);
  const resolvedEntryPath = resolve(entryPath);

  if (!existsSync(resolvedCwd)) {
    return {
      ok: false,
      command: "",
      message: `Cannot launch ${agentLabels[agent]} because ${resolvedCwd} does not exist.`,
    };
  }

  createCapsule({
    agent: sourceAgent,
    cwd: resolvedCwd,
    goal: goal ?? `Launch ${agentLabels[agent]} with the latest MaxMEM handoff.`,
  });

  const command = terminalCommand({ cwd: resolvedCwd, entryPath: resolvedEntryPath, agent });
  const result = sameWindow
    ? spawnSync(agentCommands[agent], [], { cwd: resolvedCwd, stdio: "inherit" })
    : openTerminal({ command });
  const ok = !result.status && !result.error;

  return {
    ok,
    command,
    message: ok
      ? `Launched ${agentLabels[agent]} with a fresh MaxMEM handoff.`
      : `Could not open ${agentLabels[agent]}. Run manually: ${command}`,
  };
};
