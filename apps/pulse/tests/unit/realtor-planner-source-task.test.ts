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

  it('rejects a sprint task link without a property reference', () => {
    const result = plannerItemInputSchema.safeParse({
      ...baseInput,
      sourceSprintTaskId: '00000000-0000-4000-8000-000000000003',
    });

    expect(result.success).toBe(false);
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
