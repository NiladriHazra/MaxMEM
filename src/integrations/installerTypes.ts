export interface InstallInput {
  entryPath: string;
}

export interface CommandInput {
  entryPath: string;
  args: string[];
}

export interface AgentCommandInput {
  entryPath: string;
  agent: string;
}
