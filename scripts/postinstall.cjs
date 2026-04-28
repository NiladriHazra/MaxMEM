#!/usr/bin/env node
const { spawnSync } = require("node:child_process");
const { existsSync } = require("node:fs");
const { homedir } = require("node:os");
const { join, resolve } = require("node:path");

const packageRoot = resolve(__dirname, "..");
const binPath = join(packageRoot, "bin", "maxmem");
const bunCandidates = [
  process.env.BUN_INSTALL ? join(process.env.BUN_INSTALL, "bin", "bun") : "",
  join(homedir(), ".bun", "bin", "bun"),
  "/opt/homebrew/bin/bun",
  "/usr/local/bin/bun",
  "bun",
].filter(Boolean);

const bunPath = bunCandidates.find((candidate) => candidate === "bun" || existsSync(candidate));

if (!bunPath) {
  console.warn(
    "MaxMEM auto-setup skipped: Bun was not found. Install Bun, then run `maxmem setup`.",
  );
  process.exit(0);
}

const result = spawnSync(bunPath, [binPath, "setup"], {
  cwd: packageRoot,
  env: {
    ...process.env,
    MAXMEM_POSTINSTALL: "1",
    MAXMEM_SKIP_AUTO_SETUP: "1",
  },
  stdio: "inherit",
});

if (result.error) {
  console.warn(`MaxMEM auto-setup failed: ${result.error.message}`);
  process.exit(0);
}

if (result.status) {
  console.warn(
    `MaxMEM auto-setup exited with ${result.status}. Run \`maxmem setup\` if commands are missing.`,
  );
}
