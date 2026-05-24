import { z } from 'zod';
import { WatchlistActionSchema } from '../inputTypeSchemas/WatchlistActionSchema'

/////////////////////////////////////////
// WATCHLIST EVENT AUDIT SCHEMA
/////////////////////////////////////////

export const WatchlistEventAuditSchema = z.object({
  actionTaken: WatchlistActionSchema,
  id: z.string().uuid(),
  watchlistId: z.string(),
  eventTypeId: z.number().int(),
  timestamp: z.coerce.date(),
})

export type WatchlistEventAudit = z.infer<typeof WatchlistEventAuditSchema>

export default WatchlistEventAuditSchema;
