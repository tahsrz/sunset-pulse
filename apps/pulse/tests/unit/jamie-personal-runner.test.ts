import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  generateText: vi.fn(),
  requireWorkspace: vi.fn(),
  createTools: vi.fn(() => ({})),
}));
vi.mock('server-only', () => ({}));
vi.mock('ai', () => ({ generateText: mocks.generateText, stepCountIs: (steps: number) => ({ steps }) }));
vi.mock('@ai-sdk/groq', () => ({ groq: (model: string) => ({ model }) }));
vi.mock('@/lib/realtor-workspace/access.server', () => ({ requirePersonalRealtorWorkspace: mocks.requireWorkspace }));
vi.mock('@/lib/ai/jamieWorkspaceTools', () => ({ createJamiePersonalTools: mocks.createTools }));

import { runPersonalJamie } from '@/lib/ai/jamiePersonal.server';

beforeEach(() => {
  vi.clearAllMocks();
  process.env.GROQ_API_KEY = 'test-key';
  mocks.requireWorkspace.mockResolvedValue({ workspaceId: 'workspace-1', preferences: { time_zone: 'America/Chicago' } });
});

describe('personal Jamie runner', () => {
  it('returns only schema-validated proposals from successful preparation tool results', async () => {
    mocks.generateText.mockResolvedValue({
      text: 'I prepared a draft. Nothing is saved yet.',
      steps: [{ toolResults: [
        { toolName: 'read_personal_agenda', output: { private: 'not copied into trace' } },
        { toolName: 'prepare_personal_planner_item', output: {
          kind: 'planner_proposal', proposalId: '11111111-1111-4111-8111-111111111111',
          editableFields: { title: 'MLS dues' }, missingFields: ['first due date'], preview: null,
          targetRevision: null, intendedApiAction: 'POST /api/realtor/planner', apiPayload: null,
          confirmation: 'Draft only; no planner item or reminder has been saved.',
        } },
        { toolName: 'prepare_personal_goal', output: { kind: 'goal_proposal', untrusted: true } },
      ] }],
    });

    const response = await runPersonalJamie({
      actorId: 'owner-1', workspaceId: 'workspace-1', timeZone: 'America/Chicago',
      messages: [{ role: 'user', content: 'Schedule my dues.' }],
    });

    expect(response.personal.context).toBe('personal_realtor');
    expect(response.personal.proposals).toHaveLength(1);
    expect(response.personal.proposals[0].missingFields).toEqual(['first due date']);
    expect(response.personal.availability.agenda).toBe(true);
    expect(response.content).toContain('Nothing is saved yet');
    expect(mocks.generateText).toHaveBeenCalledWith(expect.objectContaining({ stopWhen: { steps: 3 }, maxOutputTokens: 1200 }));
  });

  it('re-prepares a corrected fixture proposal in the same private owner context', async () => {
    const incomplete = {
      kind: 'planner_proposal', proposalId: '11111111-1111-4111-8111-111111111111',
      editableFields: { kind: 'bill', title: 'MLS dues' }, missingFields: ['first due date'],
      preview: null, targetRevision: null, intendedApiAction: 'POST /api/realtor/planner', apiPayload: null,
      confirmation: 'Draft only; nothing has been saved.',
    };
    const corrected = {
      kind: 'planner_proposal', proposalId: '22222222-2222-4222-8222-222222222222',
      editableFields: { kind: 'bill', title: 'MLS dues', dueDate: '2026-11-01' }, missingFields: [],
      preview: { timeZone: 'America/Chicago', nextThreeDueDates: ['2026-11-01', '2026-12-01', '2027-01-01'] },
      targetRevision: null, intendedApiAction: 'POST /api/realtor/planner',
      apiPayload: { itemId: null, expectedRevision: null, item: {
        kind: 'bill', title: 'MLS dues', notes: '', expectedAmountCents: 12000,
        property: null, sourceSprintTaskId: null, sellerLead: null,
        due: { anchorDate: '2026-11-01', localTime: '09:00', timeZone: 'America/Chicago',
          recurrence: { frequency: 'monthly', interval: 1 }, endsOn: null, reminderOffsetsDays: [1] },
      } },
      confirmation: 'Draft only; nothing has been saved.',
    };
    mocks.generateText
      .mockResolvedValueOnce({ text: 'What is the first due date?', steps: [{ toolResults: [
        { toolName: 'read_personal_agenda', output: { upcoming: [{ title: 'Private owner A task' }] } },
        { toolName: 'prepare_personal_planner_item', output: incomplete },
      ] }] })
      .mockResolvedValueOnce({ text: 'I updated the draft with your date.', steps: [{ toolResults: [
        { toolName: 'prepare_personal_planner_item', output: corrected },
      ] }] });

    const first = await runPersonalJamie({ actorId: 'owner-1', workspaceId: 'workspace-1', timeZone: 'America/Chicago',
      messages: [{ role: 'user', content: 'Prepare MLS dues.' }] });
    const second = await runPersonalJamie({ actorId: 'owner-1', workspaceId: 'workspace-1', timeZone: 'America/Chicago',
      messages: [{ role: 'user', content: 'Prepare MLS dues.' }, { role: 'assistant', content: first.content },
        { role: 'user', content: 'It is due November 1, $120 monthly.' }] });

    expect(first.personal.proposals[0]).toMatchObject({ missingFields: ['first due date'], apiPayload: null });
    expect(second.personal.proposals[0]).toMatchObject({ editableFields: corrected.editableFields, missingFields: [], apiPayload: corrected.apiPayload });
    const preparedProposal = second.personal.proposals[0];
    expect(preparedProposal.kind).toBe('planner_proposal');
    if (preparedProposal.kind !== 'planner_proposal') throw new Error('Expected a planner proposal.');
    expect(preparedProposal.apiPayload?.item).not.toHaveProperty('requestKey');
    expect(JSON.stringify(second)).not.toContain('owner-b');
    expect(mocks.createTools).toHaveBeenNthCalledWith(1, 'owner-1');
    expect(mocks.createTools).toHaveBeenNthCalledWith(2, 'owner-1');
    expect(mocks.generateText).toHaveBeenCalledTimes(2);
  });

  it('does not call a model when the provider is unavailable or personal workspace changed', async () => {
    delete process.env.GROQ_API_KEY;
    const missingProvider = await runPersonalJamie({ actorId: 'owner-1', workspaceId: 'workspace-1', timeZone: 'America/Chicago', messages: [{ role: 'user', content: 'hi' }] });
    expect(missingProvider.content).toContain('provider is not configured');
    expect(mocks.generateText).not.toHaveBeenCalled();

    process.env.GROQ_API_KEY = 'test-key';
    mocks.requireWorkspace.mockResolvedValueOnce({ workspaceId: 'workspace-2', preferences: { time_zone: 'America/Chicago' } });
    const changed = await runPersonalJamie({ actorId: 'owner-1', workspaceId: 'workspace-1', timeZone: 'America/Chicago', messages: [{ role: 'user', content: 'hi' }] });
    expect(changed.content).toContain('workspace changed');
    expect(mocks.generateText).not.toHaveBeenCalled();
  });
});
