import { redactList } from "./redaction";
import type { ExportOptions, HandoffCapsule, ProjectMemoryRecord } from "./types";
import { resolveVerbosity, type VerbosityConfig } from "./verbosity";

interface RenderCapsuleInput {
  capsule: HandoffCapsule;
  options?: Partial<ExportOptions>;
  memory?: ProjectMemoryRecord[];
}

interface RenderListInput {
  title: string;
  items: string[];
  empty: string;
}

interface RenderPrivacyInput {
  options: ExportOptions;
  preset: string;
}

interface RenderMemoryInput {
  memory: ProjectMemoryRecord[];
}

interface ResolveOptionsInput {
  options?: Partial<ExportOptions> | undefined;
  verbosity: VerbosityConfig;
}

const resolveOptions = ({ options, verbosity }: ResolveOptionsInput) => ({
  ...verbosity.exportOptions,
  ...options,
});

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

const renderTaskState = (capsule: HandoffCapsule) => [
  "## Task State",
  `Current task: ${capsule.taskState.currentTask}`,
  "",
  renderList({
    title: "Next actions",
    items: capsule.taskState.nextActions,
    empty: "No next actions recorded",
  }),
  "",
  renderList({
    title: "Verification",
    items: capsule.taskState.verification,
    empty: "No verification commands recorded",
  }),
  "",
  renderList({
    title: "Open questions",
    items: capsule.taskState.openQuestions,
    empty: "No open questions recorded",
  }),
  "",
  renderList({
    title: "Risks",
    items: capsule.taskState.risks,
    empty: "No risks recorded",
  }),
];

const renderMemory = ({ memory }: RenderMemoryInput) =>
  memory.length
    ? [
        "## Project Memory",
        ...memory.map(
          (record) => `- ${record.kind}: ${record.content} (${record.source}, ${record.updatedAt})`,
        ),
        "",
      ]
    : [];

export const renderAgentContext = ({ capsule, memory = [] }: RenderCapsuleInput) => {
  const renderOptions = resolveOptions({
    options: { rawChat: false },
    verbosity: resolveVerbosity(),
  });

  return [
    "# MaxMEM Handoff",
    "",
    "Use this as continuation context. Trust the live filesystem and git state over this capsule if they disagree.",
    "",
    "## Source",
    `- Agent: ${capsule.sourceAgent}`,
    `- Created: ${capsule.createdAt}`,
    `- Repo: ${capsule.repoRoot}`,
    `- Branch: ${capsule.branch}`,
    `- Goal: ${capsule.goal}`,
    "",
    "## Summary",
    capsule.summary,
    "",
    ...renderTaskState(capsule),
    "",
    ...renderMemory({ memory }),
    ...(renderOptions.files
      ? [
          renderList({
            title: "## Changed Files",
            items: capsule.files,
            empty: "No changed files detected",
          }),
          "",
        ]
      : []),
    renderList({
      title: "## Recent Commits",
      items: capsule.git.recentCommits,
      empty: "No recent commits found",
    }),
    "",
    ...(renderOptions.commands
      ? [
          renderList({
            title: "## Commands",
            items: capsule.commands,
            empty: "No commands recorded",
          }),
          "",
        ]
      : []),
    ...(renderOptions.decisions
      ? [
          renderList({
            title: "## Decisions",
            items: capsule.decisions,
            empty: "No decisions recorded",
          }),
          "",
        ]
      : []),
    ...(renderOptions.blockers
      ? [
          renderList({
            title: "## Blockers",
            items: capsule.blockers,
            empty: "No blockers recorded",
          }),
          "",
        ]
      : []),
    "## Next Prompt",
    capsule.nextPrompt,
    "",
    "## Privacy",
    `- Verbosity preset: ${capsule.privacy.preset}`,
    "- Raw chat included: false",
    "- Secrets redaction: enabled",
  ].join("\n");
};

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
    ...renderTaskState(capsule),
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
