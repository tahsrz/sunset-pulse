import { z } from 'zod';

export const WatchlistSourceSchema = z.enum(['MANUAL','FREE_DOMAIN_POLICY','SIGNUP']);

export type WatchlistSourceType = `${z.infer<typeof WatchlistSourceSchema>}`

export default WatchlistSourceSchema;
