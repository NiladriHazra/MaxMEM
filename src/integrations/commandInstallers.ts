import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { readJson, shellQuote, writeJson, writeText } from "./installerFiles";
import {
  claudeCommandsDir,
  codexMarketplacePath,
  codexPluginCommandsDir,
  codexPluginDir,
  codexPluginManifestPath,
} from "./installerPaths";
import type { AgentCommandInput, InstallInput } from "./installerTypes";

const claudeCommand = ({ entryPath, agent }: AgentCommandInput) =>
  [
    `# maxmem-${agent}`,
    "",
    `Create a MaxMEM handoff for the current repository, then launch ${agent} in a new terminal.`,
    "",
    "Run this shell command:",
    "",
    "```sh",
    `${shellQuote(process.execPath)} ${shellQuote(entryPath)} launch ${agent} --from claude`,
    "```",
  ].join("\n");

const claudeCompanionCommand = ({ entryPath }: InstallInput) =>
  [
    "# maxmem",
    "",
    "Open the MaxMEM companion UI for the current repository.",
    "",
    "Run this shell command:",
    "",
    "```sh",
    `${shellQuote(process.execPath)} ${shellQuote(entryPath)} companion`,
    "```",
  ].join("\n");

const codexCommand = ({ entryPath, agent }: AgentCommandInput) =>
  [
    `# maxmem-${agent}`,
    "",
    `Create a MaxMEM handoff for the current repository, then launch ${agent} in a new terminal.`,
    "",
    "```sh",
    `${shellQuote(process.execPath)} ${shellQuote(entryPath)} launch ${agent} --from codex`,
    "```",
  ].join("\n");

const codexCompanionCommand = ({ entryPath }: InstallInput) =>
  [
    "# maxmem",
    "",
    "Open the MaxMEM companion UI for the current repository.",
    "",
    "```sh",
    `${shellQuote(process.execPath)} ${shellQuote(entryPath)} companion`,
    "```",
  ].join("\n");

const codexPluginManifest = () => ({
  name: "maxmem",
  version: "0.1.0",
  description: "MaxMEM handoff commands for Codex.",
  author: {
    name: "MaxMEM",
    email: "maxmem@example.invalid",
    url: "https://github.com/NiladriHazra/MaxMEM",
  },
  homepage: "https://github.com/NiladriHazra/MaxMEM",
  repository: "https://github.com/NiladriHazra/MaxMEM",
  license: "MIT",
  keywords: ["handoff", "codex", "memory"],
  interface: {
    displayName: "MaxMEM",
    shortDescription: "Cross-agent handoff commands.",
    longDescription: "Launch Codex, Claude Code, and OpenCode with MaxMEM handoff context.",
    developerName: "MaxMEM",
    category: "Productivity",
    capabilities: ["Interactive", "Write"],
    defaultPrompt: [
      "Open MaxMEM companion",
      "Launch Claude with MaxMEM",
      "Launch OpenCode with MaxMEM",
    ],
    brandColor: "#111111",
  },
});

const marketplaceWithMaxmem = () => {
  const current = readJson<{
    name?: string;
    interface?: { displayName?: string };
    plugins?: Array<Record<string, unknown>>;
  }>(codexMarketplacePath(), {});
  const plugins = (current.plugins ?? []).filter((plugin) => plugin.name !== "maxmem");

  return {
    name: current.name ?? "local",
    interface: current.interface ?? { displayName: "Local Plugins" },
    plugins: [
      ...plugins,
      {
        name: "maxmem",
        source: {
          source: "local",
          path: "./plugins/maxmem",
        },
        policy: {
          installation: "AVAILABLE",
          authentication: "ON_INSTALL",
        },
        category: "Productivity",
      },
    ],
  };
};

const installClaudeCommands = ({ entryPath }: InstallInput) => {
  mkdirSync(claudeCommandsDir(), { recursive: true });
  writeText(
    join(claudeCommandsDir(), "maxmem-codex.md"),
    claudeCommand({ entryPath, agent: "codex" }),
  );
  writeText(
    join(claudeCommandsDir(), "maxmem-claude.md"),
    claudeCommand({ entryPath, agent: "claude" }),
  );
  writeText(
    join(claudeCommandsDir(), "maxmem-opencode.md"),
    claudeCommand({ entryPath, agent: "opencode" }),
  );
  writeText(join(claudeCommandsDir(), "maxmem.md"), claudeCompanionCommand({ entryPath }));
};

const installCodexCommands = ({ entryPath }: InstallInput) => {
  mkdirSync(codexPluginCommandsDir(), { recursive: true });
  mkdirSync(dirname(codexPluginManifestPath()), { recursive: true });
  writeText(
    join(codexPluginCommandsDir(), "maxmem-codex.md"),
    codexCommand({ entryPath, agent: "codex" }),
  );
  writeText(
    join(codexPluginCommandsDir(), "maxmem-claude.md"),
    codexCommand({ entryPath, agent: "claude" }),
  );
  writeText(
    join(codexPluginCommandsDir(), "maxmem-opencode.md"),
    codexCommand({ entryPath, agent: "opencode" }),
  );
  writeText(join(codexPluginCommandsDir(), "maxmem.md"), codexCompanionCommand({ entryPath }));
  writeJson(codexPluginManifestPath(), codexPluginManifest());
  writeJson(codexMarketplacePath(), marketplaceWithMaxmem());
};

export const installAgentCommands = ({ entryPath }: InstallInput) => {
  installClaudeCommands({ entryPath });
  installCodexCommands({ entryPath });

  return [
    `Installed Claude slash commands in ${claudeCommandsDir()}`,
    `Installed Codex plugin commands in ${codexPluginDir()}`,
    `Registered Codex local plugin marketplace in ${codexMarketplacePath()}`,
  ];
};
