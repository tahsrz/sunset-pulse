import { SlotShell } from '@/components/jamie-vibes/SlotShell';
import { getJamieAgents } from '@/lib/jamie/agenticVibes';

export default async function JamieAgentsSlot() {
  const agents = await getJamieAgents();

  return (
    <SlotShell eyebrow="Slot: @agents" title="Agent Mesh">
      <div className="grid gap-3 sm:grid-cols-2">
        {agents.map((agent) => (
          <article key={agent.id} className="rounded border border-white/10 bg-black/20 p-4">
            <div className="flex items-start gap-3">
              <span
                className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: agent.accent, boxShadow: `0 0 18px ${agent.accent}` }}
              />
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-black text-white">{agent.name}</h3>
                  <span className="rounded bg-white/[0.06] px-2 py-1 text-[9px] font-black uppercase text-slate-400">{agent.state}</span>
                </div>
                <p className="mt-1 text-xs font-bold uppercase text-cyan-100">{agent.role}</p>
                <p className="mt-3 text-xs leading-5 text-slate-400">{agent.signal}</p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </SlotShell>
  );
}
