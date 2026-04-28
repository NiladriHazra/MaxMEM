import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { agentFromValue } from "../core/agents";
import { createCapsule, renderCapsule } from "../core/capsule";
import { getGitContext } from "../core/git";
import { launchAgent } from "../core/launch";
import { getLatestCapsule, getLatestSession, listCapsules, listSessions } from "../core/store";
import { optionValue, hasFlag } from "../cli/options";

export interface CompanionCommandInput {
  args: string[];
  cwd: string;
  entryPath: string;
}

interface JsonResponseInput {
  value: unknown;
  status?: number;
}

interface RequestBody {
  agent?: string;
  cwd?: string;
  goal?: string;
  verbosity?: string;
}

const jsonResponse = ({ value, status = 200 }: JsonResponseInput) =>
  new Response(JSON.stringify(value, null, 2), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });

const companionHtml = () => `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>MaxMEM Companion</title>
    <style>
      :root {
        color-scheme: dark;
        --paper: #f1eee6;
        --ink: #141414;
        --soot: #050505;
        --line: rgba(241, 238, 230, 0.18);
        --wash: rgba(241, 238, 230, 0.08);
        --accent: #d8d0bd;
        --muted: rgba(241, 238, 230, 0.62);
      }

      * { box-sizing: border-box; }

      body {
        margin: 0;
        min-height: 100vh;
        background:
          radial-gradient(circle at 78% 18%, rgba(241, 238, 230, 0.10), transparent 26rem),
          linear-gradient(115deg, #050505 0%, #111 48%, #070707 100%);
        color: var(--paper);
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      }

      main {
        display: grid;
        grid-template-columns: minmax(220px, 320px) minmax(0, 1fr) 300px;
        min-height: 100vh;
      }

      aside, section {
        border-right: 1px solid var(--line);
        padding: 22px;
      }

      .brand {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 16px;
        padding-bottom: 18px;
        border-bottom: 1px solid var(--line);
      }

      h1, h2, h3, p { margin: 0; }

      h1 {
        font-family: Georgia, "Times New Roman", serif;
        font-size: 30px;
        font-weight: 500;
        letter-spacing: 0;
      }

      h2 {
        color: var(--accent);
        font-size: 12px;
        font-weight: 700;
        margin: 24px 0 10px;
        text-transform: uppercase;
      }

      .repo {
        color: var(--muted);
        font-size: 12px;
        line-height: 1.6;
        margin-top: 18px;
      }

      .capsule-list {
        display: grid;
        gap: 8px;
      }

      .capsule {
        border: 1px solid var(--line);
        border-radius: 6px;
        background: var(--wash);
        color: var(--paper);
        cursor: pointer;
        padding: 10px;
        text-align: left;
        width: 100%;
      }

      .capsule:hover, button:hover {
        border-color: rgba(241, 238, 230, 0.44);
      }

      .capsule strong {
        display: block;
        font-size: 12px;
        margin-bottom: 6px;
      }

      .capsule span, .muted {
        color: var(--muted);
        font-size: 11px;
      }

      .work {
        min-width: 0;
        padding: 24px 28px;
      }

      .capsule-text {
        border-top: 1px solid var(--line);
        color: #eee8db;
        font-size: 13px;
        line-height: 1.55;
        margin-top: 22px;
        overflow: auto;
        padding-top: 22px;
        white-space: pre-wrap;
      }

      .controls {
        border-right: 0;
      }

      button, input, select, textarea {
        background: rgba(241, 238, 230, 0.08);
        border: 1px solid var(--line);
        border-radius: 6px;
        color: var(--paper);
        font: inherit;
      }

      button {
        cursor: pointer;
        min-height: 38px;
        padding: 9px 11px;
      }

      input, select, textarea {
        padding: 9px 10px;
        width: 100%;
      }

      textarea {
        min-height: 94px;
        resize: vertical;
      }

      .stack {
        display: grid;
        gap: 10px;
      }

      .agents {
        display: grid;
        grid-template-columns: 1fr;
        gap: 8px;
      }

      .primary {
        background: var(--paper);
        color: var(--ink);
      }

      @media (max-width: 980px) {
        main { grid-template-columns: 1fr; }
        aside, section { border-right: 0; border-bottom: 1px solid var(--line); }
      }
    </style>
  </head>
  <body>
    <main>
      <aside>
        <div class="brand">
          <h1>MaxMEM</h1>
          <span class="muted">companion</span>
        </div>
        <div id="repo" class="repo">Loading repository state...</div>
        <h2>Recent Capsules</h2>
        <div id="capsules" class="capsule-list"></div>
      </aside>
      <section class="work">
        <h2>Latest Handoff</h2>
        <div id="summary" class="repo"></div>
        <pre id="capsuleText" class="capsule-text"></pre>
      </section>
      <aside class="controls">
        <h2>Create Handoff</h2>
        <div class="stack">
          <select id="sourceAgent">
            <option value="codex">Codex</option>
            <option value="claude">Claude Code</option>
            <option value="opencode">OpenCode</option>
          </select>
          <select id="verbosity">
            <option value="compact">compact</option>
            <option value="standard">standard</option>
            <option value="full">full</option>
          </select>
          <textarea id="goal" placeholder="Goal for the next agent"></textarea>
          <button class="primary" id="handoff">Create handoff</button>
        </div>
        <h2>Launch Agent</h2>
        <div class="agents">
          <button data-launch="codex">Launch Codex</button>
          <button data-launch="claude">Launch Claude Code</button>
          <button data-launch="opencode">Launch OpenCode</button>
        </div>
      </aside>
    </main>
    <script>
      const state = { capsules: [] };
      const request = async (url, options) => {
        const response = await fetch(url, options);
        if (!response.ok) throw new Error(await response.text());
        return response.json();
      };
      const render = (data) => {
        document.querySelector("#repo").innerHTML = [
          "<strong>" + data.status.repoRoot + "</strong>",
          "branch: " + data.status.branch,
          "changed files: " + data.status.changedFiles.length,
        ].join("<br>");
        document.querySelector("#summary").textContent = data.latest
          ? data.latest.summary
          : "No capsule yet. Create one or launch an agent.";
        document.querySelector("#capsuleText").textContent = data.latest?.rendered ?? "";
        document.querySelector("#capsules").innerHTML = data.capsules.map((capsule, index) =>
          '<button class="capsule" data-index="' + index + '"><strong>' +
          capsule.sourceAgent + " · " + capsule.branch + "</strong><span>" +
          capsule.createdAt + "<br>" + capsule.goal + "</span></button>"
        ).join("");
        state.capsules = data.capsules;
      };
      const refresh = async () => render(await request("/api/state"));
      document.addEventListener("click", async (event) => {
        const launch = event.target?.dataset?.launch;
        const index = event.target?.closest?.(".capsule")?.dataset?.index;
        if (launch) {
          await request("/api/launch", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ agent: launch, goal: document.querySelector("#goal").value }),
          });
          await refresh();
        }
        if (index) {
          const capsule = state.capsules[Number(index)];
          document.querySelector("#summary").textContent = capsule.summary;
          document.querySelector("#capsuleText").textContent = capsule.rendered;
        }
      });
      document.querySelector("#handoff").addEventListener("click", async () => {
        await request("/api/handoff", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            agent: document.querySelector("#sourceAgent").value,
            goal: document.querySelector("#goal").value,
            verbosity: document.querySelector("#verbosity").value,
          }),
        });
        await refresh();
      });
      refresh().catch((error) => {
        document.querySelector("#repo").textContent = error.message;
      });
    </script>
  </body>
</html>`;

