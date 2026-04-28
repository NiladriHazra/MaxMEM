import { describe, expect, test } from "bun:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  getLatestCapsule,
  listHandoffReads,
  listProjectMemory,
  recordHandoffRead,
  saveCapsule,
  saveProjectMemory,
} from "../src/core/store";
import type { HandoffCapsule } from "../src/core/types";

const tempStore = () => {
  process.env.MAXMEM_DATA_DIR = mkdtempSync(join(tmpdir(), "maxmem-test-"));
};

const capsule = () =>
  ({
    id: "capsule-store-1",
    repoRoot: "/repo",
    branch: "main",
    sourceAgent: "codex",
    goal: "Continue store work",
    summary: "Repository /repo on main; no changed files.",
    files: [],
    commands: ["bun test"],
    decisions: ["Use SQLite"],
    blockers: [],
    taskState: {
      currentTask: "Continue store work",
      nextActions: ["Run store tests"],
      openQuestions: [],
      verification: ["bun test"],
      risks: [],
    },
    rawChat: [],
    transcriptPath: "",
    nextPrompt: "Continue this task",
    git: {
      cwd: "/repo",
      repoRoot: "/repo",
      isRepo: true,
      branch: "main",
      head: "abc123",
      status: [],
      changedFiles: [],
      diffStat: "",
      recentCommits: [],
    },
    privacy: {
      includeRawChat: false,
      redacted: true,
      preset: "compact",
    },
    createdAt: "2026-04-28T00:00:00.000Z",
  }) satisfies HandoffCapsule;

describe("store", () => {
  test("persists task state, project memory, and read tracking", () => {
    tempStore();
    saveCapsule({ capsule: capsule() });
    saveProjectMemory({
      repoRoot: "/repo",
      kind: "decision",
      content: "Keep handoffs local",
      source: "test",
    });
    recordHandoffRead({
      capsuleId: "capsule-store-1",
      repoRoot: "/repo",
      branch: "main",
      consumerAgent: "claude",
      source: "test",
    });

    const latest = getLatestCapsule({ repoRoot: "/repo", branch: "main" });
    const memory = listProjectMemory({ repoRoot: "/repo" });
    const reads = listHandoffReads({ repoRoot: "/repo" });

    expect(latest?.taskState.currentTask).toBe("Continue store work");
    expect(latest?.taskState.verification).toContain("bun test");
    expect(memory[0]?.content).toBe("Keep handoffs local");
    expect(reads[0]?.consumerAgent).toBe("claude");
  });
});
