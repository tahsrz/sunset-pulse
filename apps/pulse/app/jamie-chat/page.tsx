import JamieAssistantWorkspace from '@/components/chat/JamieAssistantWorkspace';
import AgentSelectionArena from '@/components/command-center/AgentSelectionArena';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getSessionUser } from '@/lib/core/getSessionUser';
import { RealtorWorkspaceError, requirePersonalRealtorWorkspace } from '@/lib/realtor-workspace/access.server';

export const metadata = {
  title: 'JamieChat Workspace | Sunset Pulse',
  description: 'A maximized assistant-ui workspace for JamieChat with Command Center context.'
};

export default async function JamieChatWorkspacePage({ searchParams }: { searchParams?: Promise<{ context?: string }> }) {
  const params = await searchParams;
  const context = params?.context === 'personal_realtor' ? 'personal_realtor' : 'general';
  if (context === 'personal_realtor') {
    const session = await getSessionUser();
    if (!session?.userId) redirect('/login?redirect=%2Fjamie-chat%3Fcontext%3Dpersonal_realtor');
    try {
      await requirePersonalRealtorWorkspace(session.userId);
    } catch (error) {
      const setupRequired = error instanceof RealtorWorkspaceError && error.code === 'SETUP_REQUIRED';
      return <main className="min-h-screen bg-slate-950 px-5 py-16 text-white"><section className="mx-auto max-w-2xl rounded-2xl border border-white/10 bg-slate-900 p-8"><p className="text-xs font-bold uppercase tracking-widest text-cyan-200">Personal workspace</p><h1 className="mt-3 text-2xl font-black">{setupRequired ? 'Set up your personal workspace first' : 'Personal Jamie is unavailable'}</h1><p className="mt-3 text-sm leading-6 text-slate-300">{setupRequired ? 'Create your private planner before using Jamie with personal seller or business context.' : 'We could not verify access to this private workspace. No personal data was loaded.'}</p><Link href="/today" className="mt-5 inline-flex rounded-lg bg-cyan-300 px-4 py-2 text-sm font-bold text-slate-950">Open Today</Link></section></main>;
    }
    return <main className="min-h-screen bg-slate-950 px-3 py-5 text-white sm:px-5 lg:px-8"><div className="mx-auto flex min-h-[calc(100vh-2.5rem)] max-w-7xl flex-col gap-5"><JamieAssistantWorkspace key={context} apiRoute="/api/chat" context={context} /><div className="flex flex-wrap gap-2 text-xs"><Link href="/today" className="text-cyan-200 hover:underline">Today</Link><Link href="/planner" className="text-cyan-200 hover:underline">Planner</Link><Link href="/business" className="text-cyan-200 hover:underline">Business</Link></div></div></main>;
  }

  return (
    <main className="min-h-screen bg-slate-950 px-3 py-5 text-white sm:px-5 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-5">
        <section className="flex flex-col gap-2">
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-200">JamieChat Workspace</p>
          <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">Jamie, maximized.</h1>
          <p className="max-w-3xl text-sm leading-6 text-slate-400">
            assistant-ui handles the full chat surface while Jamie keeps using the shared `/api/jamie/chat` route, TensorZero turn records, and Command Center helper context.
          </p>
        </section>

        <div className="grid min-h-[760px] gap-5 xl:grid-cols-[minmax(0,1.05fr)_minmax(420px,0.95fr)]">
          <JamieAssistantWorkspace key={context} apiRoute="/api/jamie/chat" isDevMode context={context} />
          <section className="min-h-0 overflow-hidden rounded-2xl border border-white/10 bg-slate-950/80">
            <AgentSelectionArena embedded />
          </section>
        </div>
      </div>
    </main>
  );
}
