import { renderCapsule } from "../core/capsule";
import { getGitContext } from "../core/git";
import {
  getLatestCapsule,
  getLatestSession,
  listHandoffReads,
  listProjectMemory,
} from "../core/store";

export interface ShowStatusInput {
  cwd: string;
  verbose: boolean;
}

export const showStatus = ({ cwd, verbose }: ShowStatusInput) => {
  const git = getGitContext({ cwd });
  const capsule = getLatestCapsule({ repoRoot: git.repoRoot, branch: git.branch });
  const session = getLatestSession({ repoRoot: git.repoRoot });
  const memory = listProjectMemory({ repoRoot: git.repoRoot, limit: 5 });
  const reads = listHandoffReads({ repoRoot: git.repoRoot, limit: 5 });

  console.log(`Repo: ${git.repoRoot}`);
  console.log(`Branch: ${git.branch}`);
  console.log(`Changed files: ${git.changedFiles.length}`);
  console.log(`Latest session: ${session ? `${session.agent} ${session.updatedAt}` : "none"}`);
  console.log(
    `Latest handoff: ${capsule ? `${capsule.sourceAgent} ${capsule.createdAt}` : "none"}`,
  );
  console.log(`Project memory: ${memory.length}`);
  console.log(`Handoff reads: ${reads.length}`);

  if (verbose && capsule) {
    console.log("");
    console.log("Project memory:");
    memory.map((record) => console.log(`- ${record.kind}: ${record.content}`));
    console.log("");
    console.log("Recent handoff reads:");
    reads.map((read) =>
      console.log(`- ${read.consumerAgent} via ${read.source} at ${read.readAt}`),
    );
    console.log("");
    console.log(renderCapsule({ capsule }));
  }
};
