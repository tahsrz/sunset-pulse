import { describe, expect, it } from 'vitest';
import { roleAllowsAction, workspaceCreateInputSchema } from '@/lib/platform/contracts/identity';

describe('platform workspace identity contracts', () => {
  it('accepts bounded personal/team workspace creation input', () => {
    expect(workspaceCreateInputSchema.parse({ kind: 'personal', name: 'Taz workspace' })).toEqual({ kind: 'personal', name: 'Taz workspace' });
    expect(workspaceCreateInputSchema.safeParse({ kind: 'team', name: '' }).success).toBe(false);
    expect(workspaceCreateInputSchema.safeParse({ kind: 'team', name: 'x', extra: true }).success).toBe(false);
  });

  it('keeps effect approval narrower than workspace reading', () => {
    expect(roleAllowsAction('viewer', 'workspace:read')).toBe(true);
    expect(roleAllowsAction('viewer', 'effect:approve')).toBe(false);
    expect(roleAllowsAction('reviewer', 'artifact:review')).toBe(true);
    expect(roleAllowsAction('member', 'artifact:review')).toBe(false);
  });
});
