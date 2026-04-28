import { existsSync, readFileSync } from "node:fs";
import { agentAdapters } from "./agents";
import { redactList, redactText } from "./redaction";
import type { Agent } from "./types";
import { resolveVerbosity } from "./verbosity";

export interface ParseTranscriptInput {
  path?: string;
  agent?: Agent;
  verbosity?: string;
}

interface ParseLineInput {
  line: string;
}

interface CommonJsonEventsInput {
  record: Record<string, unknown>;
  fallbackRole: TranscriptRole;
}

interface EmptySummaryInput {
  path: string;
  agent: Agent;
  parser: string;
}

interface ObjectFieldInput {
  record: Record<string, unknown>;
  name: string;
}

interface StringFieldInput {
  record: Record<string, unknown>;
  names: string[];
}

interface FieldFromRecordInput {
  record: Record<string, unknown>;
  names: string[];
}

interface ToolEventFromBlockInput {
  role: TranscriptRole;
  value: unknown;
}

interface ToolEventsFromContentInput {
  role: TranscriptRole;
  content: unknown;
}

interface EventWithDetailsInput {
  role: TranscriptRole;
  text: string;
  command?: string;
  file?: string;
  toolName?: string;
}

interface LimitValuesInput {
  values: string[];
  limit: number;
}

interface RedactEventInput {
  event: TranscriptEvent;
}

type TranscriptRole = "user" | "assistant" | "tool" | "system" | "event";

interface TranscriptEvent {
  role: TranscriptRole;
  text: string;
  command?: string;
  file?: string;
  toolName?: string;
}

interface TranscriptParser {
  name: string;
  parseLine(input: ParseLineInput): TranscriptEvent[];
}

const filePattern =
  /[A-Za-z0-9_./-]+\.(?:ts|tsx|js|jsx|json|jsonl|md|toml|yaml|yml|css|scss|html|go|rs|py|sh|sql|lock)/g;

const commandPattern = /(?:^|\s)(?:\$|>|!)\s*([^\n]{2,180})/g;

const emptySummary = ({ path, agent, parser }: EmptySummaryInput) => ({
  path,
  agent,
  parser,
  lineCount: 0,
  messageCount: 0,
  toolCallCount: 0,
  userMessages: [],
  assistantMessages: [],
  commands: [],
  files: [],
  decisions: [],
  blockers: [],
  rawChat: [],
});

const objectRecord = (value: unknown) =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;

const parsedObject = (value: unknown) => {
  if (typeof value !== "string") {
    return objectRecord(value);
  }

  try {
    return objectRecord(JSON.parse(value) as unknown);
  } catch {
    return undefined;
  }
};

const stringFrom = (value: unknown) => (typeof value === "string" ? value : undefined);

const objectField = ({ record, name }: ObjectFieldInput) => parsedObject(record[name]);

const stringField = ({ record, names }: StringFieldInput) =>
  names.map((name) => stringFrom(record[name])).find(Boolean);

const nestedObjects = (record: Record<string, unknown>) =>
  ["args", "input", "parameters", "arguments", "params", "item", "data"]
    .map((name) => objectField({ record, name }))
    .filter((value) => value !== undefined);

const fieldFromRecord = ({ record, names }: FieldFromRecordInput) => {
  const direct = stringField({ record, names });
  const nested = nestedObjects(record);
  const nestedDirect = nested.map((value) => stringField({ record: value, names })).find(Boolean);
  const nestedSecond = nested
    .flatMap(nestedObjects)
    .map((value) => stringField({ record: value, names }))
    .find(Boolean);

  return direct ?? nestedDirect ?? nestedSecond;
};

const commandFromRecord = (record: Record<string, unknown>) =>
  fieldFromRecord({ record, names: ["command", "cmd", "shellCommand"] });

const fileFromRecord = (record: Record<string, unknown>) =>
  fieldFromRecord({ record, names: ["filePath", "file_path", "path", "filename"] });

const toolNameFromRecord = (record: Record<string, unknown>) =>
  fieldFromRecord({ record, names: ["tool_name", "toolName", "name"] });

const textFromUnknown = (value: unknown): string => {
  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(textFromUnknown).filter(Boolean).join("\n");
  }

  const record = objectRecord(value);

  if (!record) {
    return "";
  }

  return (
    stringFrom(record.text) ??
    [record.content, record.body].map(textFromUnknown).find(Boolean) ??
    ""
  );
};

