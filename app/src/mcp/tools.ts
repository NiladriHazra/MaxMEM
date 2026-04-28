import { randomUUID } from "node:crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod/v4";
import { createCapsule, getInjectionContext, renderCapsule } from "../core/capsule";
import { getGitContext } from "../core/git";
import {
  getLatestCapsule,
  getLatestSession,
  listHandoffReads,
  listProjectMemory,
  saveProjectMemory,
  saveSession,
} from "../core/store";
import type { Agent, ExportOptions } from "../core/types";

interface RegisterToolsInput {
  server: McpServer;
}

interface SaveMemoryInput {
  cwd: string;
  kind: string;
  content: string;
  source: string;
}

interface MemoryShortcutToolInput {
  server: McpServer;
  name: string;
  kind: string;
  description: string;
}

const agentSchema = z.enum(["codex", "claude", "opencode"]);
const verbositySchema = z.enum(["compact", "standard", "full"]);

const cwdFromInput = (cwd: string | undefined) =>
  cwd ?? process.env.MAXMEM_PLUGIN_CWD ?? process.cwd();

const toolResponse = (value: unknown) => ({
  content: [
    {
      type: "text" as const,
      text: JSON.stringify(value, null, 2),
    },
  ],
});

const saveMemory = ({ cwd, kind, content, source }: SaveMemoryInput) => {
  const git = getGitContext({ cwd });
  const record = saveProjectMemory({
    repoRoot: git.repoRoot,
    kind,
    content,
    source,
  });

  return {
    ok: Boolean(record),
    repoRoot: git.repoRoot,
    record,
  };
};

const registerStartSessionTool = ({ server }: RegisterToolsInput) =>
  server.registerTool(
    "maxmem_start_session",
    {
      description: "Save a MaxMEM session record and return injectable handoff context.",
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
      inputSchema: {
        agent: agentSchema.optional().default("codex"),
        cwd: z.string().optional(),
        sessionId: z.string().optional(),
        transcriptPath: z.string().optional(),
      },
    },
    async ({ agent, cwd, sessionId, transcriptPath }) => {
      const resolvedCwd = cwdFromInput(cwd);
      const git = getGitContext({ cwd: resolvedCwd });
      const id = sessionId ?? randomUUID();
      const timestamp = new Date().toISOString();
      const context = getInjectionContext({
        cwd: resolvedCwd,
        consumerAgent: agent as Agent,
        source: "mcp:start_session",
      });

      saveSession({
        session: {
          id,
          agent: agent as Agent,
          cwd: resolvedCwd,
          repoRoot: git.repoRoot,
          branch: git.branch,
          transcriptPath: transcriptPath ?? "",
          createdAt: timestamp,
          updatedAt: timestamp,
        },
      });

      return toolResponse({
        ok: true,
        sessionId: id,
        repoRoot: git.repoRoot,
        branch: git.branch,
        hasContext: Boolean(context),
        context,
      });
    },
  );

const registerSaveHandoffTool = ({ server }: RegisterToolsInput) =>
  server.registerTool(
    "maxmem_save_handoff",
    {
      description: "Create and save a compact MaxMEM handoff capsule.",
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
      inputSchema: {
        agent: agentSchema.optional().default("codex"),
        cwd: z.string().optional(),
        goal: z.string().optional(),
        transcriptPath: z.string().optional(),
        verbosity: verbositySchema.optional().default("compact"),
        rawChat: z.boolean().optional(),
      },
    },
    async ({ agent, cwd, goal, transcriptPath, verbosity, rawChat }) => {
      const options =
        rawChat === undefined ? undefined : ({ rawChat } satisfies Partial<ExportOptions>);
      const capsule = createCapsule({
        agent: agent as Agent,
        cwd: cwdFromInput(cwd),
        verbosity,
        ...(options ? { options } : {}),
        ...(goal ? { goal } : {}),
        ...(transcriptPath ? { transcriptPath } : {}),
      });

      return toolResponse({
        ok: true,
        capsuleId: capsule.id,
        repoRoot: capsule.repoRoot,
        branch: capsule.branch,
        sourceAgent: capsule.sourceAgent,
        createdAt: capsule.createdAt,
        transcriptPath: capsule.transcriptPath,
        nextPrompt: capsule.nextPrompt,
        rendered: renderCapsule({ capsule }),
        privacy: capsule.privacy,
        counts: {
          files: capsule.files.length,
          commands: capsule.commands.length,
          decisions: capsule.decisions.length,
          blockers: capsule.blockers.length,
          nextActions: capsule.taskState.nextActions.length,
          verification: capsule.taskState.verification.length,
          rawChat: capsule.rawChat.length,
        },
      });
    },
  );

const registerLatestHandoffTool = ({ server }: RegisterToolsInput) =>
  server.registerTool(
    "maxmem_get_latest_handoff",
    {
      description: "Return the latest injectable MaxMEM handoff context for this repository.",
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: false },
      inputSchema: {
        cwd: z.string().optional(),
        consumerAgent: agentSchema.optional(),
      },
    },
    async ({ cwd, consumerAgent }) => {
      const resolvedCwd = cwdFromInput(cwd);
      const git = getGitContext({ cwd: resolvedCwd });
      const latestCapsule = getLatestCapsule({ repoRoot: git.repoRoot, branch: git.branch });
      const context = getInjectionContext({
        cwd: resolvedCwd,
        consumerAgent: consumerAgent ? (consumerAgent as Agent) : "unknown",
        source: "mcp:get_latest_handoff",
      });

      return toolResponse({
        ok: Boolean(latestCapsule),
        repoRoot: git.repoRoot,
        branch: git.branch,
        latestCapsule: latestCapsule
          ? {
              id: latestCapsule.id,
              sourceAgent: latestCapsule.sourceAgent,
              createdAt: latestCapsule.createdAt,
              goal: latestCapsule.goal,
              taskState: latestCapsule.taskState,
            }
          : null,
        context,
      });
    },
  );

