import { spawnSync } from "node:child_process";
import type { Agent } from "./types";

export type TranscriptParserName = Agent;

export interface AgentAdapter {
  agent: Agent;
  label: string;
  command: string;
  transcriptParser: TranscriptParserName;
  sessionStartHook?: string;
  stopHook: string;
  statusLine?: string;
}

export interface AgentFromValueInput {
  value: string | undefined;
  fallback?: Agent;
}

interface AgentCommandInput {
  agent: Agent;
}

export const agents = ["codex", "claude", "opencode"] as const;

export const defaultAgent = "codex" satisfies Agent;

export const agentAdapters: Record<Agent, AgentAdapter> = {
  codex: {
    agent: "codex",
    label: "Codex",
    command: "codex",
    transcriptParser: "codex",
    sessionStartHook: "codex-session-start",
    stopHook: "codex-stop",
  },
  claude: {
    agent: "claude",
    label: "Claude Code",
    command: "claude",
    transcriptParser: "claude",
    sessionStartHook: "claude-session-start",
    stopHook: "claude-stop",
    statusLine: "claude",
  },
  opencode: {
    agent: "opencode",
    label: "OpenCode",
    command: "opencode",
    transcriptParser: "opencode",
    stopHook: "opencode-stop",
  },
};

const commandEnvNames = {
  claude: "MAXMEM_CLAUDE_COMMAND",
  codex: "MAXMEM_CODEX_COMMAND",
  opencode: "MAXMEM_OPENCODE_COMMAND",
} satisfies Record<Agent, string>;

const commandCandidates = {
  claude: ["claude-yolo", "claude"],
  codex: ["codex"],
  opencode: ["opencode"],
} satisfies Record<Agent, string[]>;

const hasCommand = (command: string) => !spawnSync("which", [command], { stdio: "ignore" }).status;

export const agentCommand = ({ agent }: AgentCommandInput) =>
  process.env[commandEnvNames[agent]] ??
  commandCandidates[agent].find(hasCommand) ??
  agentAdapters[agent].command;

export const agentLabels = Object.fromEntries(
  agents.map((agent) => [agent, agentAdapters[agent].label]),
) as Record<Agent, string>;

export const isAgent = (value: string) => agents.some((agent) => agent === value);

export const agentFromValue = ({ value, fallback = defaultAgent }: AgentFromValueInput) =>
  value && isAgent(value) ? (value as Agent) : fallback;

export const agentBySessionStartHook = (hook: string) =>
  agents.find((agent) => agentAdapters[agent].sessionStartHook === hook);

export const agentByStopHook = (hook: string) =>
  agents.find((agent) => agentAdapters[agent].stopHook === hook);
