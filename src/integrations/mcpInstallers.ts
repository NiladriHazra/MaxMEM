import { existsSync, readFileSync } from "node:fs";
import { readJson, shellQuote, writeJson, writeText } from "./installerFiles";
import {
  claudeConfigPath,
  codexConfigPath,
  opencodeConfigPath,
  opencodePluginPath,
} from "./installerPaths";
import type { AgentCommandInput, InstallInput } from "./installerTypes";

const mcpCommand = ({ entryPath }: InstallInput) => ({
  command: process.execPath,
  args: [entryPath, "mcp"],
});

const upsertTomlBlock = (content: string, block: string) => {
  const pattern = /\n?\[mcp_servers\.maxmem\][\s\S]*?(?=\n\[[^\n]+\]|\s*$)/;
  const cleaned = content.replace(pattern, "").trimEnd();

  return `${cleaned}\n\n${block.trim()}\n`;
};

const codexMcpBlock = ({ entryPath }: InstallInput) =>
  [
    "[mcp_servers.maxmem]",
    `command = ${JSON.stringify(process.execPath)}`,
    `args = [${[entryPath, "mcp"].map((value) => JSON.stringify(value)).join(", ")}]`,
  ].join("\n");

const opencodeCommand = ({ entryPath, agent }: AgentCommandInput) => ({
  template: `Run this shell command to create a MaxMEM handoff and launch ${agent}: ${shellQuote(process.execPath)} ${shellQuote(entryPath)} launch ${agent} --from opencode`,
  description: `Launch ${agent} through MaxMEM with the current handoff context`,
});

const opencodeCompanionCommand = ({ entryPath }: InstallInput) => ({
  template: `Run this shell command to open the MaxMEM companion UI: ${shellQuote(process.execPath)} ${shellQuote(entryPath)} companion`,
  description: "Open the MaxMEM companion UI",
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
      maxmem: opencodeCompanionCommand({ entryPath }),
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

  writeText(codexConfigPath(), upsertTomlBlock(codexConfig(), codexMcpBlock({ entryPath })));
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
