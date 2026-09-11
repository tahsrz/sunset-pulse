import AgentWorkspace from '@/components/agent-workspace/AgentWorkspace';
import AgentSelectionArena from '@/components/command-center/AgentSelectionArena';

export const metadata = {
  title: 'Agent Workspace | Sunset Pulse',
  description: 'Spawn specialized workers, share one finalized conversation, and submit focused real estate intelligence work.'
};

export default async function CommandCenterPage({ searchParams }: { searchParams?: Promise<{ legacy?: string }> }) {
  const params = await searchParams;
  return params?.legacy === '1' ? <AgentSelectionArena /> : <AgentWorkspace />;
}
