import { z } from 'zod';

export const IdentityProviderSchema = z.enum(['CAL','GOOGLE','SAML','AZUREAD']);

export type IdentityProviderType = `${z.infer<typeof IdentityProviderSchema>}`

export default IdentityProviderSchema;
