import { describe, expect, it } from 'vitest';
import { selectSprintBacklog, selectSprintBacklogReport } from '@/lib/autonomous-workflows/sprintSelection';

describe('scheduled sprint backlog selection', () => {
  it('selects highest-priority work within capacity', () => {
    const selected = selectSprintBacklog([{ title: 'low', priority: 5 }, { title: 'urgent', priority: 1 }, { title: 'normal', priority: 3 }], 2);
    expect(selected.map((item) => item.title)).toEqual(['urgent', 'normal']);
  });
  it('applies an effort budget separately from item count', () => {
    const selected = selectSprintBacklog([{ title: 'a', priority: 1, estimate_minutes: 30 }, { title: 'b', priority: 1, estimate_minutes: 45 }, { title: 'unknown', priority: 1 }], { maxItems: 3, capacityMinutes: 60 });
    expect(selected.map((item) => item.title)).toEqual(['a']);
  });

  it('uses stable created-at and ID tie breakers and reports exclusions', () => {
    const report = selectSprintBacklogReport([
      { id: 'b', created_at: '2026-01-01T00:00:00Z', title: 'later input', priority: 1, estimate_minutes: 10 },
      { id: 'a', created_at: '2026-01-01T00:00:00Z', title: 'earlier ID', priority: 1, estimate_minutes: 10 },
      { id: 'c', created_at: '2026-01-02T00:00:00Z', title: 'unknown', priority: 1 },
    ], { maxItems: 1, capacityMinutes: 20 });
    expect(report.selected.map((item) => item.id)).toEqual(['a']);
    expect(report.exclusions).toEqual([
      { id: 'b', title: 'later input', reason: 'max_items' },
      { id: 'c', title: 'unknown', reason: 'max_items' },
    ]);
  });
});
