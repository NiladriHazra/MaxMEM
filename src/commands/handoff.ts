import { createCapsule, defaultExportOptions, renderCapsule } from "../core/capsule";
import { isAgent } from "../core/agents";
import type { Agent, ExportOptions } from "../core/types";
import { copyText } from "../platform/clipboard";
import { hasFlag, optionValue } from "../cli/options";
import { selectExportOptions } from "../ui/prompts";

export interface HandoffCommandInput {
  args: string[];
  cwd: string;
}

const selectedAgent = (args: string[]) => {
  const value = optionValue({ args, name: "agent" });

  return value && isAgent(value) ? (value as Agent) : "codex";
};

const flagOptions = (args: string[]) => ({
  files: !hasFlag({ args, name: "no-files" }),
  commands: !hasFlag({ args, name: "no-commands" }),
  decisions: !hasFlag({ args, name: "no-decisions" }),
  blockers: !hasFlag({ args, name: "no-blockers" }),
  rawChat: hasFlag({ args, name: "raw-chat" }),
});

const exportOptions = async (args: string[]) =>
  hasFlag({ args, name: "select" })
    ? await selectExportOptions()
    : ({ ...defaultExportOptions(), ...flagOptions(args) } satisfies ExportOptions);

export const runHandoffCommand = async ({ args, cwd }: HandoffCommandInput) => {
  const goal = optionValue({ args, name: "goal" });
  const options = await exportOptions(args);
  const capsule = createCapsule({
    agent: selectedAgent(args),
    cwd,
    options,
    ...(goal ? { goal } : {}),
  });
  const rendered = renderCapsule({ capsule, options });

  if (hasFlag({ args, name: "copy" })) {
    console.log(copyText({ text: rendered }) ? "Copied handoff capsule to clipboard." : rendered);
    return;
  }

  console.log(rendered);
};
