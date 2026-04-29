import { homedir } from "node:os";
import { join } from "node:path";

export const codexDir = () => join(homedir(), ".codex");
export const claudeDir = () => join(homedir(), ".claude");
export const codexHooksPath = () => join(codexDir(), "hooks.json");
export const codexConfigPath = () => join(codexDir(), "config.toml");
export const claudeSettingsPath = () => join(claudeDir(), "settings.json");
export const claudeConfigPath = () => join(homedir(), ".claude.json");
export const claudeCommandsDir = () => join(claudeDir(), "commands");
export const codexPluginDir = () => join(homedir(), "plugins", "maxmem");
export const codexPluginCommandsDir = () => join(codexPluginDir(), "commands");
export const codexPluginSkillPath = () => join(codexPluginDir(), "skills", "maxmem", "SKILL.md");
export const codexPluginManifestPath = () => join(codexPluginDir(), ".codex-plugin", "plugin.json");
export const codexPluginCacheBaseDir = () =>
  join(codexDir(), "plugins", "cache", "local", "maxmem");
export const codexPluginCacheDir = () => join(codexPluginCacheBaseDir(), "local");
export const codexPluginCacheCommandsDir = () => join(codexPluginCacheDir(), "commands");
export const codexPluginCacheSkillPath = () =>
  join(codexPluginCacheDir(), "skills", "maxmem", "SKILL.md");
export const codexPluginCacheManifestPath = () =>
  join(codexPluginCacheDir(), ".codex-plugin", "plugin.json");
export const codexMarketplacePath = () => join(homedir(), ".agents", "plugins", "marketplace.json");
export const opencodePluginsDir = () => join(homedir(), ".config", "opencode", "plugins");
export const opencodeConfigPath = () => join(homedir(), ".config", "opencode", "opencode.json");
export const opencodePluginPath = () => join(opencodePluginsDir(), "maxmem.js");
export const maxmemStatusMarker = "'statusline' 'claude'";
