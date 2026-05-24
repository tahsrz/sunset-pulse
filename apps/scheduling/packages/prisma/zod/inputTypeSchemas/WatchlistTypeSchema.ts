import { z } from 'zod';

export const WatchlistTypeSchema = z.enum(['EMAIL','DOMAIN','USERNAME']);

export type WatchlistTypeType = `${z.infer<typeof WatchlistTypeSchema>}`

export default WatchlistTypeSchema;
