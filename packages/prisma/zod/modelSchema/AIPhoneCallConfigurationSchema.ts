import { z } from 'zod';

/////////////////////////////////////////
// AI PHONE CALL CONFIGURATION SCHEMA
/////////////////////////////////////////

export const AIPhoneCallConfigurationSchema = z.object({
  id: z.number().int(),
  eventTypeId: z.number().int(),
  generalPrompt: z.string(),
  yourPhoneNumber: z.string(),
  numberToCall: z.string(),
  guestName: z.string(),
  enabled: z.boolean(),
  beginMessage: z.string().nullable(),
  llmId: z.string().nullable(),
})

export type AIPhoneCallConfiguration = z.infer<typeof AIPhoneCallConfigurationSchema>

export default AIPhoneCallConfigurationSchema;
