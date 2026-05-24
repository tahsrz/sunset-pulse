import { z } from 'zod';

/////////////////////////////////////////
// MANAGED ORGANIZATION SCHEMA
/////////////////////////////////////////

export const ManagedOrganizationSchema = z.object({
  managedOrganizationId: z.number().int(),
  managerOrganizationId: z.number().int(),
  createdAt: z.coerce.date(),
})

export type ManagedOrganization = z.infer<typeof ManagedOrganizationSchema>

export default ManagedOrganizationSchema;
