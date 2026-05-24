import { z } from 'zod';

export const MembershipRoleSchema = z.enum(['MEMBER','ADMIN','OWNER']);

export type MembershipRoleType = `${z.infer<typeof MembershipRoleSchema>}`

export default MembershipRoleSchema;
