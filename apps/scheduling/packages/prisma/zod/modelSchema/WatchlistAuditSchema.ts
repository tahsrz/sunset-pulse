import { z } from 'zod';
import { WatchlistTypeSchema } from '../inputTypeSchemas/WatchlistTypeSchema'
import { WatchlistActionSchema } from '../inputTypeSchemas/WatchlistActionSchema'

/////////////////////////////////////////
// WATCHLIST AUDIT SCHEMA
/////////////////////////////////////////

export const WatchlistAuditSchema = z.object({
  type: WatchlistTypeSchema,
  action: WatchlistActionSchema,
  id: z.string().uuid(),
  value: z.string(),
  description: z.string().nullable(),
  changedAt: z.coerce.date(),
  changedByUserId: z.number().int().nullable(),
  watchlistId: z.string().nullable(),
})

export type WatchlistAudit = z.infer<typeof WatchlistAuditSchema>

export default WatchlistAuditSchema;
