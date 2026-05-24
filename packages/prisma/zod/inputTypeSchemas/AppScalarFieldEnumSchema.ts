import { z } from 'zod';

export const AppScalarFieldEnumSchema = z.enum(['slug','dirName','keys','categories','createdAt','updatedAt','enabled']);

export default AppScalarFieldEnumSchema;
