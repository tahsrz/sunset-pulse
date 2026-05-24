import { z } from 'zod';

export const DSyncDataScalarFieldEnumSchema = z.enum(['id','directoryId','tenant','organizationId']);

export default DSyncDataScalarFieldEnumSchema;
