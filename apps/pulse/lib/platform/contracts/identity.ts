import { z } from 'zod';

export const workspaceIdSchema = z.string().uuid();
export const workspaceKindSchema = z.enum(['personal', 'team']);
export const workspaceRoleSchema = z.enum(['owner', 'admin', 'member', 'reviewer', 'viewer']);
export const workspaceStatusSchema = z.enum(['active', 'archived']);
export const membershipStatusSchema = z.enum(['active', 'revoked']);

export type WorkspaceId = string & { readonly __workspaceId: true };
export type ActorId = string & { readonly __actorId: true };
export type SiteId = string & { readonly __siteId: true };
export type WorkspaceKind = z.infer<typeof workspaceKindSchema>;
export type WorkspaceRole = z.infer<typeof workspaceRoleSchema>;
export type WorkspaceStatus = z.infer<typeof workspaceStatusSchema>;
export type MembershipStatus = z.infer<typeof membershipStatusSchema>;

export const workspaceCreateInputSchema = z.object({
  kind: workspaceKindSchema,
  name: z.string().trim().min(1).max(160),
}).strict();

export const workspaceActionSchema = z.enum([
  'workspace:read',
  'workspace:manage_members',
  'workspace:manage_apps',
  'workflow:run',
  'workflow:cancel',
  'property:read',
  'property:edit',
  'artifact:read',
  'artifact:review',
  'effect:approve',
]);
export type WorkspaceAction = z.infer<typeof workspaceActionSchema>;

const actionRoles: Record<WorkspaceAction, readonly WorkspaceRole[]> = {
  'workspace:read': ['owner', 'admin', 'member', 'reviewer', 'viewer'],
  'workspace:manage_members': ['owner', 'admin'],
  'workspace:manage_apps': ['owner', 'admin'],
  'workflow:run': ['owner', 'admin', 'member'],
  'workflow:cancel': ['owner', 'admin', 'member'],
  'property:read': ['owner', 'admin', 'member', 'reviewer', 'viewer'],
  'property:edit': ['owner', 'admin', 'member'],
  'artifact:read': ['owner', 'admin', 'member', 'reviewer', 'viewer'],
  'artifact:review': ['owner', 'admin', 'reviewer'],
  'effect:approve': ['owner', 'admin'],
};

export function roleAllowsAction(role: WorkspaceRole, action: WorkspaceAction): boolean {
  return actionRoles[action].includes(role);
}

export type WorkspaceContext = Readonly<{
  workspaceId: WorkspaceId;
  actorId: ActorId;
  role: WorkspaceRole;
  workspace: Readonly<{
    kind: WorkspaceKind;
    name: string;
    status: WorkspaceStatus;
    revision: number;
  }>;
}>;
