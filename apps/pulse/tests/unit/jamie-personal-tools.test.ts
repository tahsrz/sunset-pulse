import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  readAgenda: vi.fn(),
  readSellerAttention: vi.fn(),
  readBusinessSummary: vi.fn(),
  preparePlanner: vi.fn(),
  prepareFinancial: vi.fn(),
  prepareGoal: vi.fn(),
}));

vi.mock('server-only', () => ({}));
vi.mock('ai', () => ({ tool: (definition: unknown) => definition }));
vi.mock('@/lib/realtor-workspace/jamieProposals.server', () => ({
  agendaInputSchema: { parse: (value: unknown) => value },
  financialProposalInputSchema: { parse: (value: unknown) => value },
  goalProposalInputSchema: { parse: (value: unknown) => value },
  plannerProposalInputSchema: { parse: (value: unknown) => value },
  summaryInputSchema: { parse: (value: unknown) => value },
  readPersonalAgenda: mocks.readAgenda,
  readPersonalBusinessSummary: mocks.readBusinessSummary,
  readPersonalSellerAttention: mocks.readSellerAttention,
  prepareFinancialProposal: mocks.prepareFinancial,
  prepareGoalProposal: mocks.prepareGoal,
  preparePlannerProposal: mocks.preparePlanner,
}));

import { createJamiePersonalTools } from '@/lib/ai/jamieWorkspaceTools';

describe('personal Jamie tools', () => {
  beforeEach(() => vi.clearAllMocks());

  it('binds private reads to the resolved owner and does not expose another owner’s data', async () => {
    mocks.readAgenda.mockResolvedValue({ kind: 'personal_agenda', upcoming: [{ title: 'Owner A task' }] });
    mocks.readSellerAttention.mockResolvedValue({ kind: 'personal_seller_attention', available: true, counts: { newRequests: 1 } });
    const tools = createJamiePersonalTools('owner-a');

    const agenda = await (tools.read_personal_agenda as any).execute({ includeReminders: true });
    const seller = await (tools.read_personal_seller_attention as any).execute({});

    expect(mocks.readAgenda).toHaveBeenCalledWith('owner-a', { includeReminders: true });
    expect(mocks.readSellerAttention).toHaveBeenCalledWith('owner-a');
    expect(JSON.stringify({ agenda, seller })).not.toContain('owner-b');
    expect(Object.keys(tools)).not.toEqual(expect.arrayContaining(['save_planner_item', 'record_financial_entry', 'write_goal']));
  });

  it('prepares a corrected planner draft for the same owner without exposing a write tool', async () => {
    const corrected = { title: 'MLS dues', dueDate: '2026-11-01', kind: 'bill' };
    mocks.preparePlanner.mockResolvedValue({
      kind: 'planner_proposal', editableFields: corrected, missingFields: [],
      preview: { timeZone: 'America/Chicago', nextThreeDueDates: ['2026-11-01'] },
      apiPayload: { itemId: null, expectedRevision: null, item: { kind: 'bill', title: 'MLS dues' } },
    });
    const tools = createJamiePersonalTools('owner-a');
    const result = await (tools.prepare_personal_planner_item as any).execute(corrected);

    expect(mocks.preparePlanner).toHaveBeenCalledWith('owner-a', corrected);
    expect(result).toMatchObject({ kind: 'planner_proposal', editableFields: corrected, missingFields: [] });
    expect(Object.keys(tools).sort()).toEqual([
      'prepare_personal_financial_record', 'prepare_personal_goal', 'prepare_personal_planner_item',
      'read_personal_agenda', 'read_personal_business_summary', 'read_personal_seller_attention',
    ]);
  });
});
