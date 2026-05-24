import { z } from 'zod';

export const BookingStatusSchema = z.enum(['CANCELLED','ACCEPTED','REJECTED','PENDING','AWAITING_HOST']);

export type BookingStatusType = `${z.infer<typeof BookingStatusSchema>}`

export default BookingStatusSchema;
