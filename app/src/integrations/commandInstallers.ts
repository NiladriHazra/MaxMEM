import { existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { readJson, shellQuote, upsertTomlBlock, writeJson, writeText } from "./installerFiles";
import {
  claudeCommandsDir,
  codexConfigPath,
  codexMarketplacePath,
  codexPluginCacheBaseDir,
  codexPluginCacheCommandsDir,
  codexPluginCacheDir,
  codexPluginCacheManifestPath,
  codexPluginCacheSkillPath,
  codexPluginCommandsDir,
  codexPluginDir,
  codexPluginManifestPath,
  codexPluginSkillPath,
} from "./installerPaths";
import type { AgentCommandInput, InstallInput } from "./installerTypes";

const launchAgents = ["codex", "claude", "opencode"] as const;

interface CommandFrontmatterInput {
  description: string;
  allowedTools?: string[];
}

interface CodexPluginTarget {
  commandsDir: string;
  manifestPath: string;
  skillPath: string;
}

interface CodexPluginInstallInput extends InstallInput {
  target: CodexPluginTarget;
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

const codexSkill = ({ entryPath }: InstallInput) =>
  [
    "---",
    "name: maxmem",
    "description: Use for MaxMEM handoffs, continuation capsules, cross-agent memory, project memory, and slash-like inputs such as /maxmem/handoff.",
    "---",
    "",
    "# MaxMEM",
    "",
    "MaxMEM is installed for Codex through hooks, MCP tools, and this skill. The current Codex TUI only autocompletes built-in slash commands, so do not promise that `/maxmem` appears in the slash picker.",
    "",
    "When the user asks for MaxMEM actions, prefer the MaxMEM MCP tools when available. If a direct shell command is clearer, run one of these commands immediately:",
    "",
    "```sh",
    `${shellQuote(process.execPath)} ${shellQuote(entryPath)} handoff --copy`,
    `${shellQuote(process.execPath)} ${shellQuote(entryPath)} memory`,
    `${shellQuote(process.execPath)} ${shellQuote(entryPath)} companion`,
    `${shellQuote(process.execPath)} ${shellQuote(entryPath)} launch codex --from codex`,
    `${shellQuote(process.execPath)} ${shellQuote(entryPath)} launch claude --from codex`,
    `${shellQuote(process.execPath)} ${shellQuote(entryPath)} launch opencode --from codex`,
    "```",
    "",
    "Map user intent this way:",
    "",
    "- `/maxmem/handoff`, `maxmem handoff`, or handoff request: create a compact handoff capsule and copy it when possible.",
    "- `/maxmem/memory` or memory request: list memory, or save a note when the user provided one.",
    "- `/maxmem/companion` or companion request: open the local companion UI.",
    "- `/maxmem/codex`, `/maxmem/claude`, or `/maxmem/opencode`: create a handoff and launch that agent.",
    "",
    "Keep raw chat out unless the user explicitly requests it.",
  ].join("\n");

const codexPluginManifest = () => ({
  name: "maxmem",
  version: "0.1.12",
  description: "MaxMEM handoff skill and command files for Codex.",
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

const codexPluginConfigBlock = () => ['[plugins."maxmem@local"]', "enabled = true"].join("\n");

const codexConfigWithMaxmemPlugin = () =>
  upsertTomlBlock({
    content: upsertTomlBlock({
      content: codexConfig(),
      header: "marketplaces.local",
      block: codexMarketplaceConfigBlock(),
    }),
    header: 'plugins."maxmem@local"',
    block: codexPluginConfigBlock(),
  });

const codexPluginTargets = () => [
  {
    commandsDir: codexPluginCommandsDir(),
    manifestPath: codexPluginManifestPath(),
    skillPath: codexPluginSkillPath(),
  },
  {
    commandsDir: codexPluginCacheCommandsDir(),
    manifestPath: codexPluginCacheManifestPath(),
    skillPath: codexPluginCacheSkillPath(),
  },
];

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

const installCodexPluginTarget = ({ entryPath, target }: CodexPluginInstallInput) => {
  mkdirSync(target.commandsDir, { recursive: true });
  mkdirSync(dirname(target.manifestPath), { recursive: true });
  launchAgents.map((agent) =>
    writeText(join(target.commandsDir, `maxmem-${agent}.md`), codexCommand({ entryPath, agent })),
  );
  writeText(join(target.commandsDir, "maxmem-handoff.md"), codexHandoffCommand({ entryPath }));
  writeText(join(target.commandsDir, "maxmem-companion.md"), codexCompanionCommand({ entryPath }));
  writeText(join(target.commandsDir, "maxmem-memory.md"), memoryCommand({ entryPath }));
  writeText(join(target.commandsDir, "maxmem.md"), codexIndexCommand());
  writeText(target.skillPath, codexSkill({ entryPath }));
  writeJson(target.manifestPath, codexPluginManifest());
};

const installCodexCommands = ({ entryPath }: InstallInput) => {
  rmSync(codexPluginCacheBaseDir(), { recursive: true, force: true });
  codexPluginTargets().map((target) => installCodexPluginTarget({ entryPath, target }));
  writeJson(codexMarketplacePath(), marketplaceWithMaxmem());
  writeText(codexConfigPath(), codexConfigWithMaxmemPlugin());
};

export const installAgentCommands = ({ entryPath }: InstallInput) => {
  installClaudeCommands({ entryPath });
  installCodexCommands({ entryPath });

  return [
    `Installed Claude slash commands in ${claudeCommandsDir()}`,
    `Installed Codex plugin skill and command files in ${codexPluginDir()}`,
    `Installed Codex plugin cache in ${codexPluginCacheDir()}`,
    `Registered Codex local plugin marketplace in ${codexMarketplacePath()}`,
    `Enabled Codex local plugin marketplace in ${codexConfigPath()}`,
  ];
};
