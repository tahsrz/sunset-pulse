import { realtorDateSchema } from './contracts';

export function plannerReadUrl(today: string, selectedDate?: string, cursor?: { kind: 'cursor' | 'projectionCursor'; value: string }) {
  const date = selectedDate ? realtorDateSchema.parse(selectedDate) : undefined;
  const query = new URLSearchParams({ from: date || `${today.slice(0, 4)}-01-01`, through: date || `${today.slice(0, 4)}-12-31`, limit: '100' });
  if (cursor) query.set(cursor.kind, cursor.value);
  return `/api/realtor/planner?${query}`;
}
