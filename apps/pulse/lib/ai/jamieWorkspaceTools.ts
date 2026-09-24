import 'server-only';

import { tool } from 'ai';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { appLaunchInputSchema } from '@/lib/platform/contracts/appManifest';
import { prepareAppLaunch } from '@/lib/platform/apps/appLaunch.server';
import { listRuns } from '@/lib/platform/workflows/runStore.server';

const runReadSchema = z.object({
  status: z.enum(['ready', 'waiting', 'completed', 'cancelled', 'blocked']).optional(),
  limit: z.number().int().min(1).max(20).default(10),
}).strict();
const launchProposalSchema = appLaunchInputSchema.omit({ requestKey: true });

export async function readWorkspaceRunsForJamie(actorId: string, workspaceId: string, rawInput: unknown) {
  const input = runReadSchema.parse(rawInput);
  const page = await listRuns(actorId, workspaceId, new URLSearchParams({ limit: String(input.limit) }));
  const items = page.items
    .filter((run) => !input.status || run.status === input.status)
    .slice(0, input.limit)
    .map((run) => ({
      id: run.id,
      key: run.definition.key,
      version: run.definition.version,
      status: run.status,
      revision: run.revision,
      createdAt: run.created_at,
      href: `/workspaces/${workspaceId}/runs/${run.id}`,
    }));
  return { kind: 'workspace_run_summary' as const, count: items.length, hasMore: Boolean(page.nextCursor), items };
}

export async function prepareWorkspaceLaunchProposalForJamie(actorId: string, workspaceId: string, rawInput: unknown) {
  const input = launchProposalSchema.parse(rawInput);
  const requestKey = randomUUID();
  const request = { ...input, requestKey };
  const snapshot = await prepareAppLaunch(actorId, workspaceId, request);
  return {
    kind: 'app_launch_proposal' as const,
    proposalId: randomUUID(),
    workspaceId,
    title: snapshot.workflow.key,
    workflowKey: snapshot.workflow.key,
    workflowVersion: snapshot.workflow.version,
    installId: snapshot.installId,
    installRevision: snapshot.installRevision,
    resourceCount: snapshot.resourceRefs.length,
    request,
    confirmation: 'A person must review this proposal and choose Start workflow. Jamie has not started it.',
  };
}

export function createJamieWorkspaceTools(actorId: string, workspaceId: string) {
  return {
    read_workspace_runs: tool({
      description: 'Read a bounded summary of recent runs in the currently authorized workspace. Never include another workspace.',
      inputSchema: runReadSchema,
      execute: (input) => readWorkspaceRunsForJamie(actorId, workspaceId, input),
    }),
    propose_app_launch: tool({
      description: 'Prepare and validate a workspace app-launch proposal. This only reads/pins current data; it never starts a run. The signed-in person must confirm through the existing launch endpoint.',
      inputSchema: launchProposalSchema,
      execute: (input) => prepareWorkspaceLaunchProposalForJamie(actorId, workspaceId, input),
    }),
  };
}
