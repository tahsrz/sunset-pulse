import { z } from 'zod';
import { realtorDateSchema, realtorPlannerKindSchema } from './contracts';

const linkedOccurrence = z.object({
  id: z.string().uuid(), item_id: z.string().uuid(),
  title_snapshot: z.string().min(1), effective_date: realtorDateSchema,
  property_label: z.string().nullable().optional(),
}).passthrough();
const occurrence = linkedOccurrence.extend({
  effective_time: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d+)?)?$/).nullable(),
  kind_snapshot: realtorPlannerKindSchema,
  expected_amount_cents: z.number().int().nonnegative().nullable(),
  status: z.enum(['pending', 'completed', 'skipped', 'cancelled']),
  revision: z.number().int().positive(),
});

export const todayAgendaResultSchema = z.discriminatedUnion('status', [
  z.object({ status: z.literal('available'), value: z.object({
    asOfDate: realtorDateSchema,
    overdue: z.array(occurrence).max(5), upcoming: z.array(occurrence).max(5),
    reminders: z.array(z.object({
      id: z.string().uuid(), occurrence_id: z.string().uuid(),
      scheduled_at: z.string().datetime({ offset: true }), status: z.literal('visible'),
      revision: z.number().int().positive(), occurrence: linkedOccurrence.nullable(),
    }).passthrough()).max(5),
  }).passthrough() }),
  z.object({ status: z.literal('unavailable') }),
]);
export type TodayAgendaResult = z.infer<typeof todayAgendaResultSchema>;
