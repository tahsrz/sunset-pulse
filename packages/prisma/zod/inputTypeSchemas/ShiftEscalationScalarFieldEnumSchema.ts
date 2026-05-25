import { z } from 'zod';

export const ShiftEscalationScalarFieldEnumSchema = z.enum(['id','bookingId','status','currentTier','nextEscalationTime','createdAt','updatedAt']);

export default ShiftEscalationScalarFieldEnumSchema;
