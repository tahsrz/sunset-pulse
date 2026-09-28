import { PlatformInbox } from '@/components/platform/PlatformInbox';
import JamieVercelConsole from '@/components/chat/JamieVercelConsole';

export default async function WorkspaceInboxPage({ params }: { params: Promise<{ workspaceId: string }> }) {
  const { workspaceId } = await params;
  return <>
    <PlatformInbox workspaceId={workspaceId} />
    <section className="mx-auto w-full max-w-7xl px-4 pb-10 sm:px-6">
      <JamieVercelConsole workspaceId={workspaceId} />
    </section>
  </>;
}
