import { agentFromValue } from "../core/agents";
import { launchAgent } from "../core/launch";
import { optionValue, hasFlag } from "../cli/options";

export interface LaunchCommandInput {
  args: string[];
  cwd: string;
  entryPath: string;
}

const targetAgent = (args: string[]) => agentFromValue({ value: args.at(0) });

const sourceAgent = (args: string[]) =>
  agentFromValue({ value: optionValue({ args, name: "from" }), fallback: targetAgent(args) });

export const runLaunchCommand = ({ args, cwd, entryPath }: LaunchCommandInput) => {
  const agent = targetAgent(args);
  const goal = optionValue({ args, name: "goal" });
  const result = launchAgent({
    agent,
    cwd,
    entryPath,
    sourceAgent: sourceAgent(args),
    sameWindow: hasFlag({ args, name: "same-window" }),
    ...(goal ? { goal } : {}),
  });

  console.log(result.message);
};
