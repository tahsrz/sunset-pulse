import { expect, it } from 'vitest';
import { plannerReadUrl } from '@/lib/realtor-workspace/plannerNavigation';

it('keeps a previous-year due date through stored and projected cursor reads', () => {
  for (const kind of ['cursor', 'projectionCursor'] as const) {
    const query = new URL(plannerReadUrl('2026-10-07', '2025-12-31', { kind, value: 'a+/=' }), 'https://example.test').searchParams;
    expect(query.get('from')).toBe('2025-12-31');
    expect(query.get('through')).toBe('2025-12-31');
    expect(query.get(kind)).toBe('a+/=');
    expect(query.get('limit')).toBe('100');
  }
});
it('retains the normal year view and rejects invalid deep-link dates', () => {
  expect(plannerReadUrl('2026-10-07')).toBe('/api/realtor/planner?from=2026-01-01&through=2026-12-31&limit=100');
  expect(() => plannerReadUrl('2026-10-07', '2026-02-30')).toThrow();
});