const roleFromValue = (value: unknown) => {
  const role = stringFrom(value)?.toLowerCase() ?? "";

  if (role.includes("user")) {
    return "user";
  }

  if (role.includes("assistant")) {
    return "assistant";
  }

  if (role.includes("tool") || role.includes("function")) {
    return "tool";
  }

  if (role.includes("system")) {
    return "system";
  }

  return "event";
};

const roleFromRecord = (record: Record<string, unknown>, fallbackRole: TranscriptRole) => {
  const message = objectField({ record, name: "message" });
  const role = roleFromValue(message?.role ?? record.role ?? record.type);

  return role === "event" ? fallbackRole : role;
};

const eventWithDetails = ({ role, text, command, file, toolName }: EventWithDetailsInput) => ({
  role,
  text,
  ...(command ? { command } : {}),
  ...(file ? { file } : {}),
  ...(toolName ? { toolName } : {}),
});

const messageContent = (record: Record<string, unknown>) => {
  const message = objectField({ record, name: "message" });

  return (
    message?.content ??
    record.content ??
    record.parts ??
    record.text ??
    record.body ??
    record.message
  );
};

const toolEventFromBlock = ({ role, value }: ToolEventFromBlockInput) => {
  const record = objectRecord(value);

  if (!record) {
    return undefined;
  }

  const type = stringFrom(record.type)?.toLowerCase() ?? "";
  const command = commandFromRecord(record);
  const file = fileFromRecord(record);
  const toolName = toolNameFromRecord(record);
  const text = textFromUnknown(record.text ?? record.content ?? record.input ?? record.arguments);
  const isTool = Boolean(
    command || file || toolName || type.includes("tool") || type.includes("function"),
  );

  return isTool
    ? eventWithDetails({
        role: "tool",
        text: [toolName, text, command, file].filter(Boolean).join("\n"),
        ...(command ? { command } : {}),
        ...(file ? { file } : {}),
        ...(toolName ? { toolName } : {}),
      })
    : role === "tool"
      ? eventWithDetails({ role, text })
      : undefined;
};

const toolEventsFromContent = ({ role, content }: ToolEventsFromContentInput) =>
  Array.isArray(content)
    ? content
        .map((value) => toolEventFromBlock({ role, value }))
        .filter((event) => event !== undefined)
    : [];

const commonJsonEvents = ({ record, fallbackRole }: CommonJsonEventsInput) => {
  const role = roleFromRecord(record, fallbackRole);
  const content = messageContent(record);
  const text = textFromUnknown(content);
  const command = commandFromRecord(record);
  const file = fileFromRecord(record);
  const toolName = toolNameFromRecord(record);
  const messageEvent =
    text || command || file || toolName
      ? [
          eventWithDetails({
            role,
            text,
            ...(command ? { command } : {}),
            ...(file ? { file } : {}),
            ...(toolName ? { toolName } : {}),
          }),
        ]
      : [];

  return [...messageEvent, ...toolEventsFromContent({ role, content })];
};

const jsonRecordFromLine = (line: string) => {
  try {
    return objectRecord(JSON.parse(line) as unknown);
  } catch {
    return undefined;
  }
};

const plainLineEvents = ({ line }: ParseLineInput) => [
  eventWithDetails({ role: "event", text: line }),
];

const codexParser = {
  name: "codex-jsonl",
  parseLine: ({ line }: ParseLineInput) => {
    const record = jsonRecordFromLine(line);

    if (!record) {
      return plainLineEvents({ line });
    }

    const item = objectField({ record, name: "item" });
    const target = item ?? record;
    const fallbackRole = roleFromRecord(record, "event");

    return commonJsonEvents({ record: target, fallbackRole });
  },
} satisfies TranscriptParser;

const claudeParser = {
  name: "claude-jsonl",
  parseLine: ({ line }: ParseLineInput) => {
    const record = jsonRecordFromLine(line);

    return record ? commonJsonEvents({ record, fallbackRole: "event" }) : plainLineEvents({ line });
  },
} satisfies TranscriptParser;

