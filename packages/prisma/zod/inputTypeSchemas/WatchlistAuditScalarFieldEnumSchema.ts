import { z } from 'zod';

export const WatchlistAuditScalarFieldEnumSchema = z.enum(['id','type','value','description','action','changedAt','changedByUserId','watchlistId']);

export default WatchlistAuditScalarFieldEnumSchema;
