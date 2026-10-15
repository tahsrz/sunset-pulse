import 'server-only';

import { tool } from 'ai';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { appLaunchInputSchema } from '@/lib/platform/contracts/appManifest';
import { prepareAppLaunch } from '@/lib/platform/apps/appLaunch.server';
import { listRuns } from '@/lib/platform/workflows/runStore.server';
import {
  agendaInputSchema,
  financialProposalInputSchema,
  goalProposalInputSchema,
  plannerProposalInputSchema,
  readPersonalAgenda,
  readPersonalBusinessSummary,
  summaryInputSchema,
  prepareFinancialProposal,
  prepareGoalProposal,
  preparePlannerProposal,
  readPersonalSellerAttention,
} from '@/lib/realtor-workspace/jamieProposals.server';

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

/** Personal tools are only constructed by the chat route after an explicit personal-context request and signed-in owner resolution. */
export function createJamiePersonalTools(actorId: string) {
  return {
    read_personal_seller_attention: tool({
      description: 'Read a bounded, redacted summary of the signed-in owner’s seller requests, overdue next actions, and confirmed consultations. Never return names, contact details, private notes, or CRM metadata.',
      inputSchema: z.object({}).strict(),
      execute: () => readPersonalSellerAttention(actorId),
    }),
    read_personal_agenda: tool({
      description: 'Read the signed-in user’s private realtor agenda: a bounded list of overdue/upcoming items and in-app reminders. This never reads team workspace data.',
      inputSchema: agendaInputSchema,
      execute: (input) => readPersonalAgenda(actorId, input),
    }),
    read_personal_business_summary: tool({
      description: 'Read the signed-in user’s exact private realtor summary for one year. Distinguish received income from pending estimates and report that totals are manual and before taxes. Only use in explicit personal realtor context.',
      inputSchema: summaryInputSchema,
      execute: (input) => readPersonalBusinessSummary(actorId, input),
    }),
    prepare_personal_planner_item: tool({
      description: 'Prepare a bounded, editable private realtor planner proposal. Ask for missing facts such as the first due date and recurrence. Use the saved personal timezone; do not invent dates or claim the item/reminder was saved. This tool performs no write.',
      inputSchema: plannerProposalInputSchema,
      execute: (input) => preparePlannerProposal(actorId, input),
    }),
    prepare_personal_financial_record: tool({
      description: 'Prepare an editable private realtor financial-record proposal only. For a commission, ask whether an amount is gross or a deposit received and ask for its date. For gross commission require actual deductions or explicit zero; never infer a transaction or count expected income as received. This tool performs no write.',
      inputSchema: financialProposalInputSchema,
      execute: (input) => prepareFinancialProposal(actorId, input),
    }),
    prepare_personal_goal: tool({
      description: 'Prepare an editable private goal proposal using the signed-in user’s current goal revision. Net-income targets are in cents; count targets are counts. This tool performs no write.',
      inputSchema: goalProposalInputSchema,
      execute: (input) => prepareGoalProposal(actorId, input),
    }),
  };
}
