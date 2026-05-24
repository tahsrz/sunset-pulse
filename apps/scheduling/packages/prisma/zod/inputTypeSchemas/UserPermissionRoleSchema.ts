import { z } from 'zod';

export const UserPermissionRoleSchema = z.enum(['USER','ADMIN']);

export type UserPermissionRoleType = `${z.infer<typeof UserPermissionRoleSchema>}`

export default UserPermissionRoleSchema;
