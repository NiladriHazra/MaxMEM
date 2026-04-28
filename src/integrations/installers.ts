import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

interface InstallInput {
  entryPath: string;
}

interface WritePluginInput {
  entryPath: string;
}

interface WriteCommandsInput {
  entryPath: string;
}

interface CommandInput {
  entryPath: string;
  args: string[];
}

interface CodexHook {
  type: "command";
  command: string;
  statusMessage?: string;
  timeout?: number;
}

interface CodexHookGroup {
  matcher?: string;
  hooks: CodexHook[];
}

interface CodexHooksFile {
  hooks?: Record<string, CodexHookGroup[]>;
}

interface ClaudeHook {
  type: "command";
  command: string;
  statusMessage?: string;
  timeout?: number;
}

interface ClaudeHookGroup {
  matcher?: string;
  hooks: ClaudeHook[];
}

interface ClaudeStatusLine {
  type: "command";
  command: string;
  padding?: number;
  refreshInterval?: number;
}

interface ClaudeSettings {
  hooks?: Record<string, ClaudeHookGroup[]>;
  statusLine?: ClaudeStatusLine;
  [key: string]: unknown;
}

const codexDir = () => join(homedir(), ".codex");
const claudeDir = () => join(homedir(), ".claude");
const codexHooksPath = () => join(codexDir(), "hooks.json");
const codexConfigPath = () => join(codexDir(), "config.toml");
const claudeSettingsPath = () => join(claudeDir(), "settings.json");
const claudeConfigPath = () => join(homedir(), ".claude.json");
const claudeCommandsDir = () => join(claudeDir(), "commands");
const codexPluginDir = () => join(homedir(), "plugins", "maxmem");
const codexPluginCommandsDir = () => join(codexPluginDir(), "commands");
const codexPluginManifestPath = () => join(codexPluginDir(), ".codex-plugin", "plugin.json");
const codexMarketplacePath = () => join(homedir(), ".agents", "plugins", "marketplace.json");
const opencodePluginsDir = () => join(homedir(), ".config", "opencode", "plugins");
const opencodeConfigPath = () => join(homedir(), ".config", "opencode", "opencode.json");
const opencodePluginPath = () => join(opencodePluginsDir(), "maxmem.js");
const maxmemStatusMarker = "'statusline' 'claude'";

const shellQuote = (value: string) => `'${value.replaceAll("'", "'\"'\"'")}'`;

const hookCommand = ({ entryPath, args }: CommandInput) =>
  [shellQuote(process.execPath), shellQuote(entryPath), ...args.map(shellQuote)].join(" ");

const mcpCommand = ({ entryPath }: WriteCommandsInput) => ({
  command: process.execPath,
  args: [entryPath, "mcp"],
});

const readJson = <T>(path: string, fallback: T) =>
  existsSync(path) ? (JSON.parse(readFileSync(path, "utf8")) as T) : fallback;

const backupPath = (path: string) =>
  `${path}.maxmem-${new Date().toISOString().replaceAll(":", "-").replaceAll(".", "-")}.bak`;

const backupFile = (path: string) => existsSync(path) && copyFileSync(path, backupPath(path));

const writeJson = (path: string, value: unknown) => {
  mkdirSync(dirname(path), { recursive: true });
  backupFile(path);
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
};

const writeText = (path: string, value: string) => {
  mkdirSync(dirname(path), { recursive: true });
  backupFile(path);
  writeFileSync(path, value);
};

const hookExists = (groups: Array<CodexHookGroup | ClaudeHookGroup>, command: string) =>
  groups.some((group) => group.hooks.some((hook) => hook.command === command));

const withoutMaxmemHook = <T extends CodexHookGroup | ClaudeHookGroup>(
  groups: T[],
  hookId: string,
) =>
  groups
    .map((group) => ({
      ...group,
      hooks: group.hooks.filter((hook) => !hook.command.includes(hookId)),
    }))
    .filter((group) => group.hooks.length);

const mergeHook = <T extends CodexHookGroup | ClaudeHookGroup>(
  groups: T[],
  group: T,
  command: string,
) => (hookExists(groups, command) ? groups : [...groups, group]);

const replaceHook = <T extends CodexHookGroup | ClaudeHookGroup>(
  groups: T[],
  group: T,
  command: string,
  hookId: string,
) => mergeHook(withoutMaxmemHook(groups, hookId), group, command);

