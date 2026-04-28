import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { hookCommand, readJson, writeJson, writeText } from "./installerFiles";
import {
  claudeDir,
  claudeSettingsPath,
  codexConfigPath,
  codexDir,
  codexHooksPath,
  maxmemStatusMarker,
} from "./installerPaths";
import type { InstallInput } from "./installerTypes";

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

export const installCodexHooks = ({ entryPath }: InstallInput) => {
  mkdirSync(codexDir(), { recursive: true });

  const sessionCommand = hookCommand({ entryPath, args: ["hook", "codex-session-start"] });
  const stopCommand = hookCommand({ entryPath, args: ["hook", "codex-stop"] });
  const hooksFile = readJson<CodexHooksFile>(codexHooksPath(), {});
  const hooks = hooksFile.hooks ?? {};
  const sessionGroups = hooks.SessionStart ?? [];
  const stopGroups = hooks.Stop ?? [];
  const existingConfig = existsSync(codexConfigPath())
    ? readFileSync(codexConfigPath(), "utf8")
    : "";

  writeJson(codexHooksPath(), {
    hooks: {
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
    },
  });
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
  const hasUserStatusLine =
    settings.statusLine?.command && !settings.statusLine.command.includes(maxmemStatusMarker);
  const statusLine = hasUserStatusLine
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

  return hasUserStatusLine
    ? [
        `Installed Claude hooks in ${claudeSettingsPath()}`,
        "Existing Claude statusLine was preserved. Run `maxmem statusline claude` manually if you want to wire it yourself.",
      ]
    : [`Installed Claude hooks in ${claudeSettingsPath()}`, "Installed maxMEM Claude status line"];
};
