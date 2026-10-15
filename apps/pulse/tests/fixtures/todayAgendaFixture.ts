import type { TodayAgendaResult } from '@/lib/realtor-workspace/todayAgendaContract';
type Agenda = Extract<TodayAgendaResult, { status: 'available' }>['value'];
export function todayAgendaFixture(changes: Partial<Agenda> = {}): TodayAgendaResult {
  return { status: 'available', value: { asOfDate: '2026-10-08', overdue: [], upcoming: [], reminders: [], ...changes } };
}
export function todayOccurrenceFixture(title = 'Respond to Taylor Seller'): Agenda['upcoming'][number] {
  return { id: '11111111-1111-4111-8111-111111111111', item_id: '22222222-2222-4222-8222-222222222222',
    title_snapshot: title, effective_date: '2026-10-09', effective_time: '10:15:00', kind_snapshot: 'follow_up',
    expected_amount_cents: null, status: 'pending', revision: 1, property_label: null };
}
