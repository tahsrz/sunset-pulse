import { WorkspaceAccessManager } from '@/components/platform/WorkspaceAccessManager';
import { getSessionUser } from '@/lib/core/getSessionUser';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function WorkspaceAccessPage({ params }: { params: Promise<{ workspaceId: string }> }) {
  const { workspaceId } = await params;
  const session = await getSessionUser();
  if (!session) redirect(`/login?redirect=${encodeURIComponent(`/workspaces/${workspaceId}/access`)}`);
  return <WorkspaceAccessManager workspaceId={workspaceId} actorId={session.userId || session.user.id} />;
}
