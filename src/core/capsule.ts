import { randomUUID } from "node:crypto";
import type { Agent, ExportOptions, GitContext, HandoffCapsule } from "./types";
import { getGitContext } from "./git";
import { getLatestCapsule, getLatestSession, saveCapsule } from "./store";
import { redactList, redactText } from "./redaction";
import { parseTranscript } from "./transcript";
import { resolveVerbosity, type VerbosityConfig } from "./verbosity";

export interface CreateCapsuleInput {
  agent: Agent;
  cwd: string;
  goal?: string;
  transcriptPath?: string;
  options?: Partial<ExportOptions>;
  verbosity?: string;
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
  options?: Partial<ExportOptions>;
}

interface NextPromptInput {
  goal: string;
  git: GitContext;
}

interface MergeItemsInput {
  primary: string[];
  fallback: string[];
}

interface RenderPrivacyInput {
  options: ExportOptions;
  preset: string;
}

interface ResolveOptionsInput {
  options?: Partial<ExportOptions> | undefined;
  verbosity: VerbosityConfig;
}

const cleanGoal = (goal: string | undefined) =>
  redactText({ text: goal?.trim() || "Continue the current implementation safely." });

export const defaultExportOptions = () => ({
  ...resolveVerbosity().exportOptions,
});

const resolveOptions = ({ options, verbosity }: ResolveOptionsInput) => ({
  ...verbosity.exportOptions,
  ...options,
});

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

const nextPrompt = ({ goal, git }: NextPromptInput) =>
  [
    `Continue this task: ${goal}`,
    git.changedFiles.length
      ? `Start by inspecting: ${git.changedFiles.slice(0, 6).join(", ")}.`
      : "Start by checking the current repo status.",
    "Preserve existing user changes and do not export raw chat unless explicitly asked.",
  ].join(" ");

const mergeItems = ({ primary, fallback }: MergeItemsInput) => [
  ...new Set(redactList({ values: [...primary, ...fallback] })),
];

export const createCapsule = ({
  agent,
  cwd,
  goal,
  transcriptPath,
  options,
  verbosity,
}: CreateCapsuleInput) => {
  const git = getGitContext({ cwd });
  const latestSession = getLatestSession({ repoRoot: git.repoRoot, agent });
  const resolvedTranscriptPath = transcriptPath ?? latestSession?.transcriptPath ?? "";
  const verbosityConfig = resolveVerbosity({ preset: verbosity });
  const transcript = parseTranscript({
    path: resolvedTranscriptPath,
    agent,
    verbosity: verbosityConfig.preset,
  });
  const resolvedGoal = cleanGoal(goal);
  const exportOptions = resolveOptions({ options, verbosity: verbosityConfig });
  const capsule: HandoffCapsule = {
    id: randomUUID(),
    repoRoot: git.repoRoot,
    branch: git.branch,
    sourceAgent: agent,
    goal: resolvedGoal,
    summary: summarizeGit(git),
    files: mergeItems({ primary: git.changedFiles, fallback: transcript.files }),
    commands: transcript.commands,
    decisions: mergeItems({
      primary: transcript.decisions,
      fallback: ["Use a compact handoff capsule instead of raw chat by default."],
    }),
    blockers: transcript.blockers,
    rawChat: exportOptions.rawChat ? transcript.rawChat : [],
    transcriptPath: resolvedTranscriptPath,
    nextPrompt: nextPrompt({ goal: resolvedGoal, git }),
    git,
    privacy: {
      includeRawChat: exportOptions.rawChat,
      redacted: true,
      preset: verbosityConfig.preset,
    },
    createdAt: new Date().toISOString(),
  };

  saveCapsule({ capsule });

  return capsule;
};

const renderList = ({ title, items, empty }: RenderListInput) =>
  [
    `${title}:`,
    ...(items.length ? redactList({ values: items }).map((item) => `- ${item}`) : [`- ${empty}`]),
  ].join("\n");

const renderPrivacy = ({ options, preset }: RenderPrivacyInput) => [
  "Privacy:",
  `- Verbosity preset: ${preset}`,
  `- Raw chat included: ${options.rawChat ? "true" : "false"}`,
  "- Secrets redaction: enabled",
];

export const renderCapsule = ({ capsule, options }: RenderCapsuleInput) => {
  const verbosityConfig = resolveVerbosity();
  const renderOptions = resolveOptions({ options, verbosity: verbosityConfig });

  return [
    "<maxmem_handoff>",
    `Source agent: ${capsule.sourceAgent}`,
    `Created: ${capsule.createdAt}`,
    `Repo: ${capsule.repoRoot}`,
    `Branch: ${capsule.branch}`,
    `Goal: ${capsule.goal}`,
    "",
    `Summary: ${capsule.summary}`,
    "",
    ...(renderOptions.files
      ? [
          renderList({
            title: "Changed files",
            items: capsule.files,
            empty: "No changed files detected",
          }),
          "",
        ]
      : []),
    "",
    renderList({
      title: "Recent commits",
      items: capsule.git.recentCommits,
      empty: "No recent commits found",
    }),
    "",
    ...(renderOptions.commands
      ? [
          renderList({ title: "Commands", items: capsule.commands, empty: "No commands recorded" }),
          "",
        ]
      : []),
    ...(renderOptions.decisions
      ? [
          renderList({
            title: "Decisions",
            items: capsule.decisions,
            empty: "No decisions recorded",
          }),
          "",
        ]
      : []),
    ...(renderOptions.blockers
      ? [
          renderList({ title: "Blockers", items: capsule.blockers, empty: "No blockers recorded" }),
          "",
        ]
      : []),
    ...(renderOptions.rawChat
      ? [
          renderList({ title: "Raw chat", items: capsule.rawChat, empty: "No raw chat included" }),
          "",
        ]
      : []),
    "Next recommended prompt:",
    capsule.nextPrompt,
    "",
    ...renderPrivacy({ options: renderOptions, preset: capsule.privacy.preset }),
    "</maxmem_handoff>",
  ].join("\n");
};

export const getInjectionContext = ({ cwd }: InjectionContextInput) => {
  const git = getGitContext({ cwd });
  const capsule = getLatestCapsule({ repoRoot: git.repoRoot, branch: git.branch });

  return capsule
    ? [
        "MaxMEM found a previous handoff capsule for this repository.",
        "Use it as continuation context, but trust the filesystem and git state over the capsule if they disagree.",
        "",
        renderCapsule({ capsule, options: { rawChat: false } }),
      ].join("\n")
    : "";
};
