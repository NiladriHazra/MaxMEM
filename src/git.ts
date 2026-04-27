import { basename } from "node:path";
import { commandOutput, runCommand } from "./process";

export interface GetGitContextInput {
  cwd: string;
}

interface GitCommandInput {
  cwd: string;
  args: string[];
}

const git = ({ cwd, args }: GitCommandInput) => runCommand({ command: "git", args, cwd });

const gitOutput = ({ cwd, args }: GitCommandInput) => commandOutput({ command: "git", args, cwd });

const lines = (value: string) =>
  value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

const changedFileFromStatus = (line: string) =>
  line.slice(3).trim().split(" -> ").at(-1) ?? line.slice(3).trim();

const noRepoContext = ({ cwd }: GetGitContextInput) => ({
  cwd,
  repoRoot: cwd,
  isRepo: false,
  branch: basename(cwd),
  head: "",
  status: [],
  changedFiles: [],
  diffStat: "",
  recentCommits: [],
});

export const getGitContext = ({ cwd }: GetGitContextInput) => {
  const root = git({ cwd, args: ["rev-parse", "--show-toplevel"] });

  if (root.exitCode) {
    return noRepoContext({ cwd });
  }

  const status = lines(gitOutput({ cwd, args: ["status", "--short"] }));
  const branch = gitOutput({ cwd, args: ["branch", "--show-current"] }) || "detached";
  const head = gitOutput({ cwd, args: ["rev-parse", "--short", "HEAD"] });
  const diffStat = gitOutput({ cwd, args: ["diff", "--stat"] });
  const recentCommits = lines(gitOutput({ cwd, args: ["log", "-5", "--oneline"] }));
  const changedFiles = status.map(changedFileFromStatus).filter(Boolean);

  return {
    cwd,
    repoRoot: root.stdout,
    isRepo: true,
    branch,
    head,
    status,
    changedFiles,
    diffStat,
    recentCommits,
  };
};
