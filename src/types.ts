export type Agent = "codex" | "claude" | "opencode";

export interface GitContext {
  cwd: string;
  repoRoot: string;
  isRepo: boolean;
  branch: string;
  head: string;
  status: string[];
  changedFiles: string[];
  diffStat: string;
  recentCommits: string[];
}

export interface HandoffCapsule {
  id: string;
  repoRoot: string;
  branch: string;
  sourceAgent: Agent;
  goal: string;
  summary: string;
  files: string[];
  commands: string[];
  decisions: string[];
  blockers: string[];
  nextPrompt: string;
  git: GitContext;
  createdAt: string;
}

export interface SessionRecord {
  id: string;
  agent: Agent;
  cwd: string;
  repoRoot: string;
  branch: string;
  transcriptPath: string;
  createdAt: string;
  updatedAt: string;
}
