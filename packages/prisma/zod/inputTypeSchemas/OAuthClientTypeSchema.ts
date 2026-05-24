import { z } from 'zod';

export const OAuthClientTypeSchema = z.enum(['CONFIDENTIAL','PUBLIC']);

export type OAuthClientTypeType = `${z.infer<typeof OAuthClientTypeSchema>}`

export default OAuthClientTypeSchema;
