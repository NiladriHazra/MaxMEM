import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { Database } from "bun:sqlite";
import { redactText } from "./redaction";
import type {
  Agent,
  HandoffCapsule,
  HandoffReadRecord,
  HandoffTaskState,
  SessionRecord,
} from "./types";

interface SaveSessionInput {
  session: SessionRecord;
}

interface SaveCapsuleInput {
  capsule: HandoffCapsule;
}

interface SaveProjectMemoryInput {
  repoRoot: string;
  kind: string;
  content: string;
  source?: string;
}

interface ListProjectMemoryInput {
  repoRoot: string;
  kind?: string;
  limit?: number;
}

interface RecordHandoffReadInput {
  capsuleId: string;
  repoRoot: string;
  branch: string;
  consumerAgent?: Agent | "unknown";
  source?: string;
}

interface ListHandoffReadsInput {
  repoRoot: string;
  capsuleId?: string;
  limit?: number;
}

interface LatestCapsuleInput {
  repoRoot: string;
  branch: string;
}

interface LatestSessionInput {
  repoRoot: string;
  agent?: Agent;
}

interface ListCapsulesInput {
  repoRoot: string;
  branch?: string;
  limit?: number;
}

interface ListSessionsInput {
  repoRoot: string;
  limit?: number;
}

interface CapsuleRow {
  id: string;
  repo_root: string;
  branch: string;
  source_agent: Agent;
  goal: string;
  summary: string;
  files_json: string;
  commands_json: string;
  decisions_json: string;
  blockers_json: string;
  task_state_json: string;
  raw_chat_json: string;
  transcript_path: string;
  next_prompt: string;
  git_json: string;
  privacy_json: string;
  created_at: string;
}

interface SessionRow {
  id: string;
  agent: Agent;
  cwd: string;
  repo_root: string;
  branch: string;
  transcript_path: string;
  created_at: string;
  updated_at: string;
}

interface ProjectMemoryRow {
  id: string;
  repo_root: string;
  kind: string;
  content: string;
  source: string;
  created_at: string;
  updated_at: string;
}

interface HandoffReadRow {
  id: string;
  capsule_id: string;
  repo_root: string;
  branch: string;
  consumer_agent: Agent | "unknown";
  source: string;
  read_at: string;
}

const schemaStatements = [
  `
  create table if not exists sessions (
    id text primary key,
    agent text not null,
    cwd text not null,
    repo_root text not null,
    branch text not null,
    transcript_path text not null,
    created_at text not null,
    updated_at text not null
  )
  `,
  `
  create table if not exists capsules (
    id text primary key,
    repo_root text not null,
    branch text not null,
    source_agent text not null,
    goal text not null,
    summary text not null,
    files_json text not null,
    commands_json text not null,
    decisions_json text not null,
    blockers_json text not null,
    task_state_json text not null default '{"currentTask":"","nextActions":[],"openQuestions":[],"verification":[],"risks":[]}',
    raw_chat_json text not null default '[]',
    transcript_path text not null default '',
    next_prompt text not null,
    git_json text not null,
    privacy_json text not null default '{"includeRawChat":false,"redacted":true,"preset":"compact"}',
    created_at text not null
  )
  `,
  `
  create index if not exists capsules_repo_branch_created_at
  on capsules (repo_root, branch, created_at)
  `,
  `
  create index if not exists sessions_repo_agent_updated_at
  on sessions (repo_root, agent, updated_at)
  `,
  `
  create table if not exists project_memory (
    id text primary key,
    repo_root text not null,
    kind text not null,
    content text not null,
    source text not null,
    created_at text not null,
    updated_at text not null,
    unique(repo_root, kind, content)
  )
  `,
  `
  create index if not exists project_memory_repo_updated_at
  on project_memory (repo_root, updated_at)
  `,
  `
  create table if not exists handoff_reads (
    id text primary key,
    capsule_id text not null,
    repo_root text not null,
    branch text not null,
    consumer_agent text not null,
    source text not null,
    read_at text not null
  )
  `,
  `
  create index if not exists handoff_reads_repo_read_at
  on handoff_reads (repo_root, read_at)
  `,
  `
  create index if not exists handoff_reads_capsule_read_at
  on handoff_reads (capsule_id, read_at)
  `,
];

const migrations = [
  "alter table capsules add column raw_chat_json text not null default '[]'",
  "alter table capsules add column transcript_path text not null default ''",
  'alter table capsules add column privacy_json text not null default \'{"includeRawChat":false,"redacted":true,"preset":"compact"}\'',
  'alter table capsules add column task_state_json text not null default \'{"currentTask":"","nextActions":[],"openQuestions":[],"verification":[],"risks":[]}\'',
];

export const dataDirectory = () => process.env.MAXMEM_DATA_DIR ?? join(homedir(), ".maxmem");

