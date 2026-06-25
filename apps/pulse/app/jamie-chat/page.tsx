import JamieAssistantWorkspace from '@/components/chat/JamieAssistantWorkspace';
import AgentSelectionArena from '@/components/command-center/AgentSelectionArena';

export const metadata = {
  title: 'JamieChat Workspace | Sunset Pulse',
  description: 'A maximized assistant-ui workspace for JamieChat with Command Center context.'
};

export default function JamieChatWorkspacePage() {
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
          <JamieAssistantWorkspace apiRoute="/api/jamie/chat" isDevMode />
          <section className="min-h-0 overflow-hidden rounded-2xl border border-white/10 bg-slate-950/80">
            <AgentSelectionArena />
          </section>
        </div>
      </div>
    </main>
  );
}