const opencodeParser = {
  name: "opencode-jsonl",
  parseLine: ({ line }: ParseLineInput) => {
    const record = jsonRecordFromLine(line);

    if (!record) {
      return plainLineEvents({ line });
    }

    const partEvents = Array.isArray(record.parts)
      ? toolEventsFromContent({ role: roleFromRecord(record, "event"), content: record.parts })
      : [];

    return [...commonJsonEvents({ record, fallbackRole: "event" }), ...partEvents];
  },
} satisfies TranscriptParser;

const transcriptParsers = {
  codex: codexParser,
  claude: claudeParser,
  opencode: opencodeParser,
} satisfies Record<Agent, TranscriptParser>;

const parserForAgent = (agent: Agent) => transcriptParsers[agentAdapters[agent].transcriptParser];

const unique = (values: string[]) => [...new Set(values.filter(Boolean))];

const limitValues = ({ values, limit }: LimitValuesInput) => (limit ? values.slice(-limit) : []);

const fileMatches = (text: string) => text.match(filePattern) ?? [];

const commandMatches = (text: string) =>
  Array.from(text.matchAll(commandPattern))
    .map((match) => match[1] ?? "")
    .filter(Boolean);

const decisionMatches = (text: string) =>
  text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => /\b(decided|decision|we will|use a|use the|choose|chosen)\b/i.test(line));

const blockerMatches = (text: string) =>
  text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => /\b(blocked|blocker|failing|failed|cannot|can't|error)\b/i.test(line));

const redactEvent = ({ event }: RedactEventInput) =>
  eventWithDetails({
    role: event.role,
    text: redactText({ text: event.text.trim() }),
    ...(event.command ? { command: redactText({ text: event.command.trim() }) } : {}),
    ...(event.file ? { file: redactText({ text: event.file.trim() }) } : {}),
    ...(event.toolName ? { toolName: redactText({ text: event.toolName.trim() }) } : {}),
  });

export const parseTranscript = ({ path, agent = "codex", verbosity }: ParseTranscriptInput) => {
  const parser = parserForAgent(agent);
  const config = resolveVerbosity({ preset: verbosity });

  if (!path || !existsSync(path)) {
    return emptySummary({ path: path ?? "", agent, parser: parser.name });
  }

  const lines = readFileSync(path, "utf8")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const events = lines.flatMap((line) => parser.parseLine({ line }));
  const redactedEvents = events
    .map((event) => redactEvent({ event }))
    .filter((event) => event.text || event.command || event.file || event.toolName);
  const eventTexts = redactedEvents.map((event) =>
    [event.text, event.command, event.file].filter(Boolean).join("\n"),
  );
  const userMessages = redactedEvents
    .filter((event) => event.role === "user")
    .map((event) => event.text)
    .filter(Boolean);
  const assistantMessages = redactedEvents
    .filter((event) => event.role === "assistant")
    .map((event) => event.text)
    .filter(Boolean);
  const toolEvents = redactedEvents.filter(
    (event) => event.role === "tool" || Boolean(event.command || event.toolName),
  );
  const limits = config.transcript;

  return {
    path,
    agent,
    parser: parser.name,
    lineCount: lines.length,
    messageCount: userMessages.length + assistantMessages.length,
    toolCallCount: toolEvents.length,
    userMessages: limitValues({ values: userMessages, limit: limits.userMessages }),
    assistantMessages: limitValues({
      values: assistantMessages,
      limit: limits.assistantMessages,
    }),
    commands: limitValues({
      values: unique(
        redactList({
          values: [
            ...redactedEvents.map((event) => event.command ?? ""),
            ...eventTexts.flatMap(commandMatches),
          ],
        }),
      ),
      limit: limits.commands,
    }),
    files: limitValues({
      values: unique(
        redactList({
          values: [
            ...redactedEvents.map((event) => event.file ?? ""),
            ...eventTexts.flatMap(fileMatches),
          ],
        }),
      ),
      limit: limits.files,
    }),
    decisions: limitValues({
      values: unique(redactList({ values: eventTexts.flatMap(decisionMatches) })),
      limit: limits.decisions,
    }),
    blockers: limitValues({
      values: unique(redactList({ values: eventTexts.flatMap(blockerMatches) })),
      limit: limits.blockers,
    }),
    rawChat: limitValues({
      values: redactList({
        values: redactedEvents.map(
          (event) =>
            `${event.role}: ${[event.text, event.command, event.file].filter(Boolean).join(" ")}`,
        ),
      }),
      limit: limits.rawChat,
    }),
  };
};
