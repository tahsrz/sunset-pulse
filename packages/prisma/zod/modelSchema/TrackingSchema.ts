import { z } from 'zod';

/////////////////////////////////////////
// TRACKING SCHEMA
/////////////////////////////////////////

export const TrackingSchema = z.object({
  id: z.number().int(),
  bookingId: z.number().int(),
  utm_source: z.string().nullable(),
  utm_medium: z.string().nullable(),
  utm_campaign: z.string().nullable(),
  utm_term: z.string().nullable(),
  utm_content: z.string().nullable(),
})

export type Tracking = z.infer<typeof TrackingSchema>

export default TrackingSchema;