const enableCodexHooks = (content: string) => {
  if (content.match(/^codex_hooks\s*=\s*true$/m)) {
    return content;
  }

  if (content.match(/^codex_hooks\s*=\s*false$/m)) {
    return content.replace(/^codex_hooks\s*=\s*false$/m, "codex_hooks = true");
  }

  const featuresIndex = content.search(/^\[features\]\s*$/m);

  if (featuresIndex < 0) {
    return `${content.trim()}\n\n[features]\ncodex_hooks = true\n`;
  }

  const after = content.slice(featuresIndex);
  const nextHeader = after.slice(1).search(/^\[.*\]\s*$/m);
  const insertIndex = nextHeader >= 0 ? featuresIndex + 1 + nextHeader : content.length;

  return `${content.slice(0, insertIndex).trimEnd()}\ncodex_hooks = true\n${content.slice(insertIndex).trimStart()}`;
};

const upsertTomlBlock = (content: string, block: string) => {
  const pattern = /\n?\[mcp_servers\.maxmem\][\s\S]*?(?=\n\[[^\n]+\]|\s*$)/;
  const cleaned = content.replace(pattern, "").trimEnd();

  return `${cleaned}\n\n${block.trim()}\n`;
};

const codexMcpBlock = ({ entryPath }: WriteCommandsInput) =>
  [
    "[mcp_servers.maxmem]",
    `command = ${JSON.stringify(process.execPath)}`,
    `args = [${[entryPath, "mcp"].map((value) => JSON.stringify(value)).join(", ")}]`,
  ].join("\n");

const claudeCommand = ({ entryPath, agent }: WriteCommandsInput & { agent: string }) =>
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

const claudeCompanionCommand = ({ entryPath }: WriteCommandsInput) =>
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

const codexCommand = ({ entryPath, agent }: WriteCommandsInput & { agent: string }) =>
  [
    `# maxmem-${agent}`,
    "",
    `Create a MaxMEM handoff for the current repository, then launch ${agent} in a new terminal.`,
    "",
    "```sh",
    `${shellQuote(process.execPath)} ${shellQuote(entryPath)} launch ${agent} --from codex`,
    "```",
  ].join("\n");

const codexCompanionCommand = ({ entryPath }: WriteCommandsInput) =>
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

const opencodeCommand = ({ entryPath, agent }: WriteCommandsInput & { agent: string }) => ({
  template: `Run this shell command to create a MaxMEM handoff and launch ${agent}: ${shellQuote(process.execPath)} ${shellQuote(entryPath)} launch ${agent} --from opencode`,
  description: `Launch ${agent} through MaxMEM with the current handoff context`,
});

const opencodeCompanionCommand = ({ entryPath }: WriteCommandsInput) => ({
  template: `Run this shell command to open the MaxMEM companion UI: ${shellQuote(process.execPath)} ${shellQuote(entryPath)} companion`,
  description: "Open the MaxMEM companion UI",
});

