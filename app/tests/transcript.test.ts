import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { parseTranscript } from "../src/core/transcript";

const fixturePath = (name: string) => join(import.meta.dir, "fixtures", "transcripts", name);

describe("parseTranscript", () => {
  test("extracts Codex messages, shell calls, and handoff signals", () => {
    const summary = parseTranscript({ path: fixturePath("codex.jsonl"), agent: "codex" });

    expect(summary.agent).toBe("codex");
    expect(summary.parser).toBe("codex-jsonl");
    expect(summary.lineCount).toBe(3);
    expect(summary.toolCallCount).toBe(1);
    expect(summary.commands).toContain("bun test");
    expect(summary.commands).toContain("bun run lint");
    expect(summary.files).toContain("src/core/capsule.ts");
    expect(summary.files).toContain("tests/capsule.test.ts");
    expect(summary.decisions[0]).toContain("Decision");
    expect(summary.blockers[0]).toContain("Blocker");
  });

  test("extracts Claude content blocks and tool use", () => {
    const summary = parseTranscript({ path: fixturePath("claude.jsonl"), agent: "claude" });

    expect(summary.agent).toBe("claude");
    expect(summary.parser).toBe("claude-jsonl");
    expect(summary.toolCallCount).toBe(2);
    expect(summary.commands).toContain("bun test tests/transcript.test.ts");
    expect(summary.files).toContain("src/core/transcript.ts");
    expect(summary.files).toContain("tests/transcript.test.ts");
    expect(summary.decisions[0]).toContain("Decision");
    expect(summary.blockers[0]).toContain("Blocker");
  });

  test("extracts OpenCode part text and tool activity", () => {
    const summary = parseTranscript({
      path: fixturePath("opencode.jsonl"),
      agent: "opencode",
    });

    expect(summary.agent).toBe("opencode");
    expect(summary.parser).toBe("opencode-jsonl");
    expect(summary.toolCallCount).toBe(2);
    expect(summary.commands).toContain("bun run build");
    expect(summary.files).toContain("src/core/agents.ts");
    expect(summary.files).toContain("src/core/transcript.ts");
    expect(summary.decisions[0]).toContain("We will use");
    expect(summary.blockers[0]).toContain("Blocker");
  });

  test("verbosity presets keep raw chat private unless full is requested", () => {
    const compact = parseTranscript({ path: fixturePath("codex.jsonl"), agent: "codex" });
    const full = parseTranscript({
      path: fixturePath("codex.jsonl"),
      agent: "codex",
      verbosity: "full",
    });

    expect(compact.rawChat).toHaveLength(0);
    expect(full.rawChat.length).toBeGreaterThan(0);
  });
});
