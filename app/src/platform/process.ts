import { spawnSync } from "node:child_process";

export interface RunCommandInput {
  command: string;
  args: string[];
  cwd: string;
}

export const runCommand = ({ command, args, cwd }: RunCommandInput) => {
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  return {
    exitCode: result.status ?? 1,
    stdout: result.stdout,
    stderr: result.stderr,
    error: result.error,
  };
};

export const commandOutput = (input: RunCommandInput) => {
  const result = runCommand(input);

  return !result.exitCode ? result.stdout.trim() : "";
};
