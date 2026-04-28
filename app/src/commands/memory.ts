import { optionValue } from "../cli/options";
import { getGitContext } from "../core/git";
import { listProjectMemory, saveProjectMemory } from "../core/store";

export interface MemoryCommandInput {
  args: string[];
  cwd: string;
}

interface PositionalInput {
  args: string[];
}

const valueOptionNames = new Set(["add", "kind", "limit"]);

const isOptionValue = ({ args }: PositionalInput, index: number) => {
  const previous = args.at(index - 1) ?? "";

  return [...valueOptionNames].some((name) => previous === `--${name}`);
};

const positionalContent = ({ args }: PositionalInput) =>
  args
    .filter((arg, index) => !arg.startsWith("--") && !isOptionValue({ args }, index))
    .join(" ")
    .trim();

const selectedLimit = (args: string[]) => Number(optionValue({ args, name: "limit" }) ?? 20) || 20;

export const runMemoryCommand = ({ args, cwd }: MemoryCommandInput) => {
  const git = getGitContext({ cwd });
  const kind = optionValue({ args, name: "kind" }) ?? "note";
  const content = optionValue({ args, name: "add" }) ?? positionalContent({ args });
  const filterKind = content ? undefined : optionValue({ args, name: "kind" });
  const saved = content
    ? saveProjectMemory({
        repoRoot: git.repoRoot,
        kind,
        content,
        source: "cli",
      })
    : undefined;
  const memory = listProjectMemory({
    repoRoot: git.repoRoot,
    limit: selectedLimit(args),
    ...(filterKind ? { kind: filterKind } : {}),
  });

  if (saved) {
    console.log(`Saved ${saved.kind}: ${saved.content}`);
    console.log("");
  }

  console.log(`Project memory for ${git.repoRoot}`);
  memory.map((record) =>
    console.log(`- ${record.kind}: ${record.content} (${record.source}, ${record.updatedAt})`),
  );

  if (!memory.length) {
    console.log("- No project memory recorded");
  }
};
