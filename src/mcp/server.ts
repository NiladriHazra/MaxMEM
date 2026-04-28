import { randomUUID } from "node:crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod/v4";
import { getInjectionContext, createCapsule, renderCapsule } from "../core/capsule";
import { getGitContext } from "../core/git";
import { getLatestCapsule, getLatestSession, saveSession } from "../core/store";
import type { Agent, ExportOptions } from "../core/types";

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

export const createMcpServer = () => {
  const server = new McpServer({
    name: "maxmem",
    version: "0.1.0",
  });

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
      const context = getInjectionContext({ cwd: resolvedCwd });

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
          rawChat: capsule.rawChat.length,
        },
      });
    },
  );

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
            }
          : null,
        ...(includeCapsule && latestCapsule
          ? { renderedCapsule: renderCapsule({ capsule: latestCapsule }) }
          : {}),
      });
    },
  );

  return server;
};

export const runMcpServer = async () => {
  const server = createMcpServer();
  const transport = new StdioServerTransport();

  await server.connect(transport);
};
