import { z } from 'zod';

/////////////////////////////////////////
// AGENT SCHEMA
/////////////////////////////////////////

export const AgentSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  userId: z.number().int().nullable(),
  teamId: z.number().int().nullable(),
  providerAgentId: z.string(),
  inboundEventTypeId: z.number().int().nullable(),
  outboundEventTypeId: z.number().int().nullable(),
  enabled: z.boolean(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type Agent = z.infer<typeof AgentSchema>

export default AgentSchema;
