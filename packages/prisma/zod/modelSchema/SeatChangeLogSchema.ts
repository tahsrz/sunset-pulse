import { z } from 'zod';
import { JsonValueSchema } from '../inputTypeSchemas/JsonValueSchema'
import { SeatChangeTypeSchema } from '../inputTypeSchemas/SeatChangeTypeSchema'

/////////////////////////////////////////
// SEAT CHANGE LOG SCHEMA
/////////////////////////////////////////

export const SeatChangeLogSchema = z.object({
  changeType: SeatChangeTypeSchema,
  id: z.string().uuid(),
  teamId: z.number().int(),
  seatCount: z.number().int(),
  userId: z.number().int().nullable(),
  triggeredBy: z.number().int().nullable(),
  changeDate: z.coerce.date(),
  monthKey: z.string(),
  operationId: z.string().nullable(),
  processedInProrationId: z.string().nullable(),
  metadata: JsonValueSchema.nullable(),
  createdAt: z.coerce.date(),
  teamBillingId: z.string().nullable(),
  organizationBillingId: z.string().nullable(),
})

export type SeatChangeLog = z.infer<typeof SeatChangeLogSchema>

export default SeatChangeLogSchema;
