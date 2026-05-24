import { z } from 'zod';

export const WatchlistScalarFieldEnumSchema = z.enum(['id','type','value','description','isGlobal','organizationId','action','source','lastUpdatedAt']);

export default WatchlistScalarFieldEnumSchema;
