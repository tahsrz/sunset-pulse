import { z } from 'zod';

export const AttributeOptionScalarFieldEnumSchema = z.enum(['id','attributeId','value','slug','isGroup','contains']);

export default AttributeOptionScalarFieldEnumSchema;
