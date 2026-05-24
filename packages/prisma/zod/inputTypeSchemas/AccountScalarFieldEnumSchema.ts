import { z } from 'zod';

export const AccountScalarFieldEnumSchema = z.enum(['id','userId','type','provider','providerAccountId','providerEmail','refresh_token','access_token','expires_at','token_type','scope','id_token','session_state']);

export default AccountScalarFieldEnumSchema;
