import { RunDetail } from '@/components/platform/RunDetail';

export default async function WorkspaceRunPage({ params }: { params: Promise<{ workspaceId: string; runId: string }> }) {
  const { workspaceId, runId } = await params;
  return <RunDetail workspaceId={workspaceId} runId={runId} />;
}
