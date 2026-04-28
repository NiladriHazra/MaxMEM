import { existsSync, readFileSync } from "node:fs";
import { readJson, shellQuote, upsertTomlBlock, writeJson, writeText } from "./installerFiles";
import {
  claudeConfigPath,
  codexConfigPath,
  opencodeConfigPath,
  opencodePluginPath,
} from "./installerPaths";
import type { AgentCommandInput, InstallInput } from "./installerTypes";

const opencodeIndexCommand = () => ({
  template: [
    "Show this MaxMEM command menu to the user:",
    "maxmem-handoff: create a compact handoff capsule.",
    "maxmem-memory: list or save durable project memory.",
    "maxmem-companion: open the local companion UI.",
    "maxmem-codex: create a handoff and launch Codex.",
    "maxmem-claude: create a handoff and launch Claude Code.",
    "maxmem-opencode: create a handoff and launch OpenCode.",
  ].join("\\n"),
  description: "Show MaxMEM commands",
});

const mcpCommand = ({ entryPath }: InstallInput) => ({
  command: process.execPath,
  args: [entryPath, "mcp"],
});

const codexMcpBlock = ({ entryPath }: InstallInput) =>
  [
    "[mcp_servers.maxmem]",
    `command = ${JSON.stringify(process.execPath)}`,
    `args = [${[entryPath, "mcp"].map((value) => JSON.stringify(value)).join(", ")}]`,
  ].join("\n");

const opencodeCommand = ({ entryPath, agent }: AgentCommandInput) => ({
  template: `Immediately run this exact shell command to create a MaxMEM handoff and launch ${agent}. Do not only print it: ${shellQuote(process.execPath)} ${shellQuote(entryPath)} launch ${agent} --from opencode`,
  description: `Launch ${agent} through MaxMEM with the current handoff context`,
});

const opencodeCompanionCommand = ({ entryPath }: InstallInput) => ({
  template: `Immediately run this exact shell command to open the MaxMEM companion UI. Do not only print it: ${shellQuote(process.execPath)} ${shellQuote(entryPath)} companion`,
  description: "Open the MaxMEM companion UI",
});

const opencodeHandoffCommand = ({ entryPath }: InstallInput) => ({
  template: `Immediately run this exact shell command to create a compact MaxMEM handoff. Do not only print it: ${shellQuote(process.execPath)} ${shellQuote(entryPath)} handoff --copy`,
  description: "Create a compact MaxMEM handoff capsule",
});

const opencodeMemoryCommand = ({ entryPath }: InstallInput) => ({
  template: `Immediately run this exact shell command to list or save MaxMEM project memory. Append any user-provided memory text after --add: ${shellQuote(process.execPath)} ${shellQuote(entryPath)} memory`,
  description: "List or save MaxMEM project memory",
});

const codexConfig = () =>
  existsSync(codexConfigPath()) ? readFileSync(codexConfigPath(), "utf8") : "";

const claudeMcpServers = ({ entryPath }: InstallInput) => {
  const config = readJson<Record<string, unknown>>(claudeConfigPath(), {});

  return {
    config,
    mcpServers: {
      ...(config.mcpServers as Record<string, unknown> | undefined),
      maxmem: {
        ...mcpCommand({ entryPath }),
        env: {},
        type: "stdio",
      },
    },
  };
};

const opencodeConfig = ({ entryPath }: InstallInput) => {
  const config = readJson<Record<string, unknown>>(opencodeConfigPath(), {});

  return {
    config,
    command: {
      ...(config.command as Record<string, unknown> | undefined),
      "maxmem-codex": opencodeCommand({ entryPath, agent: "codex" }),
      "maxmem-claude": opencodeCommand({ entryPath, agent: "claude" }),
      "maxmem-opencode": opencodeCommand({ entryPath, agent: "opencode" }),
      "maxmem-companion": opencodeCompanionCommand({ entryPath }),
      "maxmem-handoff": opencodeHandoffCommand({ entryPath }),
      "maxmem-memory": opencodeMemoryCommand({ entryPath }),
      maxmem: opencodeIndexCommand(),
    },
    mcp: {
      ...(config.mcp as Record<string, unknown> | undefined),
      maxmem: {
        command: [process.execPath, entryPath, "mcp"],
        enabled: true,
        type: "local",
      },
    },
    plugin: [
      ...new Set([
        ...((config.plugin as string[] | undefined) ?? []).filter(Boolean),
        opencodePluginPath(),
      ]),
    ],
  };
};

export const installMcpConfigs = ({ entryPath }: InstallInput) => {
  const claude = claudeMcpServers({ entryPath });
  const opencode = opencodeConfig({ entryPath });

  writeText(
    codexConfigPath(),
    upsertTomlBlock({
      content: codexConfig(),
      header: "mcp_servers.maxmem",
      block: codexMcpBlock({ entryPath }),
    }),
  );
  writeJson(claudeConfigPath(), { ...claude.config, mcpServers: claude.mcpServers });
  writeJson(opencodeConfigPath(), {
    ...opencode.config,
    command: opencode.command,
    mcp: opencode.mcp,
    plugin: opencode.plugin,
  });

  return [
    `Installed Codex MCP server in ${codexConfigPath()}`,
    `Installed Claude MCP server in ${claudeConfigPath()}`,
    `Installed OpenCode MCP server in ${opencodeConfigPath()}`,
  ];
};
