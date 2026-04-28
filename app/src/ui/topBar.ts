import { agentLabels } from "../core/agents";
import type { Agent } from "../core/types";

export interface TopBarInput {
  agent: Agent;
  repo: string;
  branch: string;
  status: string;
  synced: string;
}

interface FitInput {
  value: string;
  width: number;
}

const visibleLength = (value: string) => value.length;

const fit = ({ value, width }: FitInput) =>
  visibleLength(value) > width ? `${value.slice(0, Math.max(width - 3, 1))}...` : value;

export const terminalTitle = ({ agent, repo, branch, status }: TopBarInput) =>
  `maxMEM - ${repo} - ${branch} - ${agentLabels[agent]} - ${status}`;

export const renderTopBar = (input: TopBarInput) => {
  const width = process.stdout.columns || 96;
  const left = ` maxMEM  ${input.repo}  ${input.branch} `;
  const right = ` ${agentLabels[input.agent]}  ${input.status}  ${input.synced} `;
  const gap = " ".repeat(Math.max(width - visibleLength(left) - visibleLength(right), 1));
  const line = fit({ value: `${left}${gap}${right}`, width });

  return `\x1b]0;${terminalTitle(input)}\x07\x1b[7m${line.padEnd(width)}\x1b[0m`;
};
