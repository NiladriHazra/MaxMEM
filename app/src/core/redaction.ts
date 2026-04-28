export interface RedactTextInput {
  text: string;
}

export interface RedactListInput {
  values: string[];
}

interface RedactionRule {
  pattern: RegExp;
  replacement: string;
}

const rules: RedactionRule[] = [
  {
    pattern:
      /\b(sk-[A-Za-z0-9_-]{16,}|sk-proj-[A-Za-z0-9_-]{16,}|ghp_[A-Za-z0-9_]{20,}|github_pat_[A-Za-z0-9_]{20,})\b/g,
    replacement: "[redacted-token]",
  },
  {
    pattern:
      /\b([A-Z0-9_]*(?:API_KEY|TOKEN|SECRET|PASSWORD|AUTH)[A-Z0-9_]*)\s*=\s*["']?[^"'\s]+["']?/gi,
    replacement: "$1=[redacted]",
  },
  {
    pattern: /\b(Bearer|Basic)\s+[A-Za-z0-9._~+/-]+=*/g,
    replacement: "$1 [redacted]",
  },
  {
    pattern: /(?:^|[\s/])\.env(?:\.[A-Za-z0-9_-]+)?/g,
    replacement: " [redacted-env-file]",
  },
  {
    pattern: /https?:\/\/[^/\s:@]+:[^@\s]+@[^\s]+/g,
    replacement: "[redacted-auth-url]",
  },
];

export const redactText = ({ text }: RedactTextInput) =>
  rules.reduce((current, rule) => current.replace(rule.pattern, rule.replacement), text);

export const redactList = ({ values }: RedactListInput) =>
  values.map((value) => redactText({ text: value })).filter(Boolean);
