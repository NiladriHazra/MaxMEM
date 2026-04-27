import { spawnSync } from "node:child_process";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import type { Agent } from "./types";
import { createCapsule, renderCapsule } from "./capsule";
import { getGitContext } from "./git";
import { getLatestCapsule } from "./store";

export interface RunWrapperInput {
  agent: Agent;
  args: string[];
  cwd: string;
}

interface BannerInput {
  agent: Agent;
  cwd: string;
}

interface PromptChoiceInput {
  agent: Agent;
  cwd: string;
}

const agentCommand: Record<Agent, string> = {
  codex: "codex",
  claude: "claude",
  opencode: "opencode",
};

const label: Record<Agent, string> = {
  codex: "Codex",
  claude: "Claude Code",
  opencode: "OpenCode",
};

const renderBanner = ({ agent, cwd }: BannerInput) => {
  const git = getGitContext({ cwd });
  const capsule = getLatestCapsule({ repoRoot: git.repoRoot, branch: git.branch });
  const synced = capsule
    ? `handoff ${new Date(capsule.createdAt).toLocaleString()}`
    : "no handoff yet";
  const repo = git.isRepo ? git.repoRoot.split("/").at(-1) : git.repoRoot;

  return [
    "",
    `maxMEM | ${repo} | ${git.branch} | ${label[agent]} | ${synced}`,
    "[Enter] launch  [h] save handoff  [v] view latest  [q] quit",
    "",
  ].join("\n");
};

const readChoice = async () => {
  if (!input.isTTY) {
    return "";
  }

  const rl = createInterface({ input, output });
  const answer = await rl.question("maxMEM> ");
  rl.close();

  return answer.trim().toLowerCase();
};

const handleChoice = async ({ agent, cwd }: PromptChoiceInput) => {
  const choice = await readChoice();

  if (choice === "q") {
    return false;
  }

  if (choice === "h") {
    const capsule = createCapsule({ agent, cwd, goal: `Continue work from ${label[agent]}.` });
    console.log(renderCapsule({ capsule }));
    return true;
  }

  if (choice === "v") {
    const git = getGitContext({ cwd });
    const capsule = getLatestCapsule({ repoRoot: git.repoRoot, branch: git.branch });
    console.log(capsule ? renderCapsule({ capsule }) : "No handoff capsule found for this repo.");
    return true;
  }

  return true;
};

export const runWrapper = async ({ agent, args, cwd }: RunWrapperInput) => {
  console.log(renderBanner({ agent, cwd }));

  const shouldLaunch = await handleChoice({ agent, cwd });

  if (!shouldLaunch) {
    return 0;
  }

  const result = spawnSync(agentCommand[agent], args, {
    cwd,
    env: { ...process.env, MAXMEM_AGENT: agent, MAXMEM_WRAPPER: "1" },
    stdio: "inherit",
  });

  if (result.error) {
    console.error(`Could not launch ${agentCommand[agent]}. Install it or run the agent directly.`);
    return 1;
  }

  return result.status ?? 0;
};