export const openStore = () => {
  mkdirSync(dataDirectory(), { recursive: true });

  const db = new Database(join(dataDirectory(), "maxmem.sqlite"));
  db.exec("pragma busy_timeout = 5000");
  schemaStatements.map((statement) => db.exec(statement));
  migrations.map((migration) => {
    try {
      db.exec(migration);
    } catch {
      return;
    }
  });

  return db;
};

const defaultTaskState = () =>
  ({
    currentTask: "",
    nextActions: [],
    openQuestions: [],
    verification: [],
    risks: [],
  }) satisfies HandoffTaskState;

const parseTaskState = (value: string) => {
  try {
    const taskState = JSON.parse(value) as Partial<HandoffTaskState>;

    return {
      ...defaultTaskState(),
      ...taskState,
      currentTask: taskState.currentTask ?? "",
      nextActions: taskState.nextActions ?? [],
      openQuestions: taskState.openQuestions ?? [],
      verification: taskState.verification ?? [],
      risks: taskState.risks ?? [],
    };
  } catch {
    return defaultTaskState();
  }
};

const rowToCapsule = (row: CapsuleRow) => {
  const privacy = JSON.parse(row.privacy_json) as Partial<HandoffCapsule["privacy"]>;

  return {
    id: row.id,
    repoRoot: row.repo_root,
    branch: row.branch,
    sourceAgent: row.source_agent,
    goal: row.goal,
    summary: row.summary,
    files: JSON.parse(row.files_json) as string[],
    commands: JSON.parse(row.commands_json) as string[],
    decisions: JSON.parse(row.decisions_json) as string[],
    blockers: JSON.parse(row.blockers_json) as string[],
    taskState: parseTaskState(row.task_state_json),
    rawChat: JSON.parse(row.raw_chat_json) as string[],
    transcriptPath: row.transcript_path,
    nextPrompt: row.next_prompt,
    git: JSON.parse(row.git_json) as HandoffCapsule["git"],
    privacy: {
      includeRawChat: privacy.includeRawChat ?? false,
      redacted: privacy.redacted ?? true,
      preset: privacy.preset ?? "compact",
    },
    createdAt: row.created_at,
  };
};

