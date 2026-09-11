import { renderGlossaryText as glossaryText } from '@/components/glossary/GlossaryText';
import type { RelayMode } from '@/components/agent-console/agentConsoleConfig';

type DeliverableResponse = {
  result: {
    deliverable: {
      mode?: RelayMode;
      title: string;
      sourceSummary: string;
      frames?: Array<{ label: string; title: string; body: string; speakerNote: string }>;
    };
    relayPlan?: {
      templateName: string;
      mode: RelayMode;
      purpose: string;
      format: { name: string; useWhen: string };
      visual: { motif: string; layout: string };
      words: { voice: string; avoid: string[] };
    };
  };
};

export function CommandDeliverables({ commandResult }: { commandResult: DeliverableResponse }) {
  if (!commandResult.result.deliverable.frames?.length) return <p className="text-sm leading-6 text-slate-400">No deliverable frames were returned for this run.</p>;
  return (
    <div className="space-y-2">
      <p className="text-sm leading-6 text-slate-300">{glossaryText(commandResult.result.deliverable.sourceSummary)}</p>
      {commandResult.result.deliverable.frames.map((frame) => <div key={`${frame.label}-${frame.title}`} className="border border-white/10 bg-black/20 p-3"><p className="font-mono text-[10px] font-black uppercase tracking-[0.14em] text-emerald-100">{frame.label}</p><p className="mt-1 text-sm font-black text-white">{glossaryText(frame.title)}</p><p className="mt-2 text-xs leading-5 text-slate-200">{glossaryText(frame.body)}</p><p className="mt-2 text-xs leading-5 text-slate-400">{glossaryText(frame.speakerNote)}</p></div>)}
    </div>
  );
}

export function CommandRelayPlan({ commandResult }: { commandResult: DeliverableResponse }) {
  const plan = commandResult.result.relayPlan;
  if (!plan) return <p className="text-sm leading-6 text-slate-400">No relay plan was returned for this run.</p>;
  return <div className="space-y-3"><div className="border border-white/10 bg-black/20 p-3"><div className="flex items-start justify-between gap-3"><div><p className="text-base font-black text-white">{plan.templateName}</p><p className="mt-1 text-xs leading-5 text-slate-300">{glossaryText(plan.purpose)}</p></div><span className="shrink-0 border border-amber-200/30 px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-amber-100">{formatRelayMode(plan.mode)}</span></div></div><div className="grid gap-2 md:grid-cols-2"><DetailBlock label="Style" value={plan.format.name} detail={plan.format.useWhen} /><DetailBlock label="Tone" value={plan.words.voice} /><DetailBlock label="Visual" value={plan.visual.motif} detail={plan.visual.layout} /><DetailBlock label="Avoids" value={plan.words.avoid.slice(0, 3).join(', ')} /></div></div>;
}

function DetailBlock({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return <div className="border border-white/10 bg-black/20 p-3"><p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">{label}</p><p className="mt-1 text-sm font-bold text-white">{glossaryText(value)}</p>{detail ? <p className="mt-1 text-xs leading-5 text-slate-300">{glossaryText(detail)}</p> : null}</div>;
}

function formatRelayMode(mode: RelayMode) {
  return ({ briefing: 'brief', slideshow: 'slides', puppetshow: 'story', 'field-board': 'map', script: 'script' } satisfies Record<RelayMode, string>)[mode];
}
