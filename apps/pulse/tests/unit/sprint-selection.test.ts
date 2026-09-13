import { describe, expect, it } from 'vitest';
import { selectSprintBacklog } from '@/lib/autonomous-workflows/sprintSelection';

describe('scheduled sprint backlog selection', () => {
  it('selects highest-priority work within capacity', () => {
    const selected = selectSprintBacklog([{ title: 'low', priority: 5 }, { title: 'urgent', priority: 1 }, { title: 'normal', priority: 3 }], 2);
    expect(selected.map((item) => item.title)).toEqual(['urgent', 'normal']);
  });
  it('applies an effort budget separately from item count', () => {
    const selected = selectSprintBacklog([{ title: 'a', priority: 1, estimate_minutes: 30 }, { title: 'b', priority: 1, estimate_minutes: 45 }, { title: 'unknown', priority: 1 }], { maxItems: 3, capacityMinutes: 60 });
    expect(selected.map((item) => item.title)).toEqual(['a']);
  });
});
