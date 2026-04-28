import { randomUUID } from "node:crypto";
import type {
  Agent,
  ExportOptions,
  GitContext,
  HandoffCapsule,
  ProjectMemoryRecord,
  TranscriptSummary,
} from "./types";
import { getGitContext } from "./git";
import {
  getLatestCapsule,
  getLatestSession,
  listProjectMemory,
  recordHandoffRead,
  saveCapsule,
  saveProjectMemory,
} from "./store";
import { redactList, redactText } from "./redaction";
import { parseTranscript } from "./transcript";
import { resolveVerbosity, type VerbosityConfig } from "./verbosity";
import { renderAgentContext, renderCapsule } from "./capsuleRender";

export { renderAgentContext, renderCapsule } from "./capsuleRender";

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
  consumerAgent?: Agent | "unknown";
  source?: string;
}

interface NextPromptInput {
  goal: string;
  git: GitContext;
}

interface MergeItemsInput {
  primary: string[];
  fallback: string[];
}

interface BuildTaskStateInput {
  goal: string;
  git: GitContext;
  transcript: TranscriptSummary;
}

interface RememberCapsuleInput {
  capsule: HandoffCapsule;
}

interface ProjectMemoryContextInput {
  git: GitContext;
  memory: ProjectMemoryRecord[];
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

const verificationCommands = (commands: string[]) =>
  commands.filter((command) => /\b(test|lint|typecheck|tsc|build|verify|check)\b/i.test(command));

const limited = (values: string[]) => values.slice(0, 12);

const buildTaskState = ({ goal, git, transcript }: BuildTaskStateInput) => {
  const verification = mergeItems({
    primary: transcript.tests,
    fallback: verificationCommands(transcript.commands),
  });

  return {
    currentTask: goal,
    nextActions: limited(
      mergeItems({
        primary: transcript.nextActions,
        fallback: [
          git.changedFiles.length
            ? `Review changed files: ${git.changedFiles.slice(0, 6).join(", ")}`
            : "Check git status and confirm the current work state.",
        ],
      }),
    ),
    openQuestions: limited(transcript.openQuestions),
    verification: limited(
      verification.length ? verification : ["Run project checks before handing off."],
    ),
    risks: limited(mergeItems({ primary: transcript.risks, fallback: transcript.blockers })),
  };
};

const rememberCapsule = ({ capsule }: RememberCapsuleInput) => {
  const source = `capsule:${capsule.sourceAgent}`;
  const records = [
    { kind: "current_task", content: capsule.goal },
    ...capsule.decisions.map((content) => ({ kind: "decision", content })),
    ...capsule.blockers.map((content) => ({ kind: "blocker", content })),
    ...capsule.taskState.risks.map((content) => ({ kind: "risk", content })),
  ];

  records.map(({ kind, content }) =>
    saveProjectMemory({
      repoRoot: capsule.repoRoot,
      kind,
      content,
      source,
    }),
  );
};

const renderProjectMemoryContext = ({ git, memory }: ProjectMemoryContextInput) =>
  [
    "# MaxMEM Project Memory",
    "",
    "Use this as durable repository memory. Trust the live filesystem and git state over memory if they disagree.",
    "",
    `Repo: ${git.repoRoot}`,
    `Branch: ${git.branch}`,
    "",
    "## Memory",
    ...memory.map((record) => `- ${record.kind}: ${record.content} (${record.source})`),
  ].join("\n");

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
    taskState: buildTaskState({ goal: resolvedGoal, git, transcript }),
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
  rememberCapsule({ capsule });

  return capsule;
};

export const getInjectionContext = ({
  cwd,
  consumerAgent = "unknown",
  source = "inject",
}: InjectionContextInput) => {
  const git = getGitContext({ cwd });
  const capsule = getLatestCapsule({ repoRoot: git.repoRoot, branch: git.branch });
  const memory = listProjectMemory({ repoRoot: git.repoRoot, limit: 8 });

  if (!capsule) {
    return memory.length
      ? [
          "MaxMEM found project memory for this repository.",
          "No previous handoff capsule was found.",
          "",
          renderProjectMemoryContext({ git, memory }),
        ].join("\n")
      : "";
  }

  recordHandoffRead({
    capsuleId: capsule.id,
    repoRoot: capsule.repoRoot,
    branch: capsule.branch,
    consumerAgent,
    source,
  });

  return [
    "MaxMEM found a previous handoff capsule for this repository.",
    "The handoff below is formatted for agent context.",
    "",
    renderAgentContext({ capsule, memory }),
  ].join("\n");
};
