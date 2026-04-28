import { installAgentCommands } from "./commandInstallers";
import { installClaudeHooks, installCodexHooks } from "./hookInstallers";
import { installMcpConfigs } from "./mcpInstallers";
import { installOpenCodePlugin } from "./opencodeInstaller";
import type { InstallInput } from "./installerTypes";

export { installAgentCommands } from "./commandInstallers";
export { installClaudeHooks, installCodexHooks } from "./hookInstallers";
export { installMcpConfigs } from "./mcpInstallers";
export { installOpenCodePlugin } from "./opencodeInstaller";

export const installAllHooks = ({ entryPath }: InstallInput) => [
  ...installCodexHooks({ entryPath }),
  ...installClaudeHooks({ entryPath }),
  ...installOpenCodePlugin({ entryPath }),
  ...installAgentCommands({ entryPath }),
  ...installMcpConfigs({ entryPath }),
];
