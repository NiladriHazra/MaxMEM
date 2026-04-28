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

export const agentCommands = Object.fromEntries(
  agents.map((agent) => [agent, agentAdapters[agent].command]),
) as Record<Agent, string>;

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
