import { z } from 'zod';

export const CancellationReasonRequirementSchema = z.enum(['MANDATORY_BOTH','MANDATORY_HOST_ONLY','MANDATORY_ATTENDEE_ONLY','OPTIONAL_BOTH']);

export type CancellationReasonRequirementType = `${z.infer<typeof CancellationReasonRequirementSchema>}`

export default CancellationReasonRequirementSchema;
