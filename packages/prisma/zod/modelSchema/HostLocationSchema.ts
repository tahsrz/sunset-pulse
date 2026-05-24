import { z } from 'zod';

/////////////////////////////////////////
// HOST LOCATION SCHEMA
/////////////////////////////////////////

export const HostLocationSchema = z.object({
  id: z.string().uuid(),
  userId: z.number().int(),
  eventTypeId: z.number().int(),
  type: z.string(),
  credentialId: z.number().int().nullable(),
  link: z.string().nullable(),
  address: z.string().nullable(),
  phoneNumber: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type HostLocation = z.infer<typeof HostLocationSchema>

export default HostLocationSchema;
