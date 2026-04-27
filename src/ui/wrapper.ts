import { spawnSync } from "node:child_process";
import { stdin as input } from "node:process";
import { createCapsule, getInjectionContext, renderCapsule } from "../core/capsule";
import { getGitContext } from "../core/git";
import { getLatestCapsule } from "../core/store";
import type { Agent } from "../core/types";
import { ask, selectExportOptions } from "./prompts";
import { renderTopBar } from "./topBar";

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
  const status = git.changedFiles.length ? `${git.changedFiles.length} changed` : "clean";

  return [
    renderTopBar({ agent, repo: repo ?? git.repoRoot, branch: git.branch, status, synced }),
    "[Enter] launch  [h] handoff  [s] selective  [i] inject  [v] view  [q] quit",
    "",
  ].join("\n");
};

const readChoice = async () => {
  if (!input.isTTY) {
    return "";
  }

  return (await ask({ prompt: "maxMEM> " })).toLowerCase();
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

  if (choice === "s") {
    const options = await selectExportOptions();
    const capsule = createCapsule({
      agent,
      cwd,
      goal: `Continue work from ${label[agent]}.`,
      options,
    });
    console.log(renderCapsule({ capsule, options }));
    return true;
  }

  if (choice === "i") {
    console.log(getInjectionContext({ cwd }) || "No handoff capsule found for this repo.");
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