const rowToSession = (row: SessionRow) => ({
  id: row.id,
  agent: row.agent,
  cwd: row.cwd,
  repoRoot: row.repo_root,
  branch: row.branch,
  transcriptPath: row.transcript_path,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const rowToProjectMemory = (row: ProjectMemoryRow) => ({
  id: row.id,
  repoRoot: row.repo_root,
  kind: row.kind,
  content: row.content,
  source: row.source,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const rowToHandoffRead = (row: HandoffReadRow) => ({
  id: row.id,
  capsuleId: row.capsule_id,
  repoRoot: row.repo_root,
  branch: row.branch,
  consumerAgent: row.consumer_agent,
  source: row.source,
  readAt: row.read_at,
});

export const saveSession = ({ session }: SaveSessionInput) => {
  const db = openStore();

  db.query(`
    insert into sessions (
      id, agent, cwd, repo_root, branch, transcript_path, created_at, updated_at
    ) values (?, ?, ?, ?, ?, ?, ?, ?)
    on conflict(id) do update set
      agent = excluded.agent,
      cwd = excluded.cwd,
      repo_root = excluded.repo_root,
      branch = excluded.branch,
      transcript_path = excluded.transcript_path,
      updated_at = excluded.updated_at
  `).run(
    session.id,
    session.agent,
    session.cwd,
    session.repoRoot,
    session.branch,
    session.transcriptPath,
    session.createdAt,
    session.updatedAt,
  );

  db.close();
};

export const saveCapsule = ({ capsule }: SaveCapsuleInput) => {
  const db = openStore();

  db.query(`
    insert into capsules (
      id, repo_root, branch, source_agent, goal, summary, files_json,
      commands_json, decisions_json, blockers_json, task_state_json, raw_chat_json,
      transcript_path, next_prompt, git_json, privacy_json, created_at
    ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    capsule.id,
    capsule.repoRoot,
    capsule.branch,
    capsule.sourceAgent,
    capsule.goal,
    capsule.summary,
    JSON.stringify(capsule.files),
    JSON.stringify(capsule.commands),
    JSON.stringify(capsule.decisions),
    JSON.stringify(capsule.blockers),
    JSON.stringify(capsule.taskState),
    JSON.stringify(capsule.rawChat),
    capsule.transcriptPath,
    capsule.nextPrompt,
    JSON.stringify(capsule.git),
    JSON.stringify(capsule.privacy),
    capsule.createdAt,
  );

  db.close();
};

export const saveProjectMemory = ({
  repoRoot,
  kind,
  content,
  source = "maxmem",
}: SaveProjectMemoryInput) => {
  const db = openStore();
  const timestamp = new Date().toISOString();
  const redacted = redactText({ text: content.trim() });

  if (!redacted) {
    db.close();
    return undefined;
  }

  db.query(`
    insert into project_memory (
      id, repo_root, kind, content, source, created_at, updated_at
    ) values (?, ?, ?, ?, ?, ?, ?)
    on conflict(repo_root, kind, content) do update set
      source = excluded.source,
      updated_at = excluded.updated_at
  `).run(randomUUID(), repoRoot, kind, redacted, source, timestamp, timestamp);

  const row = db
    .query(`
      select * from project_memory
      where repo_root = ? and kind = ? and content = ?
      limit 1
    `)
    .get(repoRoot, kind, redacted) as ProjectMemoryRow | null;

  db.close();

  return row ? rowToProjectMemory(row) : undefined;
};

export const listProjectMemory = ({ repoRoot, kind, limit = 20 }: ListProjectMemoryInput) => {
  const db = openStore();
  const rows = kind
    ? (db
        .query(`
      select * from project_memory
      where repo_root = ? and kind = ?
      order by updated_at desc
      limit ?
    `)
        .all(repoRoot, kind, limit) as ProjectMemoryRow[])
    : (db
        .query(`
      select * from project_memory
      where repo_root = ?
      order by updated_at desc
      limit ?
    `)
        .all(repoRoot, limit) as ProjectMemoryRow[]);
  const memory = rows.map(rowToProjectMemory);

  db.close();

  return memory;
};

export const recordHandoffRead = ({
  capsuleId,
  repoRoot,
  branch,
  consumerAgent = "unknown",
  source = "inject",
}: RecordHandoffReadInput) => {
  const db = openStore();
  const read: HandoffReadRecord = {
    id: randomUUID(),
    capsuleId,
    repoRoot,
    branch,
    consumerAgent,
    source,
    readAt: new Date().toISOString(),
  };

  db.query(`
    insert into handoff_reads (
      id, capsule_id, repo_root, branch, consumer_agent, source, read_at
    ) values (?, ?, ?, ?, ?, ?, ?)
  `).run(
    read.id,
    read.capsuleId,
    read.repoRoot,
    read.branch,
    read.consumerAgent,
    read.source,
    read.readAt,
  );

  db.close();

  return read;
};

export const listHandoffReads = ({ repoRoot, capsuleId, limit = 20 }: ListHandoffReadsInput) => {
  const db = openStore();
  const rows = capsuleId
    ? (db
        .query(`
      select * from handoff_reads
      where repo_root = ? and capsule_id = ?
      order by read_at desc
      limit ?
    `)
        .all(repoRoot, capsuleId, limit) as HandoffReadRow[])
    : (db
        .query(`
      select * from handoff_reads
      where repo_root = ?
      order by read_at desc
      limit ?
    `)
        .all(repoRoot, limit) as HandoffReadRow[]);
  const reads = rows.map(rowToHandoffRead);

  db.close();

  return reads;
};

export const getLatestCapsule = ({ repoRoot, branch }: LatestCapsuleInput) => {
  const db = openStore();
  const branchRow = db
    .query(`
    select * from capsules
    where repo_root = ? and branch = ?
    order by created_at desc
    limit 1
  `)
    .get(repoRoot, branch) as CapsuleRow | null;
  const fallbackRow = db
    .query(`
    select * from capsules
    where repo_root = ?
    order by created_at desc
    limit 1
  `)
    .get(repoRoot) as CapsuleRow | null;
  const capsule = branchRow
    ? rowToCapsule(branchRow)
    : fallbackRow
      ? rowToCapsule(fallbackRow)
      : undefined;

  db.close();

  return capsule;
};

export const getLatestSession = ({ repoRoot, agent }: LatestSessionInput) => {
  const db = openStore();
  const row = agent
    ? (db
        .query(`
      select * from sessions
      where repo_root = ? and agent = ?
      order by updated_at desc
      limit 1
    `)
        .get(repoRoot, agent) as SessionRow | null)
    : (db
        .query(`
      select * from sessions
      where repo_root = ?
      order by updated_at desc
      limit 1
    `)
        .get(repoRoot) as SessionRow | null);
  const session = row ? rowToSession(row) : undefined;

  db.close();

  return session;
};

export const listCapsules = ({ repoRoot, branch, limit = 12 }: ListCapsulesInput) => {
  const db = openStore();
  const rows = branch
    ? (db
        .query(`
      select * from capsules
      where repo_root = ? and branch = ?
      order by created_at desc
      limit ?
    `)
        .all(repoRoot, branch, limit) as CapsuleRow[])
    : (db
        .query(`
      select * from capsules
      where repo_root = ?
      order by created_at desc
      limit ?
    `)
        .all(repoRoot, limit) as CapsuleRow[]);
  const capsules = rows.map(rowToCapsule);

  db.close();

  return capsules;
};

export const listSessions = ({ repoRoot, limit = 12 }: ListSessionsInput) => {
  const db = openStore();
  const rows = db
    .query(`
      select * from sessions
      where repo_root = ?
      order by updated_at desc
      limit ?
    `)
    .all(repoRoot, limit) as SessionRow[];
  const sessions = rows.map(rowToSession);

  db.close();

  return sessions;
};
