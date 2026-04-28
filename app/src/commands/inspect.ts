import { agentFromValue } from "../core/agents";
import { renderCapsule } from "../core/capsule";
import { getGitContext } from "../core/git";
import { redactList } from "../core/redaction";
import { getLatestCapsule, getLatestSession } from "../core/store";
import { parseTranscript } from "../core/transcript";
import type { Agent } from "../core/types";
import { resolveVerbosity } from "../core/verbosity";
import { hasFlag, optionValue } from "../cli/options";

export interface InspectCommandInput {
  args: string[];
  cwd: string;
}

interface RenderListInput {
  title: string;
  items: string[];
  empty: string;
}

interface SelectedAgentInput {
  args: string[];
  fallback?: Agent;
}

const renderList = ({ title, items, empty }: RenderListInput) =>
  [
    `${title}:`,
    ...(items.length ? redactList({ values: items }).map((item) => `- ${item}`) : [`- ${empty}`]),
  ].join("\n");

const selectedAgent = ({ args, fallback = "codex" }: SelectedAgentInput) =>
  agentFromValue({ value: optionValue({ args, name: "agent" }), fallback });

export const runInspectCommand = ({ args, cwd }: InspectCommandInput) => {
  const git = getGitContext({ cwd });
  const capsule = getLatestCapsule({ repoRoot: git.repoRoot, branch: git.branch });
  const fallbackAgent = capsule?.sourceAgent ?? "codex";
  const agent = selectedAgent({ args, fallback: fallbackAgent });
  const session = getLatestSession({ repoRoot: git.repoRoot, agent });
  const transcriptPath =
    optionValue({ args, name: "transcript" }) ??
    session?.transcriptPath ??
    capsule?.transcriptPath ??
    "";
  const verbosity = resolveVerbosity({ preset: optionValue({ args, name: "verbosity" }) });
  const transcript = parseTranscript({
    path: transcriptPath,
    agent,
    verbosity: verbosity.preset,
  });

  console.log("MaxMEM inspect");
  console.log(`Repo: ${git.repoRoot}`);
  console.log(`Branch: ${git.branch}`);
  console.log(`Agent: ${agent}`);
  console.log(`Latest session: ${session ? session.updatedAt : "none"}`);
  console.log(
    `Latest capsule: ${capsule ? `${capsule.sourceAgent} ${capsule.createdAt}` : "none"}`,
  );
  console.log(`Transcript: ${transcript.path || "none"}`);
  console.log(`Parser: ${transcript.parser}`);
  console.log(`Lines: ${transcript.lineCount}`);
  console.log(`Messages: ${transcript.messageCount}`);
  console.log(`Tool calls: ${transcript.toolCallCount}`);
  console.log("");
  console.log(renderList({ title: "Files", items: transcript.files, empty: "No files detected" }));
  console.log("");
  console.log(
    renderList({ title: "Commands", items: transcript.commands, empty: "No commands detected" }),
  );
  console.log("");
  console.log(
    renderList({
      title: "Decisions",
      items: transcript.decisions,
      empty: "No decisions detected",
    }),
  );
  console.log("");
  console.log(
    renderList({ title: "Blockers", items: transcript.blockers, empty: "No blockers detected" }),
  );
  console.log("");
  console.log(
    renderList({
      title: "Next actions",
      items: transcript.nextActions,
      empty: "No next actions detected",
    }),
  );
  console.log("");
  console.log(
    renderList({
      title: "Verification",
      items: transcript.tests,
      empty: "No verification commands detected",
    }),
  );
  console.log("");
  console.log(
    renderList({
      title: "Open questions",
      items: transcript.openQuestions,
      empty: "No open questions detected",
    }),
  );
  console.log("");
  console.log(renderList({ title: "Risks", items: transcript.risks, empty: "No risks detected" }));

  if (hasFlag({ args, name: "capsule" }) && capsule) {
    console.log("");
    console.log(renderCapsule({ capsule }));
  }
};
