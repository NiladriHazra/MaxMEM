import { createCapsule, defaultExportOptions, renderCapsule } from "../core/capsule";
import { agentFromValue } from "../core/agents";
import type { ExportOptions } from "../core/types";
import { resolveVerbosity, type VerbosityConfig } from "../core/verbosity";
import { copyText } from "../platform/clipboard";
import { hasFlag, optionValue } from "../cli/options";
import { selectExportOptions } from "../ui/prompts";

export interface HandoffCommandInput {
  args: string[];
  cwd: string;
}

interface ExportOptionsInput {
  args: string[];
  verbosity: VerbosityConfig;
}

const selectedAgent = (args: string[]) => {
  const value = optionValue({ args, name: "agent" });

  return agentFromValue({ value });
};

const flagOptions = (args: string[]) => ({
  files: !hasFlag({ args, name: "no-files" }),
  commands: !hasFlag({ args, name: "no-commands" }),
  decisions: !hasFlag({ args, name: "no-decisions" }),
  blockers: !hasFlag({ args, name: "no-blockers" }),
  ...(hasFlag({ args, name: "raw-chat" }) ? { rawChat: true } : {}),
  ...(hasFlag({ args, name: "no-raw-chat" }) ? { rawChat: false } : {}),
});

const selectedVerbosity = (args: string[]) =>
  resolveVerbosity({ preset: optionValue({ args, name: "verbosity" }) });

const exportOptions = async ({ args, verbosity }: ExportOptionsInput) =>
  hasFlag({ args, name: "select" })
    ? await selectExportOptions({ defaults: verbosity.exportOptions })
    : ({
        ...defaultExportOptions(),
        ...verbosity.exportOptions,
        ...flagOptions(args),
      } satisfies ExportOptions);

export const runHandoffCommand = async ({ args, cwd }: HandoffCommandInput) => {
  const goal = optionValue({ args, name: "goal" });
  const verbosity = selectedVerbosity(args);
  const options = await exportOptions({ args, verbosity });
  const capsule = createCapsule({
    agent: selectedAgent(args),
    cwd,
    options,
    verbosity: verbosity.preset,
    ...(goal ? { goal } : {}),
  });
  const rendered = renderCapsule({ capsule, options });

  if (hasFlag({ args, name: "copy" })) {
    console.log(copyText({ text: rendered }) ? "Copied handoff capsule to clipboard." : rendered);
    return;
  }

  console.log(rendered);
};
