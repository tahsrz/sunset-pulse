import { z } from 'zod';

export const WatchlistEventAuditScalarFieldEnumSchema = z.enum(['id','watchlistId','eventTypeId','actionTaken','timestamp']);

export default WatchlistEventAuditScalarFieldEnumSchema;
