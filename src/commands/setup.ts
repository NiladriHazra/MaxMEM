import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { installAllHooks } from "../integrations/installers";
import { hasFlag } from "../cli/options";

export interface SetupCommandInput {
  args: string[];
  entryPath: string;
}

export interface AutoSetupInput {
  command: string | undefined;
  entryPath: string;
}

interface SetupRecord {
  entryPath: string;
  updatedAt: string;
}

const setupPath = () => join(homedir(), ".maxmem", "setup.json");

const readSetupRecord = () =>
  existsSync(setupPath())
    ? (JSON.parse(readFileSync(setupPath(), "utf8")) as Partial<SetupRecord>)
    : undefined;

const writeSetupRecord = ({ entryPath }: Pick<SetupRecord, "entryPath">) => {
  mkdirSync(dirname(setupPath()), { recursive: true });
  writeFileSync(
    setupPath(),
    `${JSON.stringify({ entryPath, updatedAt: new Date().toISOString() }, null, 2)}\n`,
  );
};

const skipAutoSetup = (command: string | undefined) =>
  process.env.MAXMEM_SKIP_AUTO_SETUP === "1" ||
  !command ||
  command === "setup" ||
  command === "install-hooks" ||
  command === "hook" ||
  command === "statusline" ||
  command === "mcp";

export const runSetupCommand = ({ args, entryPath }: SetupCommandInput) => {
  const messages = installAllHooks({ entryPath });
  writeSetupRecord({ entryPath });

  if (!hasFlag({ args, name: "quiet" })) {
    messages.map((message) => console.log(message));
  }
};

export const ensureAutoSetup = ({ command, entryPath }: AutoSetupInput) => {
  const record = readSetupRecord();

  if (skipAutoSetup(command) || record?.entryPath === entryPath) {
    return;
  }

  runSetupCommand({ args: ["--quiet"], entryPath });
};
