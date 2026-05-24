import { z } from 'zod';

export const SMSLockStateSchema = z.enum(['LOCKED','UNLOCKED','REVIEW_NEEDED']);

export type SMSLockStateType = `${z.infer<typeof SMSLockStateSchema>}`

export default SMSLockStateSchema;
