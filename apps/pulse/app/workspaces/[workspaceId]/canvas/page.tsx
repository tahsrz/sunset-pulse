import { CanvasOS } from '@/components/platform/CanvasOS';

export default async function WorkspaceCanvasPage({ params }: { params: Promise<{ workspaceId: string }> }) {
  const { workspaceId } = await params;
  return <CanvasOS workspaceId={workspaceId} />;
}
