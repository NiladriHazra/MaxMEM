import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { agentCommand, agentLabels } from "./agents";
import { createCapsule } from "./capsule";
import type { Agent } from "./types";

export interface LaunchAgentInput {
  agent: Agent;
  cwd: string;
  goal?: string;
  sourceAgent?: Agent;
  sameWindow?: boolean;
}

interface TerminalCommandInput {
  cwd: string;
  agent: Agent;
}

interface OpenTerminalInput {
  command: string;
}

interface AppleScriptInput {
  lines: string[];
}

interface CodeTerminalInput {
  command: string;
  bundleIdentifier: string;
}

const shellQuote = (value: string) => `'${value.replaceAll("'", "'\"'\"'")}'`;

const terminalCommand = ({ cwd, agent }: TerminalCommandInput) =>
  [
    `cd ${shellQuote(cwd)}`,
    `MAXMEM_AGENT=${shellQuote(agent)} MAXMEM_LAUNCH=1 ${shellQuote(agentCommand({ agent }))}`,
  ].join(" && ");

const runAppleScript = ({ lines }: AppleScriptInput) =>
  spawnSync(
    "osascript",
    lines.flatMap((line) => ["-e", line]),
    {
      stdio: "ignore",
    },
  );

const isCodeIntegratedTerminal = () =>
  process.env.TERM_PROGRAM === "vscode" || !!process.env.VSCODE_INJECTION;

const codeBundleIdentifier = () => process.env.__CFBundleIdentifier ?? "com.microsoft.VSCode";

const codeTerminalScript = ({ command, bundleIdentifier }: CodeTerminalInput) => [
  `tell application id ${JSON.stringify(bundleIdentifier)} to activate`,
  "delay 0.2",
  "set previousClipboard to the clipboard",
  `set the clipboard to ${JSON.stringify(command)}`,
  'tell application "System Events"',
  "key code 50 using {control down, shift down}",
  "delay 0.2",
  'keystroke "v" using {command down}',
  "delay 0.1",
  "key code 36",
  "delay 0.1",
  "end tell",
  "set the clipboard to previousClipboard",
];

const openCodeIntegratedTerminal = ({ command }: OpenTerminalInput) =>
  runAppleScript({
    lines: codeTerminalScript({
      command,
      bundleIdentifier: codeBundleIdentifier(),
    }),
  });

const openMacTerminalApp = ({ command }: OpenTerminalInput) =>
  spawnSync(
    "osascript",
    [
      "-e",
      'tell application "Terminal"',
      "-e",
      "activate",
      "-e",
      `do script ${JSON.stringify(command)}`,
      "-e",
      "end tell",
    ],
    {
      stdio: "ignore",
    },
  );

const openMacTerminal = ({ command }: OpenTerminalInput) =>
  isCodeIntegratedTerminal()
    ? openCodeIntegratedTerminal({ command })
    : openMacTerminalApp({ command });

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
  goal,
  sourceAgent = agent,
  sameWindow,
}: LaunchAgentInput) => {
  const resolvedCwd = resolve(cwd);

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

  const command = terminalCommand({ cwd: resolvedCwd, agent });
  const result = sameWindow
    ? spawnSync(agentCommand({ agent }), [], { cwd: resolvedCwd, stdio: "inherit" })
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
