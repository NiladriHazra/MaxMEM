import { startCompanionServer } from "../companion/server";

export interface CompanionCommandInput {
  args: string[];
  cwd: string;
  entryPath: string;
}

export const runCompanionCommand = (input: CompanionCommandInput) => startCompanionServer(input);
