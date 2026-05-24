import { z } from 'zod';

export const AccessCodeScalarFieldEnumSchema = z.enum(['id','code','clientId','expiresAt','scopes','userId','teamId','codeChallenge','codeChallengeMethod']);

export default AccessCodeScalarFieldEnumSchema;
