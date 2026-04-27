import { describe, expect, test } from "bun:test";
import { renderCapsule } from "../src/core/capsule";
import type { HandoffCapsule } from "../src/core/types";

const capsule: HandoffCapsule = {
  id: "capsule-1",
  repoRoot: "/repo",
  branch: "main",
  sourceAgent: "codex",
  goal: "Ship handoff",
  summary: "Repository /repo on main; no changed files.",
  files: ["src/main.ts"],
  commands: ["bun test"],
  decisions: ["Use compact capsules"],
  blockers: ["No blocker"],
  rawChat: ["user: token sk-proj_abcdefghijklmnopqrstuvwxyz"],
  transcriptPath: "/tmp/session.jsonl",
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
    recentCommits: ["abc123 Initial"],
  },
  privacy: {
    includeRawChat: true,
    redacted: true,
  },
  createdAt: "2026-04-27T00:00:00.000Z",
};

describe("renderCapsule", () => {
  test("keeps raw chat out unless explicitly requested", () => {
    const rendered = renderCapsule({ capsule });

    expect(rendered).not.toContain("Raw chat:");
    expect(rendered).toContain("Raw chat included: false");
  });

  test("renders selected sections", () => {
    const rendered = renderCapsule({ capsule, options: { rawChat: true, commands: false } });

    expect(rendered).toContain("Raw chat:");
    expect(rendered).not.toContain("Commands:");
    expect(rendered).toContain("Raw chat included: true");
    expect(rendered).not.toContain("abcdefghijklmnopqrstuvwxyz");
  });
});
