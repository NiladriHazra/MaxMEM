import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type { CommandInput } from "./installerTypes";

interface TomlBlockInput {
  content: string;
  header: string;
  block: string;
}

export const shellQuote = (value: string) => `'${value.replaceAll("'", "'\"'\"'")}'`;

export const hookCommand = ({ entryPath, args }: CommandInput) =>
  [shellQuote(process.execPath), shellQuote(entryPath), ...args.map(shellQuote)].join(" ");

export const readJson = <T>(path: string, fallback: T) =>
  existsSync(path) ? (JSON.parse(readFileSync(path, "utf8")) as T) : fallback;

const escapedRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const upsertTomlBlock = ({ content, header, block }: TomlBlockInput) => {
  const pattern = new RegExp(
    `\\n?\\[${escapedRegExp(header)}\\][\\s\\S]*?(?=\\n\\[[^\\n]+\\]|\\s*$)`,
  );
  const cleaned = content.replace(pattern, "").trimEnd();

  return `${cleaned}\n\n${block.trim()}\n`;
};

const backupPath = (path: string) =>
  `${path}.maxmem-${new Date().toISOString().replaceAll(":", "-").replaceAll(".", "-")}.bak`;

const backupFile = (path: string) => existsSync(path) && copyFileSync(path, backupPath(path));

export const writeJson = (path: string, value: unknown) => {
  mkdirSync(dirname(path), { recursive: true });
  backupFile(path);
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
};

export const writeText = (path: string, value: string) => {
  mkdirSync(dirname(path), { recursive: true });
  backupFile(path);
  writeFileSync(path, value);
};
