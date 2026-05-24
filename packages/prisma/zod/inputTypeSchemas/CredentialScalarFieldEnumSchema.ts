import { z } from 'zod';

export const CredentialScalarFieldEnumSchema = z.enum(['id','type','key','encryptedKey','userId','teamId','appId','subscriptionId','paymentStatus','billingCycleStart','invalid','delegationCredentialId']);

export default CredentialScalarFieldEnumSchema;
