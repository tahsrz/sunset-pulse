import { z } from 'zod';

/////////////////////////////////////////
// ROLE PERMISSION SCHEMA
/////////////////////////////////////////

export const RolePermissionSchema = z.object({
  id: z.string().uuid(),
  roleId: z.string(),
  resource: z.string(),
  action: z.string(),
  createdAt: z.coerce.date(),
})

export type RolePermission = z.infer<typeof RolePermissionSchema>

export default RolePermissionSchema;
