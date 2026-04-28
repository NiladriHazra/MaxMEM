import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { readJson, shellQuote, upsertTomlBlock, writeJson, writeText } from "./installerFiles";
import {
  claudeCommandsDir,
  codexConfigPath,
  codexMarketplacePath,
  codexPluginCommandsDir,
  codexPluginDir,
  codexPluginManifestPath,
} from "./installerPaths";
import type { AgentCommandInput, InstallInput } from "./installerTypes";

const launchAgents = ["codex", "claude", "opencode"] as const;

interface CommandFrontmatterInput {
  description: string;
  allowedTools?: string[];
}

const commandFrontmatter = ({ description, allowedTools }: CommandFrontmatterInput) =>
  [
    "---",
    `description: ${description}`,
    ...(allowedTools?.length ? [`allowed-tools: [${allowedTools.join(", ")}]`] : []),
    "---",
    "",
  ].join("\n");

const commandList = () =>
  [
    "MaxMEM commands:",
    "",
    "- maxmem-handoff: create a compact handoff capsule for the current repository.",
    "- maxmem-memory: list or save durable project memory.",
    "- maxmem-companion: open the local MaxMEM companion UI.",
    "- maxmem-codex: create a handoff and launch Codex.",
    "- maxmem-claude: create a handoff and launch Claude Code.",
    "- maxmem-opencode: create a handoff and launch OpenCode.",
  ].join("\n");

const claudeCommand = ({ entryPath, agent }: AgentCommandInput) =>
  [
    commandFrontmatter({
      description: `Create MaxMEM handoff and launch ${agent}`,
      allowedTools: ["Bash"],
    }),
    `# maxmem-${agent}`,
    "",
    `Create a MaxMEM handoff for the current repository, then launch ${agent} from the current terminal app.`,
    "",
    "Run this shell command immediately:",
    "",
    "```sh",
    `${shellQuote(process.execPath)} ${shellQuote(entryPath)} launch ${agent} --from claude`,
    "```",
  ].join("\n");

const claudeHandoffCommand = ({ entryPath }: InstallInput) =>
  [
    commandFrontmatter({
      description: "Create compact MaxMEM handoff capsule",
      allowedTools: ["Bash"],
    }),
    "# maxmem-handoff",
    "",
    "Create a compact MaxMEM handoff capsule for the current repository.",
    "",
    "Run this shell command immediately:",
    "",
    "```sh",
    `${shellQuote(process.execPath)} ${shellQuote(entryPath)} handoff --copy`,
    "```",
  ].join("\n");

const claudeCompanionCommand = ({ entryPath }: InstallInput) =>
  [
    commandFrontmatter({
      description: "Open MaxMEM companion UI",
      allowedTools: ["Bash"],
    }),
    "# maxmem-companion",
    "",
    "Open the MaxMEM companion UI for the current repository.",
    "",
    "Run this shell command immediately:",
    "",
    "```sh",
    `${shellQuote(process.execPath)} ${shellQuote(entryPath)} companion`,
    "```",
  ].join("\n");

const memoryCommand = ({ entryPath }: InstallInput) =>
  [
    commandFrontmatter({
      description: "List or save MaxMEM project memory",
      allowedTools: ["Bash"],
    }),
    "# maxmem-memory",
    "",
    "List MaxMEM project memory, or save a note when arguments are provided.",
    "",
    "Run this shell command immediately:",
    "",
    "```sh",
    `${shellQuote(process.execPath)} ${shellQuote(entryPath)} memory $ARGUMENTS`,
    "```",
  ].join("\n");

const claudeIndexCommand = () =>
  [
    commandFrontmatter({ description: "Show MaxMEM command menu" }),
    "# maxmem",
    "",
    "Show this MaxMEM command menu to the user. Do not run a shell command unless the user chooses one.",
    "",
    commandList()
      .split("\n")
      .map((line) => line.replaceAll("maxmem-", "/maxmem-"))
      .join("\n"),
  ].join("\n");

const codexCommand = ({ entryPath, agent }: AgentCommandInput) =>
  [
    commandFrontmatter({
      description: `Create MaxMEM handoff and launch ${agent}`,
      allowedTools: ["Bash"],
    }),
    `# maxmem-${agent}`,
    "",
    `Create a MaxMEM handoff for the current repository, then launch ${agent} from the current terminal app.`,
    "",
    "Run this shell command immediately:",
    "",
    "```sh",
    `${shellQuote(process.execPath)} ${shellQuote(entryPath)} launch ${agent} --from codex`,
    "```",
  ].join("\n");

