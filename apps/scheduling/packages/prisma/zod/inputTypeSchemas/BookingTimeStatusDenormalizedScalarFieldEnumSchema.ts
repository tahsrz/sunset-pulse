import { z } from 'zod';

export const BookingTimeStatusDenormalizedScalarFieldEnumSchema = z.enum(['id','uid','eventTypeId','title','description','startTime','endTime','createdAt','updatedAt','location','paid','status','rescheduled','userId','teamId','eventLength','eventParentId','userEmail','userName','userUsername','ratingFeedback','rating','noShowHost','isTeamBooking','timeStatus']);

export default BookingTimeStatusDenormalizedScalarFieldEnumSchema;
