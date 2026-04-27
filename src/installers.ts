import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

interface InstallInput {
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
const maxmemStatusMarker = "maxmem statusline";

const shellQuote = (value: string) => `'${value.replaceAll("'", "'\"'\"'")}'`;

const hookCommand = ({ entryPath, args }: CommandInput) =>
  [shellQuote(process.execPath), shellQuote(entryPath), ...args.map(shellQuote)].join(" ");

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

const mergeHook = <T extends CodexHookGroup | ClaudeHookGroup>(
  groups: T[],
  group: T,
  command: string,
) => (hookExists(groups, command) ? groups : [...groups, group]);

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
    SessionStart: mergeHook(
      sessionGroups,
      {
        matcher: "startup|resume|clear",
        hooks: [
          { type: "command", command: sessionCommand, statusMessage: "Loading maxMEM handoff" },
        ],
      },
      sessionCommand,
    ),
    Stop: mergeHook(
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
  const statusLine = settings.statusLine?.command?.includes(maxmemStatusMarker)
    ? settings.statusLine
    : settings.statusLine
      ? settings.statusLine
      : { type: "command" as const, command: statusCommand, padding: 1, refreshInterval: 5 };

  writeJson(claudeSettingsPath(), {
    ...settings,
    hooks: {
      ...hooks,
      SessionStart: mergeHook(
        sessionGroups,
        {
          matcher: "startup|resume|clear|compact",
          hooks: [
            { type: "command", command: sessionCommand, statusMessage: "Loading maxMEM handoff" },
          ],
        },
        sessionCommand,
      ),
      Stop: mergeHook(
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

export const installAllHooks = ({ entryPath }: InstallInput) => [
  ...installCodexHooks({ entryPath }),
  ...installClaudeHooks({ entryPath }),
];
