import { Building2, MessageSquareText, ShieldCheck, Zap } from 'lucide-react';
import PulseQuestGame from './PulseQuestGame';

export const metadata = {
  title: 'Pulse Quest | Sunset Pulse',
  description: 'Satirical real-estate JRPG — command your broker party through Command Center orchestration.'
};

export default function PulseQuestPage() {
  return (
    <main className="min-h-screen bg-[#06131d] pb-16 text-slate-100">
      <div className="mx-auto max-w-6xl px-4 pt-24">
        <header className="mb-8 text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-emerald-400/90">Satirical brokerage RPG</p>
          <h1 className="mt-2 text-4xl font-black tracking-tight text-white md:text-5xl">
            PULSE <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-500">QUEST</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-slate-400">
            Pick a specialist, issue a broker command, and let the Command Center graph resolve the turn.
            Same orchestration logic — now with DOM goblins and compliance wraiths.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-4 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
            <span className="flex items-center gap-1"><Building2 className="h-3 w-3" /> MLS encounters</span>
            <span className="flex items-center gap-1"><MessageSquareText className="h-3 w-3" /> Puppetshow narration</span>
            <span className="flex items-center gap-1"><ShieldCheck className="h-3 w-3" /> Supervisor shield</span>
            <span className="flex items-center gap-1"><Zap className="h-3 w-3" /> Live Command Center API</span>
          </div>
        </header>

        <PulseQuestGame />
      </div>
    </main>
  );
}
