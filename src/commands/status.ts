import { renderCapsule } from "../core/capsule";
import { getGitContext } from "../core/git";
import { getLatestCapsule, getLatestSession } from "../core/store";

export interface ShowStatusInput {
  cwd: string;
  verbose: boolean;
}

export const showStatus = ({ cwd, verbose }: ShowStatusInput) => {
  const git = getGitContext({ cwd });
  const capsule = getLatestCapsule({ repoRoot: git.repoRoot, branch: git.branch });
  const session = getLatestSession({ repoRoot: git.repoRoot });

  console.log(`Repo: ${git.repoRoot}`);
  console.log(`Branch: ${git.branch}`);
  console.log(`Changed files: ${git.changedFiles.length}`);
  console.log(`Latest session: ${session ? `${session.agent} ${session.updatedAt}` : "none"}`);
  console.log(
    `Latest handoff: ${capsule ? `${capsule.sourceAgent} ${capsule.createdAt}` : "none"}`,
  );

  if (verbose && capsule) {
    console.log("");
    console.log(renderCapsule({ capsule }));
  }
};
