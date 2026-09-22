import { PlatformInbox } from '@/components/platform/PlatformInbox';

export default async function WorkspaceInboxPage({ params }: { params: Promise<{ workspaceId: string }> }) {
  const { workspaceId } = await params;
  return <PlatformInbox workspaceId={workspaceId} />;
}
