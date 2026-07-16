import { headers } from 'next/headers';
import Link from 'next/link';
import { getOperatorAccess } from '@/lib/core/operator_access';
import { getRequestHostFromHeaders } from '@/lib/core/routeAuth';
import { LaunchKitWorkspace } from './LaunchKitWorkspace';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Agent Launch Kit | Sunset Pulse',
  description: 'Operator workspace for publishing swappable Sunset Pulse agent sites.',
};

export default async function AgentLaunchKitPage() {
  const requestHeaders = await headers();
  const access = await getOperatorAccess(getRequestHostFromHeaders(requestHeaders));

  if (!access.allowed) {
    return (
      <main className="min-h-screen bg-slate-950 px-6 py-16 text-slate-100">
        <section className="mx-auto max-w-3xl rounded border border-red-300/30 bg-red-500/10 p-8">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-red-200">Operator Access</p>
          <h1 className="mt-3 text-3xl font-black text-white">Access denied</h1>
          <p className="mt-4 leading-7 text-red-100">{access.reason}</p>
          <Link href="/" className="mt-6 inline-flex rounded-xl bg-white px-4 py-2 text-sm font-black uppercase tracking-widest text-slate-950">
            Return home
          </Link>
        </section>
      </main>
    );
  }

  return <LaunchKitWorkspace />;
}