const codexHandoffCommand = ({ entryPath }: InstallInput) =>
  [
    commandFrontmatter({
      description: "Create compact MaxMEM handoff capsule",
      allowedTools: ["Bash"],
    }),
    "# maxmem-handoff",
    "",
    "Create a compact MaxMEM handoff capsule for the current repository.",
    "",
    "Run this shell command immediately:",
    "",
    "```sh",
    `${shellQuote(process.execPath)} ${shellQuote(entryPath)} handoff --copy`,
    "```",
  ].join("\n");

const codexCompanionCommand = ({ entryPath }: InstallInput) =>
  [
    commandFrontmatter({
      description: "Open MaxMEM companion UI",
      allowedTools: ["Bash"],
    }),
    "# maxmem-companion",
    "",
    "Open the MaxMEM companion UI for the current repository.",
    "",
    "Run this shell command immediately:",
    "",
    "```sh",
    `${shellQuote(process.execPath)} ${shellQuote(entryPath)} companion`,
    "```",
  ].join("\n");

const codexIndexCommand = () =>
  [
    commandFrontmatter({ description: "Show MaxMEM command menu" }),
    "# maxmem",
    "",
    "Show this MaxMEM command menu to the user. Do not run a shell command unless the user chooses one.",
    "",
    commandList(),
  ].join("\n");

const codexPluginManifest = () => ({
  name: "maxmem",
  version: "0.1.8",
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
          installation: "INSTALLED_BY_DEFAULT",
          authentication: "ON_INSTALL",
        },
        category: "Productivity",
      },
    ],
  };
};

const codexConfig = () =>
  existsSync(codexConfigPath()) ? readFileSync(codexConfigPath(), "utf8") : "";

const codexMarketplaceConfigBlock = () =>
  [
    "[marketplaces.local]",
    `last_updated = ${JSON.stringify(new Date().toISOString())}`,
    'source_type = "local"',
    `source = ${JSON.stringify(homedir())}`,
  ].join("\n");

const installClaudeCommands = ({ entryPath }: InstallInput) => {
  mkdirSync(claudeCommandsDir(), { recursive: true });
  launchAgents.map((agent) =>
    writeText(join(claudeCommandsDir(), `maxmem-${agent}.md`), claudeCommand({ entryPath, agent })),
  );
  writeText(join(claudeCommandsDir(), "maxmem-handoff.md"), claudeHandoffCommand({ entryPath }));
  writeText(
    join(claudeCommandsDir(), "maxmem-companion.md"),
    claudeCompanionCommand({ entryPath }),
  );
  writeText(join(claudeCommandsDir(), "maxmem-memory.md"), memoryCommand({ entryPath }));
  writeText(join(claudeCommandsDir(), "maxmem.md"), claudeIndexCommand());
};

const installCodexCommands = ({ entryPath }: InstallInput) => {
  mkdirSync(codexPluginCommandsDir(), { recursive: true });
  mkdirSync(dirname(codexPluginManifestPath()), { recursive: true });
  launchAgents.map((agent) =>
    writeText(
      join(codexPluginCommandsDir(), `maxmem-${agent}.md`),
      codexCommand({ entryPath, agent }),
    ),
  );
  writeText(
    join(codexPluginCommandsDir(), "maxmem-handoff.md"),
    codexHandoffCommand({ entryPath }),
  );
  writeText(
    join(codexPluginCommandsDir(), "maxmem-companion.md"),
    codexCompanionCommand({ entryPath }),
  );
  writeText(join(codexPluginCommandsDir(), "maxmem-memory.md"), memoryCommand({ entryPath }));
  writeText(join(codexPluginCommandsDir(), "maxmem.md"), codexIndexCommand());
  writeJson(codexPluginManifestPath(), codexPluginManifest());
  writeJson(codexMarketplacePath(), marketplaceWithMaxmem());
  writeText(
    codexConfigPath(),
    upsertTomlBlock({
      content: codexConfig(),
      header: "marketplaces.local",
      block: codexMarketplaceConfigBlock(),
    }),
  );
};

export const installAgentCommands = ({ entryPath }: InstallInput) => {
  installClaudeCommands({ entryPath });
  installCodexCommands({ entryPath });

  return [
    `Installed Claude slash commands in ${claudeCommandsDir()}`,
    `Installed Codex plugin commands in ${codexPluginDir()}`,
    `Registered Codex local plugin marketplace in ${codexMarketplacePath()}`,
    `Enabled Codex local plugin marketplace in ${codexConfigPath()}`,
  ];
};
