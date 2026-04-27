import { randomUUID } from "node:crypto";
import type { Agent, GitContext, HandoffCapsule } from "./types";
import { getGitContext } from "./git";
import { getLatestCapsule, saveCapsule } from "./store";

export interface CreateCapsuleInput {
  agent: Agent;
  cwd: string;
  goal?: string;
}

export interface InjectionContextInput {
  cwd: string;
}

interface RenderListInput {
  title: string;
  items: string[];
  empty: string;
}

interface RenderCapsuleInput {
  capsule: HandoffCapsule;
}

const cleanGoal = (goal: string | undefined) =>
  goal?.trim() || "Continue the current implementation safely.";

const summarizeGit = (git: GitContext) => {
  if (!git.isRepo) {
    return "No git repository detected. Continue from the current working directory state.";
  }

  const changed = git.changedFiles.length
    ? `${git.changedFiles.length} changed file(s)`
    : "no changed files";
  const head = git.head ? ` at ${git.head}` : "";

  return `Repository ${git.repoRoot} on ${git.branch}${head}; ${changed}.`;
};

const nextPrompt = ({ goal, git }: { goal: string; git: GitContext }) =>
  [
    `Continue this task: ${goal}`,
    git.changedFiles.length
      ? `Start by inspecting: ${git.changedFiles.slice(0, 6).join(", ")}.`
      : "Start by checking the current repo status.",
    "Preserve existing user changes and do not export raw chat unless explicitly asked.",
  ].join(" ");

export const createCapsule = ({ agent, cwd, goal }: CreateCapsuleInput) => {
  const git = getGitContext({ cwd });
  const resolvedGoal = cleanGoal(goal);
  const capsule: HandoffCapsule = {
    id: randomUUID(),
    repoRoot: git.repoRoot,
    branch: git.branch,
    sourceAgent: agent,
    goal: resolvedGoal,
    summary: summarizeGit(git),
    files: git.changedFiles,
    commands: [],
    decisions: ["Use a compact handoff capsule instead of raw chat by default."],
    blockers: [],
    nextPrompt: nextPrompt({ goal: resolvedGoal, git }),
    git,
    createdAt: new Date().toISOString(),
  };

  saveCapsule({ capsule });

  return capsule;
};

const renderList = ({ title, items, empty }: RenderListInput) =>
  [`${title}:`, ...(items.length ? items.map((item) => `- ${item}`) : [`- ${empty}`])].join("\n");

export const renderCapsule = ({ capsule }: RenderCapsuleInput) =>
  [
    "<maxmem_handoff>",
    `Source agent: ${capsule.sourceAgent}`,
    `Created: ${capsule.createdAt}`,
    `Repo: ${capsule.repoRoot}`,
    `Branch: ${capsule.branch}`,
    `Goal: ${capsule.goal}`,
    "",
    `Summary: ${capsule.summary}`,
    "",
    renderList({
      title: "Changed files",
      items: capsule.files,
      empty: "No changed files detected",
    }),
    "",
    renderList({
      title: "Recent commits",
      items: capsule.git.recentCommits,
      empty: "No recent commits found",
    }),
    "",
    renderList({ title: "Decisions", items: capsule.decisions, empty: "No decisions recorded" }),
    "",
    renderList({ title: "Blockers", items: capsule.blockers, empty: "No blockers recorded" }),
    "",
    "Next recommended prompt:",
    capsule.nextPrompt,
    "",
    "Privacy:",
    "- Raw chat included: false",
    "- Secrets redaction: capsule avoids transcript export by default",
    "</maxmem_handoff>",
  ].join("\n");

export const getInjectionContext = ({ cwd }: InjectionContextInput) => {
  const git = getGitContext({ cwd });
  const capsule = getLatestCapsule({ repoRoot: git.repoRoot, branch: git.branch });

  return capsule
    ? [
        "MaxMEM found a previous handoff capsule for this repository.",
        "Use it as continuation context, but trust the filesystem and git state over the capsule if they disagree.",
        "",
        renderCapsule({ capsule }),
      ].join("\n")
    : "";
};
