import { mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { Database } from "bun:sqlite";
import type { Agent, HandoffCapsule, SessionRecord } from "./types";

interface SaveSessionInput {
  session: SessionRecord;
}

interface SaveCapsuleInput {
  capsule: HandoffCapsule;
}

interface LatestCapsuleInput {
  repoRoot: string;
  branch: string;
}

interface LatestSessionInput {
  repoRoot: string;
  agent?: Agent;
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
    raw_chat_json text not null default '[]',
    transcript_path text not null default '',
    next_prompt text not null,
    git_json text not null,
    privacy_json text not null default '{"includeRawChat":false,"redacted":true}',
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
];

const migrations = [
  "alter table capsules add column raw_chat_json text not null default '[]'",
  "alter table capsules add column transcript_path text not null default ''",
  'alter table capsules add column privacy_json text not null default \'{"includeRawChat":false,"redacted":true}\'',
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

const rowToCapsule = (row: CapsuleRow) => ({
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
  rawChat: JSON.parse(row.raw_chat_json) as string[],
  transcriptPath: row.transcript_path,
  nextPrompt: row.next_prompt,
  git: JSON.parse(row.git_json) as HandoffCapsule["git"],
  privacy: JSON.parse(row.privacy_json) as HandoffCapsule["privacy"],
  createdAt: row.created_at,
});

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
      commands_json, decisions_json, blockers_json, raw_chat_json, transcript_path,
      next_prompt, git_json, privacy_json, created_at
    ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
    JSON.stringify(capsule.rawChat),
    capsule.transcriptPath,
    capsule.nextPrompt,
    JSON.stringify(capsule.git),
    JSON.stringify(capsule.privacy),
    capsule.createdAt,
  );

  db.close();
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
