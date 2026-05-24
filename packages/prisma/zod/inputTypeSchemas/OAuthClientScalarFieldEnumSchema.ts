import { z } from 'zod';

export const OAuthClientScalarFieldEnumSchema = z.enum(['clientId','redirectUri','clientSecret','clientType','name','purpose','logo','websiteUrl','rejectionReason','isTrusted','status','userId','createdAt']);

export default OAuthClientScalarFieldEnumSchema;
