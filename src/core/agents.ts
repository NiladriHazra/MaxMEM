import type { Agent } from "./types";

export const agents = ["codex", "claude", "opencode"] as const;

export const agentCommands: Record<Agent, string> = {
  codex: "codex",
  claude: "claude",
  opencode: "opencode",
};

export const agentLabels: Record<Agent, string> = {
  codex: "Codex",
  claude: "Claude Code",
  opencode: "OpenCode",
};

export const isAgent = (value: string) => agents.some((agent) => agent === value);
