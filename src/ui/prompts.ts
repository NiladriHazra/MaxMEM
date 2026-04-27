import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import type { ExportOptions } from "../core/types";
import { defaultExportOptions } from "../core/capsule";

export interface AskInput {
  prompt: string;
}

export interface AskBooleanInput {
  prompt: string;
  defaultValue: boolean;
}

const answer = async ({ prompt }: AskInput) => {
  const rl = createInterface({ input, output });
  const value = await rl.question(prompt);
  rl.close();

  return value.trim();
};

export const ask = async ({ prompt }: AskInput) => {
  if (!input.isTTY) {
    return "";
  }

  return answer({ prompt });
};

export const askBoolean = async ({ prompt, defaultValue }: AskBooleanInput) => {
  const suffix = defaultValue ? "Y/n" : "y/N";
  const value = (await ask({ prompt: `${prompt} (${suffix}) ` })).toLowerCase();

  if (!value) {
    return defaultValue;
  }

  return value === "y" || value === "yes";
};

export const selectExportOptions = async () => {
  const defaults = defaultExportOptions();

  return {
    files: await askBoolean({ prompt: "Include changed files?", defaultValue: defaults.files }),
    commands: await askBoolean({ prompt: "Include commands?", defaultValue: defaults.commands }),
    decisions: await askBoolean({ prompt: "Include decisions?", defaultValue: defaults.decisions }),
    blockers: await askBoolean({ prompt: "Include blockers?", defaultValue: defaults.blockers }),
    rawChat: await askBoolean({
      prompt: "Include raw chat snippets?",
      defaultValue: defaults.rawChat,
    }),
  } satisfies ExportOptions;
};
