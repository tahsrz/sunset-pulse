import { describe, expect, it } from 'vitest';
import { selectSprintBacklog } from '@/lib/autonomous-workflows/sprintSelection';

describe('scheduled sprint backlog selection', () => {
  it('selects highest-priority work within capacity', () => {
    const selected = selectSprintBacklog([{ title: 'low', priority: 5 }, { title: 'urgent', priority: 1 }, { title: 'normal', priority: 3 }], 2);
    expect(selected.map((item) => item.title)).toEqual(['urgent', 'normal']);
  });
});
