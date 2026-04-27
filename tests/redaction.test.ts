import { describe, expect, test } from "bun:test";
import { redactText } from "../src/core/redaction";

describe("redactText", () => {
  test("masks token-shaped secrets and env files", () => {
    const redacted = redactText({
      text: "OPENAI_API_KEY=sk-proj_abcdefghijklmnopqrstuvwxyz read .env.local with Bearer abc.def.ghi",
    });

    expect(redacted).toContain("OPENAI_API_KEY=[redacted]");
    expect(redacted).toContain("[redacted-env-file]");
    expect(redacted).toContain("Bearer [redacted]");
    expect(redacted).not.toContain("abcdefghijklmnopqrstuvwxyz");
  });
});
