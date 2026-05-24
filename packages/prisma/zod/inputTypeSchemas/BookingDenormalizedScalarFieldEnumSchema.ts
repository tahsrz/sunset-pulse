import { z } from 'zod';

export const BookingDenormalizedScalarFieldEnumSchema = z.enum(['id','uid','eventTypeId','title','description','startTime','endTime','createdAt','updatedAt','location','paid','status','rescheduled','userId','teamId','eventLength','eventParentId','userEmail','userName','userUsername','ratingFeedback','rating','noShowHost','isTeamBooking']);

export default BookingDenormalizedScalarFieldEnumSchema;
