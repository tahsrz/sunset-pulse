import { z } from 'zod';
import { WatchlistTypeSchema } from '../inputTypeSchemas/WatchlistTypeSchema'
import { WatchlistActionSchema } from '../inputTypeSchemas/WatchlistActionSchema'
import { WatchlistSourceSchema } from '../inputTypeSchemas/WatchlistSourceSchema'

/////////////////////////////////////////
// WATCHLIST SCHEMA
/////////////////////////////////////////

export const WatchlistSchema = z.object({
  type: WatchlistTypeSchema,
  action: WatchlistActionSchema,
  source: WatchlistSourceSchema,
  id: z.string().uuid(),
  value: z.string(),
  description: z.string().nullable(),
  isGlobal: z.boolean(),
  organizationId: z.number().int().nullable(),
  lastUpdatedAt: z.coerce.date(),
})

export type Watchlist = z.infer<typeof WatchlistSchema>

export default WatchlistSchema;
