import { randomUUID } from "node:crypto";
import type { Agent } from "./types";
import { createCapsule, getInjectionContext } from "./capsule";
import { getGitContext } from "./git";
import { saveSession } from "./store";

export interface HookHandlerInput {
  agent: Agent;
}

interface SessionHookInput {
  session_id?: string;
  transcript_path?: string;
  cwd?: string;
  hook_event_name?: string;
  source?: string;
  workspace?: {
    current_dir?: string;
    project_dir?: string;
  };
}

interface StatusLineInput {
  cwd?: string;
  session_id?: string;
  transcript_path?: string;
  model?: {
    display_name?: string;
  };
  workspace?: {
    current_dir?: string;
    project_dir?: string;
  };
}

const readHookInput = async <T>() => JSON.parse(await Bun.stdin.text()) as T;

const cwdFromHook = (input: SessionHookInput | StatusLineInput) =>
  input.cwd ?? input.workspace?.current_dir ?? input.workspace?.project_dir ?? process.cwd();

const jsonOutput = (additionalContext: string) => ({
  hookSpecificOutput: {
    hookEventName: "SessionStart",
    additionalContext,
  },
});

const saveHookSession = ({ input, agent }: { input: SessionHookInput; agent: Agent }) => {
  const cwd = cwdFromHook(input);
  const git = getGitContext({ cwd });
  const timestamp = new Date().toISOString();

  saveSession({
    session: {
      id: input.session_id ?? randomUUID(),
      agent,
      cwd,
      repoRoot: git.repoRoot,
      branch: git.branch,
      transcriptPath: input.transcript_path ?? "",
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  });

  return cwd;
};

export const handleSessionStartHook = async ({ agent }: HookHandlerInput) => {
  const input = await readHookInput<SessionHookInput>();
  const cwd = saveHookSession({ input, agent });
  const additionalContext = getInjectionContext({ cwd });

  if (additionalContext) {
    console.log(JSON.stringify(jsonOutput(additionalContext)));
  }
};

export const handleStopHook = async ({ agent }: HookHandlerInput) => {
  const input = await readHookInput<SessionHookInput>();
  const cwd = cwdFromHook(input);

  createCapsule({ agent, cwd, goal: `Continue work from the last ${agent} session.` });
};

export const handleClaudeStatusLine = async () => {
  const input = await readHookInput<StatusLineInput>();
  const cwd = cwdFromHook(input);
  const git = getGitContext({ cwd });
  const model = input.model?.display_name ?? "Claude";
  const repo = git.repoRoot.split("/").at(-1) ?? git.repoRoot;
  const changed = git.changedFiles.length ? `${git.changedFiles.length} changed` : "clean";

  console.log(`maxMEM ${repo} ${git.branch} ${changed} | ${model}`);
};
