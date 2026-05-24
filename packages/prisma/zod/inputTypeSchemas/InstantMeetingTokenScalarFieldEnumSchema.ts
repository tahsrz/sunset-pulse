import { z } from 'zod';

export const InstantMeetingTokenScalarFieldEnumSchema = z.enum(['id','token','expires','teamId','bookingId','createdAt','updatedAt']);

export default InstantMeetingTokenScalarFieldEnumSchema;
