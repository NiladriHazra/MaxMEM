import { spawnSync } from "node:child_process";

export interface CopyTextInput {
  text: string;
}

export const copyText = ({ text }: CopyTextInput) => {
  const result = spawnSync("pbcopy", [], { input: text, encoding: "utf8" });

  return !(result.status ?? 1);
};
