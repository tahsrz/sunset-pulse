import { z } from 'zod';

export const EventTypeCustomInputScalarFieldEnumSchema = z.enum(['id','eventTypeId','label','type','options','required','placeholder']);

export default EventTypeCustomInputScalarFieldEnumSchema;
