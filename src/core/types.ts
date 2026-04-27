export type Agent = "codex" | "claude" | "opencode";

export type CapsuleSection = "files" | "commands" | "decisions" | "blockers" | "rawChat";

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

export interface HandoffPrivacy {
  includeRawChat: boolean;
  redacted: boolean;
}

export interface TranscriptSummary {
  path: string;
  userMessages: string[];
  assistantMessages: string[];
  commands: string[];
  files: string[];
  decisions: string[];
  blockers: string[];
  rawChat: string[];
}

export interface ExportOptions {
  files: boolean;
  commands: boolean;
  decisions: boolean;
  blockers: boolean;
  rawChat: boolean;
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
  rawChat: string[];
  transcriptPath: string;
  nextPrompt: string;
  git: GitContext;
  privacy: HandoffPrivacy;
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
