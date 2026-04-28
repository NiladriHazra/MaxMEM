export type Agent = "codex" | "claude" | "opencode";

export type CapsuleSection = "files" | "commands" | "decisions" | "blockers" | "rawChat";

export type VerbosityPreset = "compact" | "standard" | "full";

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
  preset: VerbosityPreset;
}

export interface HandoffTaskState {
  currentTask: string;
  nextActions: string[];
  openQuestions: string[];
  verification: string[];
  risks: string[];
}

export interface TranscriptSummary {
  path: string;
  agent: Agent;
  parser: string;
  lineCount: number;
  messageCount: number;
  toolCallCount: number;
  userMessages: string[];
  assistantMessages: string[];
  commands: string[];
  files: string[];
  decisions: string[];
  blockers: string[];
  nextActions: string[];
  openQuestions: string[];
  tests: string[];
  risks: string[];
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
  taskState: HandoffTaskState;
  rawChat: string[];
  transcriptPath: string;
  nextPrompt: string;
  git: GitContext;
  privacy: HandoffPrivacy;
  createdAt: string;
}

export interface ProjectMemoryRecord {
  id: string;
  repoRoot: string;
  kind: string;
  content: string;
  source: string;
  createdAt: string;
  updatedAt: string;
}

export interface HandoffReadRecord {
  id: string;
  capsuleId: string;
  repoRoot: string;
  branch: string;
  consumerAgent: Agent | "unknown";
  source: string;
  readAt: string;
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
