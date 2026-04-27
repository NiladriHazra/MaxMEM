import { existsSync, readFileSync } from "node:fs";
import { redactList, redactText } from "./redaction";

export interface ParseTranscriptInput {
  path?: string;
}

interface ParsedLine {
  role: string;
  text: string;
}

interface JsonRecord {
  role?: string;
  type?: string;
  content?: unknown;
  message?: {
    role?: string;
    content?: unknown;
  };
  tool_name?: string;
  name?: string;
  command?: string;
  args?: {
    command?: string;
    filePath?: string;
    path?: string;
  };
}

interface TranscriptAccumulator {
  userMessages: string[];
  assistantMessages: string[];
  commands: string[];
  files: string[];
  decisions: string[];
  blockers: string[];
  rawChat: string[];
}

const emptySummary = (path: string) => ({
  path,
  userMessages: [],
  assistantMessages: [],
  commands: [],
  files: [],
  decisions: [],
  blockers: [],
  rawChat: [],
});

const unique = (values: string[]) => [...new Set(values.filter(Boolean))];

const textFromContent = (content: unknown) => {
  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((part) =>
        typeof part === "string"
          ? part
          : part && typeof part === "object" && "text" in part && typeof part.text === "string"
            ? part.text
            : "",
      )
      .filter(Boolean)
      .join("\n");
  }

  return "";
};

const parseJsonLine = (line: string) => {
  try {
    const record = JSON.parse(line) as JsonRecord;
    const text = textFromContent(record.message?.content ?? record.content);
    const role = record.message?.role ?? record.role ?? record.type ?? "event";
    const command = record.command ?? record.args?.command ?? "";
    const file = record.args?.filePath ?? record.args?.path ?? "";

    return {
      role,
      text: [text, command, file].filter(Boolean).join("\n"),
    };
  } catch {
    return {
      role: "plain",
      text: line,
    };
  }
};

const fileMatches = (text: string) =>
  text.match(
    /[A-Za-z0-9_./-]+\.(?:ts|tsx|js|jsx|json|md|toml|yaml|yml|css|scss|html|go|rs|py|sh|sql)/g,
  ) ?? [];

const commandMatches = (text: string) =>
  Array.from(text.matchAll(/(?:^|\s)(?:\$|>|!)\s*([^\n]{2,180})/g))
    .map((match) => match[1] ?? "")
    .filter(Boolean);

const decisionMatches = (text: string) =>
  text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => /\b(decided|decision|we will|use a|use the|choose|chosen)\b/i.test(line))
    .slice(0, 8);

const blockerMatches = (text: string) =>
  text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => /\b(blocked|blocker|failing|failed|cannot|can't|error)\b/i.test(line))
    .slice(0, 8);

const appendLine = (accumulator: TranscriptAccumulator, line: ParsedLine) => {
  const text = redactText({ text: line.text.trim() });

  if (!text) {
    return accumulator;
  }

  const isUser = /\buser\b/i.test(line.role);
  const isAssistant = /\bassistant\b/i.test(line.role);

  return {
    userMessages: isUser ? [...accumulator.userMessages, text] : accumulator.userMessages,
    assistantMessages: isAssistant
      ? [...accumulator.assistantMessages, text]
      : accumulator.assistantMessages,
    commands: [...accumulator.commands, ...commandMatches(text)],
    files: [...accumulator.files, ...fileMatches(text)],
    decisions: [...accumulator.decisions, ...decisionMatches(text)],
    blockers: [...accumulator.blockers, ...blockerMatches(text)],
    rawChat: [...accumulator.rawChat, `${line.role}: ${text}`],
  };
};

export const parseTranscript = ({ path }: ParseTranscriptInput) => {
  if (!path || !existsSync(path)) {
    return emptySummary(path ?? "");
  }

  const parsed = readFileSync(path, "utf8")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map(parseJsonLine)
    .reduce<TranscriptAccumulator>(appendLine, {
      userMessages: [],
      assistantMessages: [],
      commands: [],
      files: [],
      decisions: [],
      blockers: [],
      rawChat: [],
    });

  return {
    path,
    userMessages: redactList({ values: parsed.userMessages }).slice(-6),
    assistantMessages: redactList({ values: parsed.assistantMessages }).slice(-6),
    commands: unique(redactList({ values: parsed.commands })).slice(-12),
    files: unique(redactList({ values: parsed.files })).slice(-24),
    decisions: unique(redactList({ values: parsed.decisions })).slice(-12),
    blockers: unique(redactList({ values: parsed.blockers })).slice(-12),
    rawChat: redactList({ values: parsed.rawChat }).slice(-20),
  };
};