const registerSaveProjectMemoryTool = ({ server }: RegisterToolsInput) =>
  server.registerTool(
    "maxmem_save_project_memory",
    {
      description: "Save a durable project memory note for the current repository.",
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
      inputSchema: {
        cwd: z.string().optional(),
        kind: z.string().optional().default("note"),
        content: z.string(),
        source: z.string().optional().default("mcp:save_project_memory"),
      },
    },
    async ({ cwd, kind, content, source }) =>
      toolResponse(saveMemory({ cwd: cwdFromInput(cwd), kind, content, source })),
  );

const registerListProjectMemoryTool = ({ server }: RegisterToolsInput) =>
  server.registerTool(
    "maxmem_list_project_memory",
    {
      description: "List durable MaxMEM project memory for the current repository.",
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
      inputSchema: {
        cwd: z.string().optional(),
        kind: z.string().optional(),
        limit: z.number().int().positive().optional().default(20),
      },
    },
    async ({ cwd, kind, limit }) => {
      const git = getGitContext({ cwd: cwdFromInput(cwd) });
      const memory = listProjectMemory({
        repoRoot: git.repoRoot,
        limit,
        ...(kind ? { kind } : {}),
      });

      return toolResponse({
        ok: true,
        repoRoot: git.repoRoot,
        memory,
      });
    },
  );

const registerListHandoffReadsTool = ({ server }: RegisterToolsInput) =>
  server.registerTool(
    "maxmem_list_handoff_reads",
    {
      description: "List MaxMEM handoff read events for this repository.",
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
      inputSchema: {
        cwd: z.string().optional(),
        capsuleId: z.string().optional(),
        limit: z.number().int().positive().optional().default(20),
      },
    },
    async ({ cwd, capsuleId, limit }) => {
      const git = getGitContext({ cwd: cwdFromInput(cwd) });
      const reads = listHandoffReads({
        repoRoot: git.repoRoot,
        limit,
        ...(capsuleId ? { capsuleId } : {}),
      });

      return toolResponse({
        ok: true,
        repoRoot: git.repoRoot,
        reads,
      });
    },
  );

const registerMemoryShortcutTool = ({ server, name, kind, description }: MemoryShortcutToolInput) =>
  server.registerTool(
    name,
    {
      description,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
      inputSchema: {
        cwd: z.string().optional(),
        content: z.string(),
      },
    },
    async ({ cwd, content }) =>
      toolResponse(
        saveMemory({
          cwd: cwdFromInput(cwd),
          kind,
          content,
          source: `mcp:${name}`,
        }),
      ),
  );

const registerStatusTool = ({ server }: RegisterToolsInput) =>
  server.registerTool(
    "maxmem_status",
    {
      description: "Read MaxMEM repository, session, and latest handoff status.",
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
      inputSchema: {
        cwd: z.string().optional(),
        agent: agentSchema.optional(),
        includeCapsule: z.boolean().optional().default(false),
      },
    },
    async ({ cwd, agent, includeCapsule }) => {
      const resolvedCwd = cwdFromInput(cwd);
      const git = getGitContext({ cwd: resolvedCwd });
      const latestSession = getLatestSession({
        repoRoot: git.repoRoot,
        ...(agent ? { agent: agent as Agent } : {}),
      });
      const latestCapsule = getLatestCapsule({ repoRoot: git.repoRoot, branch: git.branch });
      const memory = listProjectMemory({ repoRoot: git.repoRoot, limit: 8 });
      const reads = listHandoffReads({ repoRoot: git.repoRoot, limit: 8 });

      return toolResponse({
        ok: true,
        cwd: resolvedCwd,
        repoRoot: git.repoRoot,
        isRepo: git.isRepo,
        branch: git.branch,
        head: git.head,
        changedFiles: git.changedFiles,
        latestSession: latestSession
          ? {
              agent: latestSession.agent,
              updatedAt: latestSession.updatedAt,
              transcriptPath: latestSession.transcriptPath,
            }
          : null,
        latestCapsule: latestCapsule
          ? {
              id: latestCapsule.id,
              sourceAgent: latestCapsule.sourceAgent,
              createdAt: latestCapsule.createdAt,
              goal: latestCapsule.goal,
              nextPrompt: latestCapsule.nextPrompt,
              taskState: latestCapsule.taskState,
            }
          : null,
        memory,
        reads,
        ...(includeCapsule && latestCapsule
          ? { renderedCapsule: renderCapsule({ capsule: latestCapsule }) }
          : {}),
      });
    },
  );

export const registerMaxmemTools = ({ server }: RegisterToolsInput) => {
  registerStartSessionTool({ server });
  registerSaveHandoffTool({ server });
  registerLatestHandoffTool({ server });
  registerSaveProjectMemoryTool({ server });
  registerListProjectMemoryTool({ server });
  registerListHandoffReadsTool({ server });
  registerMemoryShortcutTool({
    server,
    name: "maxmem_save_decision",
    kind: "decision",
    description: "Save a project decision to MaxMEM memory.",
  });
  registerMemoryShortcutTool({
    server,
    name: "maxmem_save_blocker",
    kind: "blocker",
    description: "Save a project blocker to MaxMEM memory.",
  });
  registerMemoryShortcutTool({
    server,
    name: "maxmem_save_verification",
    kind: "verification",
    description: "Save a verification result or command to MaxMEM memory.",
  });
  registerMemoryShortcutTool({
    server,
    name: "maxmem_mark_task_done",
    kind: "completed_task",
    description: "Save a completed task marker to MaxMEM memory.",
  });
  registerStatusTool({ server });
};