const opencodePlugin = ({ entryPath }: WritePluginInput) => {
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

export const installCodexHooks = ({ entryPath }: InstallInput) => {
  mkdirSync(codexDir(), { recursive: true });

  const sessionCommand = hookCommand({ entryPath, args: ["hook", "codex-session-start"] });
  const stopCommand = hookCommand({ entryPath, args: ["hook", "codex-stop"] });
  const hooksFile = readJson<CodexHooksFile>(codexHooksPath(), {});
  const hooks = hooksFile.hooks ?? {};
  const sessionGroups = hooks.SessionStart ?? [];
  const stopGroups = hooks.Stop ?? [];
  const nextHooks = {
    ...hooks,
    SessionStart: replaceHook(
      sessionGroups,
      {
        matcher: "startup|resume|clear",
        hooks: [
          { type: "command", command: sessionCommand, statusMessage: "Loading maxMEM handoff" },
        ],
      },
      sessionCommand,
      "codex-session-start",
    ),
    Stop: replaceHook(
      stopGroups,
      {
        hooks: [
          {
            type: "command",
            command: stopCommand,
            statusMessage: "Saving maxMEM handoff",
            timeout: 30,
          },
        ],
      },
      stopCommand,
      "codex-stop",
    ),
  };
  const existingConfig = existsSync(codexConfigPath())
    ? readFileSync(codexConfigPath(), "utf8")
    : "";

  writeJson(codexHooksPath(), { hooks: nextHooks });
  writeText(codexConfigPath(), enableCodexHooks(existingConfig));

  return [
    `Installed Codex hooks in ${codexHooksPath()}`,
    `Enabled Codex hooks in ${codexConfigPath()}`,
  ];
};

export const installClaudeHooks = ({ entryPath }: InstallInput) => {
  mkdirSync(claudeDir(), { recursive: true });

  const sessionCommand = hookCommand({ entryPath, args: ["hook", "claude-session-start"] });
  const stopCommand = hookCommand({ entryPath, args: ["hook", "claude-stop"] });
  const statusCommand = hookCommand({ entryPath, args: ["statusline", "claude"] });
  const settings = readJson<ClaudeSettings>(claudeSettingsPath(), {});
  const hooks = settings.hooks ?? {};
  const sessionGroups = hooks.SessionStart ?? [];
  const stopGroups = hooks.Stop ?? [];
  const statusLine =
    settings.statusLine?.command && !settings.statusLine.command.includes(maxmemStatusMarker)
      ? settings.statusLine
      : { type: "command" as const, command: statusCommand, padding: 1, refreshInterval: 5 };

  writeJson(claudeSettingsPath(), {
    ...settings,
    hooks: {
      ...hooks,
      SessionStart: replaceHook(
        sessionGroups,
        {
          matcher: "startup|resume|clear|compact",
          hooks: [
            { type: "command", command: sessionCommand, statusMessage: "Loading maxMEM handoff" },
          ],
        },
        sessionCommand,
        "claude-session-start",
      ),
      Stop: replaceHook(
        stopGroups,
        {
          hooks: [
            {
              type: "command",
              command: stopCommand,
              statusMessage: "Saving maxMEM handoff",
              timeout: 30,
            },
          ],
        },
        stopCommand,
        "claude-stop",
      ),
    },
    statusLine,
  });

  return settings.statusLine?.command && !settings.statusLine.command.includes(maxmemStatusMarker)
    ? [
        `Installed Claude hooks in ${claudeSettingsPath()}`,
        "Existing Claude statusLine was preserved. Run `maxmem statusline claude` manually if you want to wire it yourself.",
      ]
    : [`Installed Claude hooks in ${claudeSettingsPath()}`, "Installed maxMEM Claude status line"];
};

export const installOpenCodePlugin = ({ entryPath }: InstallInput) => {
  mkdirSync(opencodePluginsDir(), { recursive: true });
  writeText(opencodePluginPath(), opencodePlugin({ entryPath }));

  return [`Installed OpenCode plugin in ${opencodePluginPath()}`];
};

export const installAgentCommands = ({ entryPath }: InstallInput) => {
  mkdirSync(claudeCommandsDir(), { recursive: true });
  mkdirSync(codexPluginCommandsDir(), { recursive: true });
  mkdirSync(dirname(codexPluginManifestPath()), { recursive: true });
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

  return [
    `Installed Claude slash commands in ${claudeCommandsDir()}`,
    `Installed Codex plugin commands in ${codexPluginDir()}`,
    `Registered Codex local plugin marketplace in ${codexMarketplacePath()}`,
  ];
};

export const installMcpConfigs = ({ entryPath }: InstallInput) => {
  const existingCodexConfig = existsSync(codexConfigPath())
    ? readFileSync(codexConfigPath(), "utf8")
    : "";
  const claudeConfig = readJson<Record<string, unknown>>(claudeConfigPath(), {});
  const claudeServers = {
    ...(claudeConfig.mcpServers as Record<string, unknown> | undefined),
    maxmem: {
      ...mcpCommand({ entryPath }),
      env: {},
      type: "stdio",
    },
  };
  const opencodeConfig = readJson<Record<string, unknown>>(opencodeConfigPath(), {});
  const opencodeMcp = {
    ...(opencodeConfig.mcp as Record<string, unknown> | undefined),
    maxmem: {
      command: [process.execPath, entryPath, "mcp"],
      enabled: true,
      type: "local",
    },
  };
  const opencodeCommandConfig = {
    ...(opencodeConfig.command as Record<string, unknown> | undefined),
    "maxmem-codex": opencodeCommand({ entryPath, agent: "codex" }),
    "maxmem-claude": opencodeCommand({ entryPath, agent: "claude" }),
    "maxmem-opencode": opencodeCommand({ entryPath, agent: "opencode" }),
    maxmem: opencodeCompanionCommand({ entryPath }),
  };
  const opencodePlugins = [
    ...new Set([
      ...((opencodeConfig.plugin as string[] | undefined) ?? []).filter(Boolean),
      opencodePluginPath(),
    ]),
  ];

  writeText(codexConfigPath(), upsertTomlBlock(existingCodexConfig, codexMcpBlock({ entryPath })));
  writeJson(claudeConfigPath(), { ...claudeConfig, mcpServers: claudeServers });
  writeJson(opencodeConfigPath(), {
    ...opencodeConfig,
    command: opencodeCommandConfig,
    mcp: opencodeMcp,
    plugin: opencodePlugins,
  });

  return [
    `Installed Codex MCP server in ${codexConfigPath()}`,
    `Installed Claude MCP server in ${claudeConfigPath()}`,
    `Installed OpenCode MCP server in ${opencodeConfigPath()}`,
  ];
};

export const installAllHooks = ({ entryPath }: InstallInput) => [
  ...installCodexHooks({ entryPath }),
  ...installClaudeHooks({ entryPath }),
  ...installOpenCodePlugin({ entryPath }),
  ...installAgentCommands({ entryPath }),
  ...installMcpConfigs({ entryPath }),
];
