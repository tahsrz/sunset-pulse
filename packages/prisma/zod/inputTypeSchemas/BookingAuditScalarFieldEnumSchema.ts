import { z } from 'zod';

export const BookingAuditScalarFieldEnumSchema = z.enum(['id','bookingUid','actorId','type','action','timestamp','createdAt','updatedAt','source','operationId','data','context']);

export default BookingAuditScalarFieldEnumSchema;
