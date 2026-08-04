import Link from 'next/link';
import { headers } from 'next/headers';
import {
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  DatabaseZap,
  DoorOpen,
  FileText,
  Gauge,
  Mail,
  MapPinned,
  PhoneCall,
  ShieldCheck,
  Target,
  TimerReset,
} from 'lucide-react';
import { getOperatorAccess } from '@/lib/core/operator_access';
import { getRequestHostFromHeaders } from '@/lib/core/routeAuth';
import {
  buildDailyProspectingQueue,
  getLeadVectorLabel,
  type ProspectingOpportunity,
  type ProspectingUrgency,
  type ProspectingVector,
} from '@/lib/lead-generation/prospectingEngine';
import {
  complianceGuardrails,
  dailyTimeBlocks,
  openHouseRunbook,
  operatingVectors,
  sampleProspectingInputs,
  weeklyMilestones,
} from '@/lib/lead-generation/sunsetPulsePlan';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata = {
  title: 'Lead Engine | Sunset Pulse',
  description: 'MLS prospecting, open-house execution, and daily workflow command center.',
};

const queuePreview = buildDailyProspectingQueue(sampleProspectingInputs, 8);

export default async function LeadEnginePage() {
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

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <section className="border-b border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.18),transparent_32%),linear-gradient(135deg,rgba(24,24,27,1),rgba(9,9,11,1))] px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-3 flex items-center gap-3 text-cyan-200">
                <DatabaseZap size={20} />
                <span className="text-[10px] font-black uppercase tracking-[0.32em]">MLS Lead Generation OS</span>
              </div>
              <h1 className="max-w-4xl text-4xl font-black uppercase italic tracking-tight text-white sm:text-5xl">
                Lead Engine
              </h1>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-300">
                Daily command center for expireds, stale DOM, absentee owners, brokerage open houses, and follow-up execution.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <AdminLink href="/admin/orchestrator" label="Import Hotsheet" />
              <AdminLink href="/admin/research-desk" label="Research Desk" />
              <AdminLink href="/admin/lead-drafts" label="Outreach Drafts" />
              <AdminLink href="/admin/agent-leads" label="Lead Inbox" />
              <AdminLink href="/admin/hot-list" label="Hot List" />
            </div>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-4">
            <Metric label="Daily Prospecting Window" value="150 min" detail="09:00-11:30" />
            <Metric label="Primary MLS Threshold" value="45+ DOM" detail="Active stale inventory" />
            <Metric label="Expired Window" value="30-90 days" detail="Restart conversation" />
            <Metric label="Open House Floor" value="20-30 doors" detail="Neighbor preview route" />
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-9 sm:px-6 lg:grid-cols-[minmax(0,1.25fr)_360px] lg:px-8">
        <div className="min-w-0 space-y-8">
          <section className="border border-white/10 bg-white/[0.035]">
            <PanelHeader icon={<Target size={18} />} kicker="Today" title="Prospecting Queue Preview" />
            <div className="divide-y divide-white/10">
              {queuePreview.map((candidate) => (
                <article key={candidate.listingId} className="grid gap-5 p-5 lg:grid-cols-[92px_minmax(0,1fr)_220px]">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-[0.18em] text-zinc-500">Score</p>
                    <p className="mt-2 text-4xl font-black text-white">{candidate.priorityScore}</p>
                  </div>
                  <div className="min-w-0">
                    <h2 className="break-words text-xl font-black text-white">{candidate.address}</h2>
                    <p className="mt-1 text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">{candidate.market}</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {candidate.opportunities.map((opportunity) => (
                        <OpportunityBadge key={opportunity.vector} opportunity={opportunity} />
                      ))}
                    </div>
                    <ul className="mt-4 grid gap-2 text-sm leading-6 text-zinc-300">
                      {candidate.opportunities[0]?.reasons.map((reason) => (
                        <li key={reason} className="flex gap-2">
                          <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-emerald-300" />
                          <span>{reason}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="border-l border-white/10 pl-5">
                    <p className="text-[9px] font-black uppercase tracking-[0.18em] text-zinc-500">Next Action</p>
                    <p className="mt-2 text-sm leading-6 text-zinc-200">{candidate.opportunities[0]?.nextAction}</p>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-2">
            {operatingVectors.map((vector) => (
              <article key={vector.id} className="border border-white/10 bg-zinc-900/60 p-5">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center border border-cyan-200/20 bg-cyan-300/10 text-cyan-100">
                    {getVectorIcon(vector.id as ProspectingVector)}
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-[0.18em] text-cyan-100/55">{vector.trigger}</p>
                    <h2 className="mt-2 text-lg font-black text-white">{vector.name}</h2>
                  </div>
                </div>
                <p className="mt-4 text-sm leading-6 text-zinc-300">{vector.target}</p>
                <p className="mt-3 border-l-2 border-cyan-300/50 pl-3 text-sm leading-6 text-zinc-100">{vector.action}</p>
                <div className="mt-5 grid gap-2">
                  {vector.systemWork.map((item) => (
                    <div key={item} className="flex items-center gap-2 text-xs text-zinc-400">
                      <CheckCircle2 size={14} className="text-emerald-300" />
                      {item}
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </section>

          <section className="border border-white/10 bg-white/[0.035]">
            <PanelHeader icon={<CalendarDays size={18} />} kicker="30 Days" title="Execution Milestones" />
            <div className="grid border-t border-white/10 md:grid-cols-4">
              {weeklyMilestones.map((milestone) => (
                <div key={milestone.week} className="border-b border-r border-white/10 p-5 md:border-b-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-200">{milestone.week}</p>
                  <h3 className="mt-3 text-base font-black text-white">{milestone.focus}</h3>
                  <p className="mt-3 text-sm leading-6 text-zinc-400">{milestone.shippedOutcome}</p>
                </div>
              ))}
            </div>
          </section>
        </div>

        <aside className="space-y-8">
          <section className="border border-white/10 bg-zinc-900/70">
            <PanelHeader icon={<TimerReset size={18} />} kicker="Daily" title="Time Blocks" compact />
            <div className="divide-y divide-white/10">
              {dailyTimeBlocks.map((block) => (
                <div key={block.time} className="p-5">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-200">{block.time}</p>
                  <h3 className="mt-2 text-base font-black text-white">{block.name}</h3>
                  <p className="mt-2 text-sm leading-6 text-zinc-300">{block.outcome}</p>
                  <p className="mt-3 text-xs leading-5 text-zinc-500">{block.automation}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="border border-white/10 bg-zinc-900/70">
            <PanelHeader icon={<DoorOpen size={18} />} kicker="Open House" title="Runbook" compact />
            <ol className="divide-y divide-white/10">
              {openHouseRunbook.map((item, index) => (
                <li key={item} className="flex gap-3 p-4 text-sm leading-6 text-zinc-300">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center bg-cyan-300 text-xs font-black text-zinc-950">
                    {index + 1}
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ol>
          </section>

          <section className="border border-amber-300/20 bg-amber-300/[0.055] p-5">
            <div className="flex items-center gap-2 text-amber-100">
              <ShieldCheck size={17} />
              <h2 className="text-xs font-black uppercase tracking-[0.18em]">Guardrails</h2>
            </div>
            <div className="mt-4 grid gap-3">
              {complianceGuardrails.map((item) => (
                <p key={item} className="text-sm leading-6 text-amber-50/80">{item}</p>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
}

function AdminLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center justify-center gap-2 border border-white/10 bg-white/10 px-4 py-3 text-xs font-black uppercase tracking-[0.14em] text-white transition hover:bg-white/15"
    >
      {label}
      <ArrowUpRight size={14} />
    </Link>
  );
}

function Metric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="border border-white/10 bg-black/20 p-5">
      <p className="text-[9px] font-black uppercase tracking-[0.2em] text-cyan-100/45">{label}</p>
      <p className="mt-2 text-3xl font-black text-white">{value}</p>
      <p className="mt-1 text-xs font-bold uppercase tracking-[0.14em] text-zinc-500">{detail}</p>
    </div>
  );
}

function PanelHeader({
  icon,
  kicker,
  title,
  compact = false,
}: {
  icon: React.ReactNode;
  kicker: string;
  title: string;
  compact?: boolean;
}) {
  return (
    <div className={`flex items-center gap-3 border-b border-white/10 ${compact ? 'p-5' : 'p-6'}`}>
      <div className="text-cyan-200">{icon}</div>
      <div>
        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-cyan-100/45">{kicker}</p>
        <h2 className="mt-1 text-xl font-black text-white">{title}</h2>
      </div>
    </div>
  );
}

function OpportunityBadge({ opportunity }: { opportunity: ProspectingOpportunity }) {
  return (
    <span className={`inline-flex items-center gap-2 border px-3 py-1 text-[10px] font-black uppercase tracking-[0.13em] ${urgencyClass(opportunity.urgency)}`}>
      {getLeadVectorLabel(opportunity.vector)}
      <span>{opportunity.score}</span>
    </span>
  );
}

function urgencyClass(urgency: ProspectingUrgency) {
  switch (urgency) {
    case 'today':
      return 'border-rose-300/25 bg-rose-300/10 text-rose-100';
    case 'this_week':
      return 'border-cyan-300/25 bg-cyan-300/10 text-cyan-100';
    case 'watch':
      return 'border-zinc-300/20 bg-zinc-300/10 text-zinc-200';
  }
}

function getVectorIcon(vector: ProspectingVector) {
  switch (vector) {
    case 'expired_restart':
      return <Mail size={18} />;
    case 'stale_dom':
      return <Gauge size={18} />;
    case 'absentee_owner':
      return <MapPinned size={18} />;
    case 'open_house':
      return <ClipboardList size={18} />;
    default:
      return <PhoneCall size={18} />;
  }
}
