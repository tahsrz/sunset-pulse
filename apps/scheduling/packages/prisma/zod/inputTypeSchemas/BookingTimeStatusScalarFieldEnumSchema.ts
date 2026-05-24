import { z } from 'zod';

export const BookingTimeStatusScalarFieldEnumSchema = z.enum(['id','uid','eventTypeId','title','description','startTime','endTime','createdAt','location','paid','status','rescheduled','userId','teamId','eventLength','timeStatus','eventParentId','userEmail','username','ratingFeedback','rating','noShowHost','isTeamBooking']);

export default BookingTimeStatusScalarFieldEnumSchema;
