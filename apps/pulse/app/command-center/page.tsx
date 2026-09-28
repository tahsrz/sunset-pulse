import AgentWorkspace from '@/components/agent-workspace/AgentWorkspace';
import AgentSelectionArena from '@/components/command-center/AgentSelectionArena';

export const metadata = {
  title: 'Agent Workspace | Sunset Pulse',
  description: 'Spawn specialized workers, share one finalized conversation, and submit focused real estate intelligence work.'
};

export default async function CommandCenterPage({ searchParams }: { searchParams?: Promise<{ legacy?: string; intake?: string; command?: string }> }) {
  const params = await searchParams;
  // Existing intake/command deep links retain their complete legacy workflow
  // until those entry contracts have an equivalent workspace representation.
  return params?.legacy === '1' || params?.intake || params?.command ? <AgentSelectionArena /> : <AgentWorkspace />;
}
