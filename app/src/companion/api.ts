import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { agentFromValue } from "../core/agents";
import { createCapsule, renderCapsule } from "../core/capsule";
import { getGitContext } from "../core/git";
import { launchAgent } from "../core/launch";
import {
  getLatestCapsule,
  getLatestSession,
  listCapsules,
  listHandoffReads,
  listProjectMemory,
  listSessions,
  saveProjectMemory,
} from "../core/store";
import type { HandoffCapsule } from "../core/types";

interface JsonResponseInput {
  value: unknown;
  status?: number;
}

interface CompanionRequestInput {
  request: Request;
  url: URL;
  cwd: string;
  entryPath: string;
}

interface CompanionRequestBody {
  agent?: string;
  cwd?: string;
  goal?: string;
  verbosity?: string;
  kind?: string;
  content?: string;
}

interface CapsuleSummaryInput {
  capsule: HandoffCapsule;
}

interface CompanionRoute {
  path: string;
  method?: string;
  handler: (input: CompanionRequestInput) => Response | Promise<Response>;
}

const jsonResponse = ({ value, status = 200 }: JsonResponseInput) =>
  new Response(JSON.stringify(value, null, 2), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });

const requestBody = async (request: Request) =>
  request.headers.get("content-type")?.includes("application/json")
    ? ((await request.json()) as CompanionRequestBody)
    : {};

const safeCwd = (cwd: string, requested?: string) => {
  const target = requested ? resolve(requested) : cwd;

  return existsSync(target) ? target : cwd;
};

const capsuleSummary = ({ capsule }: CapsuleSummaryInput) => ({
  id: capsule.id,
  repoRoot: capsule.repoRoot,
  branch: capsule.branch,
  sourceAgent: capsule.sourceAgent,
  goal: capsule.goal,
  summary: capsule.summary,
  createdAt: capsule.createdAt,
  nextPrompt: capsule.nextPrompt,
  taskState: capsule.taskState,
  rendered: renderCapsule({ capsule }),
});

const statePayload = (cwd: string) => {
  const git = getGitContext({ cwd });
  const capsules = listCapsules({ repoRoot: git.repoRoot, branch: git.branch });
  const latest = getLatestCapsule({ repoRoot: git.repoRoot, branch: git.branch });

  return {
    status: {
      cwd: git.cwd,
      repoRoot: git.repoRoot,
      branch: git.branch,
      changedFiles: git.changedFiles,
      recentCommits: git.recentCommits,
      latestSession: getLatestSession({ repoRoot: git.repoRoot }),
    },
    sessions: listSessions({ repoRoot: git.repoRoot }),
    memory: listProjectMemory({ repoRoot: git.repoRoot }),
    reads: listHandoffReads({ repoRoot: git.repoRoot }),
    latest: latest ? capsuleSummary({ capsule: latest }) : undefined,
    capsules: capsules.map((capsule) => capsuleSummary({ capsule })),
  };
};

const handoffResponse = async ({ request, cwd }: CompanionRequestInput) => {
  const body = await requestBody(request);
  const agent = agentFromValue({ value: body.agent });
  const capsule = createCapsule({
    agent,
    cwd: safeCwd(cwd, body.cwd),
    ...(body.goal ? { goal: body.goal } : {}),
    ...(body.verbosity ? { verbosity: body.verbosity } : {}),
  });

  return jsonResponse({ value: capsuleSummary({ capsule }) });
};

const launchResponse = async ({ request, cwd }: CompanionRequestInput) => {
  const body = await requestBody(request);
  const agent = agentFromValue({ value: body.agent });
  const result = launchAgent({
    agent,
    cwd: safeCwd(cwd, body.cwd),
    sourceAgent: agent,
    ...(body.goal ? { goal: body.goal } : {}),
  });

  return jsonResponse({ value: result, status: result.ok ? 200 : 500 });
};

const memoryResponse = async ({ request, cwd }: CompanionRequestInput) => {
  const body = await requestBody(request);
  const git = getGitContext({ cwd: safeCwd(cwd, body.cwd) });
  const record = saveProjectMemory({
    repoRoot: git.repoRoot,
    kind: body.kind ?? "note",
    content: body.content ?? "",
    source: "companion",
  });

  return jsonResponse({ value: { ok: Boolean(record), record }, status: record ? 200 : 400 });
};

const routes: CompanionRoute[] = [
  {
    path: "/api/state",
    handler: ({ cwd, url }) =>
      jsonResponse({
        value: statePayload(safeCwd(cwd, url.searchParams.get("cwd") ?? undefined)),
      }),
  },
  {
    path: "/api/handoff",
    method: "POST",
    handler: handoffResponse,
  },
  {
    path: "/api/launch",
    method: "POST",
    handler: launchResponse,
  },
  {
    path: "/api/memory",
    method: "POST",
    handler: memoryResponse,
  },
];

const routeMatches = ({ path, method }: CompanionRoute, { request, url }: CompanionRequestInput) =>
  path === url.pathname && (!method || method === request.method);

export const handleCompanionRequest = async (input: CompanionRequestInput) => {
  const route = routes.find((candidate) => routeMatches(candidate, input));

  return route
    ? route.handler(input)
    : jsonResponse({ value: { error: "Not found" }, status: 404 });
};
