import { describe, expect, it } from 'vitest';
import { plannerItemInputSchema } from '@/lib/realtor-workspace/contracts';

const baseInput = {
  kind: 'task' as const,
  title: 'Review property facts',
  due: {
    anchorDate: '2026-10-01',
    localTime: null,
    timeZone: 'America/Chicago',
    recurrence: { frequency: 'once' as const },
    endsOn: null,
    reminderOffsetsDays: [],
  },
  requestKey: '00000000-0000-4000-8000-000000000001',
};

describe('planner property sprint task provenance', () => {
  it('accepts a task linked to a property sprint task', () => {
    const result = plannerItemInputSchema.safeParse({
      ...baseInput,
      property: { propertyId: '00000000-0000-4000-8000-000000000002' },
      sourceSprintTaskId: '00000000-0000-4000-8000-000000000003',
    });

    expect(result.success).toBe(true);
  });

  it('allows a property-free task draft whose source must be verified by the server', () => {
    const result = plannerItemInputSchema.safeParse({
      ...baseInput,
      sourceSprintTaskId: '00000000-0000-4000-8000-000000000003',
    });

    expect(result.success).toBe(true);
  });

  it('rejects linking a source sprint task to a non-task planner item', () => {
    const result = plannerItemInputSchema.safeParse({
      ...baseInput,
      kind: 'appointment',
      property: { propertyId: '00000000-0000-4000-8000-000000000002' },
      sourceSprintTaskId: '00000000-0000-4000-8000-000000000003',
    });

    expect(result.success).toBe(false);
  });
});

describe('planner seller action provenance', () => {
  it('accepts only one-time, unlinked seller follow-ups', () => {
    const result = plannerItemInputSchema.safeParse({
      ...baseInput,
      kind: 'follow_up',
      sellerLead: {
        leadId: '00000000-0000-4000-8000-000000000004',
        actionKey: 'initial-response:v1',
        expectedLeadRevision: 1,
      },
    });
    expect(result.success).toBe(true);
  });

  it('rejects recurring or property-linked seller tasks', () => {
    const result = plannerItemInputSchema.safeParse({
      ...baseInput,
      kind: 'appointment',
      property: { propertyId: '00000000-0000-4000-8000-000000000002' },
      sellerLead: {
        leadId: '00000000-0000-4000-8000-000000000004',
        actionKey: 'initial-response:v1',
        expectedLeadRevision: 1,
      },
    });
    expect(result.success).toBe(false);
  });
});
