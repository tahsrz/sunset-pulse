import { headers } from 'next/headers';
import { getOperatorAccess } from '@/lib/core/operator_access';
import { getRequestHostFromHeaders } from '@/lib/core/routeAuth';
import { getOrchestratorSnapshot } from '@/lib/core/orchestrator_node';
import { OrchestratorConsole } from './OrchestratorConsole';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Orchestrator Control Room | Sunset Pulse',
  description: 'Local operator console for the LLM orchestration node, Telegram bridge, TAH memory, and browser checks.'
};

export default async function OrchestratorPage() {
  const requestHeaders = await headers();
  const access = await getOperatorAccess(getRequestHostFromHeaders(requestHeaders));

  if (!access.allowed) {
    return (
      <main className="min-h-screen bg-slate-950 px-6 py-16 text-slate-100">
        <section className="mx-auto max-w-3xl rounded border border-red-300/30 bg-red-500/10 p-8">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-red-200">Operator Access</p>
          <h1 className="mt-3 text-3xl font-black text-white">Access denied</h1>
          <p className="mt-4 leading-7 text-red-100">{access.reason}</p>
        </section>
      </main>
    );
  }

  return <OrchestratorConsole initialSnapshot={getOrchestratorSnapshot(access)} />;
}
