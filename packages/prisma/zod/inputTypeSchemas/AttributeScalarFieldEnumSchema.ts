import { z } from 'zod';

export const AttributeScalarFieldEnumSchema = z.enum(['id','teamId','type','name','slug','enabled','usersCanEditRelation','createdAt','updatedAt','isWeightsEnabled','isLocked']);

export default AttributeScalarFieldEnumSchema;
