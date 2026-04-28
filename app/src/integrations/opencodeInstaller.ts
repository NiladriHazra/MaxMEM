import { mkdirSync } from "node:fs";
import { hookCommand } from "./installerFiles";
import { opencodePluginPath, opencodePluginsDir } from "./installerPaths";
import { writeText } from "./installerFiles";
import type { InstallInput } from "./installerTypes";

const opencodePlugin = ({ entryPath }: InstallInput) => {
  const command = hookCommand({ entryPath, args: [] });

  return [
    "export const MaxMEMPlugin = async ({ $, directory, worktree }) => {",
    "  const cwd = worktree ?? directory ?? process.cwd()",
    "  const run = async (args) => $`MAXMEM_PLUGIN_CWD=${cwd} " + command + " ${args}`",
    "",
    "  return {",
    "    'session.idle': async () => {",
    "      await run(['hook', 'opencode-stop'])",
    "    },",
    "    'experimental.session.compacting': async (input, output) => {",
    "      const context = await run(['inject']).quiet().text()",
    "      if (context.trim()) output.context.push(context.trim())",
    "    },",
    "    'shell.env': async (input, output) => {",
    "      output.env.MAXMEM_ACTIVE = '1'",
    "      output.env.MAXMEM_REPO = cwd",
    "    },",
    "  }",
    "}",
    "",
  ].join("\n");
};

export const installOpenCodePlugin = ({ entryPath }: InstallInput) => {
  mkdirSync(opencodePluginsDir(), { recursive: true });
  writeText(opencodePluginPath(), opencodePlugin({ entryPath }));

  return [`Installed OpenCode plugin in ${opencodePluginPath()}`];
};
