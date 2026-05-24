import { z } from 'zod';

export const AttributeToUserScalarFieldEnumSchema = z.enum(['id','memberId','attributeOptionId','weight','createdAt','createdById','createdByDSyncId','updatedAt','updatedById','updatedByDSyncId']);

export default AttributeToUserScalarFieldEnumSchema;
