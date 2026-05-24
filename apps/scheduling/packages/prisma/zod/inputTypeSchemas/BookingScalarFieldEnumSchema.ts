import { z } from 'zod';

export const BookingScalarFieldEnumSchema = z.enum(['id','uid','idempotencyKey','userId','userPrimaryEmail','eventTypeId','title','description','customInputs','responses','startTime','endTime','location','createdAt','updatedAt','status','paid','destinationCalendarId','cancellationReason','rejectionReason','reassignReason','reassignById','dynamicEventSlugRef','dynamicGroupSlugRef','rescheduled','fromReschedule','recurringEventId','smsReminderNumber','scheduledJobs','metadata','isRecorded','iCalUID','iCalSequence','rating','ratingFeedback','noShowHost','oneTimePassword','cancelledBy','rescheduledBy','creationSource']);

export default BookingScalarFieldEnumSchema;
