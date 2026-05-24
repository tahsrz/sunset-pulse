import { z } from 'zod';

export const WatchlistActionSchema = z.enum(['REPORT','BLOCK','ALERT']);

export type WatchlistActionType = `${z.infer<typeof WatchlistActionSchema>}`

export default WatchlistActionSchema;
