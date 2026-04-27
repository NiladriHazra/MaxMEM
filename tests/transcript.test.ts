import { describe, expect, test } from "bun:test";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseTranscript } from "../src/core/transcript";

describe("parseTranscript", () => {
  test("extracts useful handoff fields from jsonl", () => {
    const directory = mkdtempSync(join(tmpdir(), "maxmem-transcript-"));
    const path = join(directory, "session.jsonl");
    const lines = [
      JSON.stringify({
        message: {
          role: "user",
          content: "Please fix src/core/capsule.ts and run $ bun test",
        },
      }),
      JSON.stringify({
        message: {
          role: "assistant",
          content: "Decision: use compact capsules. Blocker: failing test in tests/capsule.test.ts",
        },
      }),
    ];

    writeFileSync(path, `${lines.join("\n")}\n`);

    const summary = parseTranscript({ path });

    expect(summary.userMessages).toHaveLength(1);
    expect(summary.files).toContain("src/core/capsule.ts");
    expect(summary.files).toContain("tests/capsule.test.ts");
    expect(summary.commands).toContain("bun test");
    expect(summary.decisions[0]).toContain("Decision");
    expect(summary.blockers[0]).toContain("Blocker");
  });
});