const requestBody = async (request: Request) =>
  request.headers.get("content-type")?.includes("application/json")
    ? ((await request.json()) as RequestBody)
    : {};

const capsuleSummary = (capsule: ReturnType<typeof listCapsules>[number]) => ({
  id: capsule.id,
  repoRoot: capsule.repoRoot,
  branch: capsule.branch,
  sourceAgent: capsule.sourceAgent,
  goal: capsule.goal,
  summary: capsule.summary,
  createdAt: capsule.createdAt,
  nextPrompt: capsule.nextPrompt,
  rendered: renderCapsule({ capsule }),
});

const statePayload = (cwd: string) => {
  const git = getGitContext({ cwd });
  const capsules = listCapsules({ repoRoot: git.repoRoot, branch: git.branch });
  const latest = getLatestCapsule({ repoRoot: git.repoRoot, branch: git.branch });
  const sessions = listSessions({ repoRoot: git.repoRoot });

  return {
    status: {
      cwd: git.cwd,
      repoRoot: git.repoRoot,
      branch: git.branch,
      changedFiles: git.changedFiles,
      recentCommits: git.recentCommits,
      latestSession: getLatestSession({ repoRoot: git.repoRoot }),
    },
    sessions,
    latest: latest ? capsuleSummary(latest) : undefined,
    capsules: capsules.map(capsuleSummary),
  };
};

const safeCwd = (cwd: string, requested?: string) => {
  const target = requested ? resolve(requested) : cwd;

  return existsSync(target) ? target : cwd;
};

const openBrowser = (url: string) =>
  process.platform === "darwin" && spawnSync("open", [url], { stdio: "ignore" });

export const runCompanionCommand = async ({ args, cwd, entryPath }: CompanionCommandInput) => {
  const port = Number(optionValue({ args, name: "port" }) ?? "3838");
  const hostname = "127.0.0.1";
  const server = Bun.serve({
    hostname,
    port,
    async fetch(request) {
      const url = new URL(request.url);

      if (url.pathname === "/") {
        return new Response(companionHtml(), {
          headers: { "content-type": "text/html; charset=utf-8" },
        });
      }

      if (url.pathname === "/api/state") {
        return jsonResponse({
          value: statePayload(safeCwd(cwd, url.searchParams.get("cwd") ?? undefined)),
        });
      }

      if (url.pathname === "/api/handoff" && request.method === "POST") {
        const body = await requestBody(request);
        const agent = agentFromValue({ value: body.agent });
        const capsule = createCapsule({
          agent,
          cwd: safeCwd(cwd, body.cwd),
          ...(body.goal ? { goal: body.goal } : {}),
          ...(body.verbosity ? { verbosity: body.verbosity } : {}),
        });

        return jsonResponse({ value: capsuleSummary(capsule) });
      }

      if (url.pathname === "/api/launch" && request.method === "POST") {
        const body = await requestBody(request);
        const agent = agentFromValue({ value: body.agent });
        const result = launchAgent({
          agent,
          cwd: safeCwd(cwd, body.cwd),
          entryPath,
          sourceAgent: agent,
          ...(body.goal ? { goal: body.goal } : {}),
        });

        return jsonResponse({ value: result, status: result.ok ? 200 : 500 });
      }

      return jsonResponse({ value: { error: "Not found" }, status: 404 });
    },
  });
  const url = `http://${hostname}:${server.port}`;

  if (!hasFlag({ args, name: "no-open" })) {
    openBrowser(url);
  }

  console.log(`MaxMEM companion running at ${url}`);
  await new Promise(() => {});
};
