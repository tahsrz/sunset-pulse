import { z } from 'zod';

export const BookingAuditActionSchema = z.enum(['CREATED','CANCELLED','ACCEPTED','REJECTED','PENDING','AWAITING_HOST','RESCHEDULED','ATTENDEE_ADDED','ATTENDEE_REMOVED','REASSIGNMENT','LOCATION_CHANGED','NO_SHOW_UPDATED','RESCHEDULE_REQUESTED','SEAT_BOOKED','SEAT_RESCHEDULED']);

export type BookingAuditActionType = `${z.infer<typeof BookingAuditActionSchema>}`

export default BookingAuditActionSchema;
