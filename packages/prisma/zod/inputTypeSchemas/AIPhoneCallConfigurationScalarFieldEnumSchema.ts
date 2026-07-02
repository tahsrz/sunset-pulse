import { z } from 'zod';

export const AIPhoneCallConfigurationScalarFieldEnumSchema = z.enum(['id','eventTypeId','generalPrompt','yourPhoneNumber','numberToCall','guestName','enabled','beginMessage','llmId']);

export default AIPhoneCallConfigurationScalarFieldEnumSchema;
