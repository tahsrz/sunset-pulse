import { z } from 'zod';

export const BookingReportScalarFieldEnumSchema = z.enum(['id','bookingUid','bookerEmail','reportedById','organizationId','reason','description','cancelled','createdAt','updatedAt','status','systemStatus','watchlistId','globalWatchlistId']);

export default BookingReportScalarFieldEnumSchema;
