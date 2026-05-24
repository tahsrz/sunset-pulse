import { z } from 'zod';

export const OAuthClientStatusSchema = z.enum(['PENDING','APPROVED','REJECTED']);

export type OAuthClientStatusType = `${z.infer<typeof OAuthClientStatusSchema>}`

export default OAuthClientStatusSchema;
