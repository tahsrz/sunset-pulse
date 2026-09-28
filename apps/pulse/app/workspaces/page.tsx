import { WorkspaceHub } from '@/components/platform/WorkspaceHub';
import { getSessionUser } from '@/lib/core/getSessionUser';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function WorkspacesPage() {
  if (!(await getSessionUser())) redirect('/login?redirect=/workspaces');
  return <WorkspaceHub />;
}
