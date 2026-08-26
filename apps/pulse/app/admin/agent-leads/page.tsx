import Link from 'next/link';
import { headers } from 'next/headers';
import {
  ArrowUpRight,
  BarChart3,
  CircleHelp,
  ClipboardList,
  Inbox,
  Mail,
  MapPin,
  Phone,
  ShieldAlert,
  Target,
  UserRound,
} from 'lucide-react';
import {
  loadPublicGuideConversionAnalytics,
  type PublicGuideConversionAnalytics,
} from '@/lib/ai/publicGuideAnalytics';
import {
  loadAgentConsoleConversionAnalytics,
  type AgentConsoleConversionAnalytics,
} from '@/lib/agent-console/analytics';
import { buildCommercialQueues, summarizeOutcomeEvidence } from '@/lib/agent-console/commercialQueues';
import {
  PUBLIC_GUIDE_DISPOSITIONS,
  readPublicGuideDisposition,
} from '@/lib/ai/publicGuideConversionContract';
import {
  getPublicGuideNextStepLabel,
  publicGuideHandoffBriefSchema,
  type PublicGuideHandoffBrief,
} from '@/lib/ai/publicGuideHandoffContract';
import { getOperatorAccess } from '@/lib/core/operator_access';
import { getRequestHostFromHeaders } from '@/lib/core/routeAuth';
import { supabaseAdmin } from '@/lib/supabase';
import type { LeadStatus as PipelineLeadStatus } from '@/lib/sites/leadOperatingSystem';
import {
  readPublicGuideLeadIntelligence,
  sortLeadsByIntelligence,
  type PublicGuideLeadIntelligence,
} from '@/lib/sites/publicGuideLeadIntelligence';
import { getPublicAgentSiteUrl } from '@/lib/sites/siteUrls';
import AgentLeadActions from './AgentLeadActions';
import NotificationInbox from './NotificationInbox';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata = {
  title: 'Agent Site Leads | Sunset Pulse',
  description: 'Operator inbox for public SaaS agent-site lead submissions.',
};

type LeadStatus = PipelineLeadStatus | 'reviewed';
type StatusFilter = LeadStatus | 'active' | 'all';

type AgentSiteLead = {
  id: string;
  created_at: string;
  agent_id: string;
  site: string;
  site_name: string | null;
  listing_id: string | null;
  listing_mls_id: string | null;
  listing_name: string | null;
  source: string | null;
  page_path: string | null;
  name: string;
  email: string;
  phone: string | null;
  preferred_contact: 'email' | 'phone' | 'either' | null;
  message: string;
  status: LeadStatus | null;
  internal_note: string | null;
  reviewed_at: string | null;
  archived_at: string | null;
  contact_attempted_at: string | null;
  contact_channel: 'call' | 'email' | 'sms' | null;
  responded_at: string | null;
  funnel_id: string | null;
  response_source: 'customer_reply' | 'appointment_booked' | null;
  metadata?: Record<string, unknown> | null;
};

type AgentLeadsPageProps = {
  searchParams?: Promise<{
    status?: string;
    leadId?: string;
  }>;
};

export default async function AgentLeadsPage({ searchParams }: AgentLeadsPageProps) {
  const requestHeaders = await headers();
  const access = await getOperatorAccess(getRequestHostFromHeaders(requestHeaders));
  const resolvedSearchParams = await searchParams;
  const statusFilter = normalizeStatusFilter(resolvedSearchParams?.status);
  const selectedLeadId = normalizeLeadId(resolvedSearchParams?.leadId);

  if (!access.allowed) {
    return (
      <main className="min-h-screen bg-slate-950 px-6 py-16 text-slate-100">
        <section className="mx-auto max-w-3xl rounded-3xl border border-red-300/30 bg-red-500/10 p-8">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-red-200">Operator Access</p>
          <h1 className="mt-3 text-3xl font-black text-white">Access denied</h1>
          <p className="mt-4 leading-7 text-red-100">{access.reason}</p>
        </section>
      </main>
    );
  }

  let query = supabaseAdmin
    .from('agent_site_leads')
    .select('id, created_at, agent_id, site, site_name, listing_id, listing_mls_id, listing_name, source, page_path, name, email, phone, preferred_contact, message, status, internal_note, reviewed_at, archived_at, contact_attempted_at, contact_channel, responded_at, response_source, metadata, funnel_id')
    .order('created_at', { ascending: false })
    .limit(100);

  if (statusFilter === 'active') {
    query = query.neq('status', 'archived');
  } else if (statusFilter !== 'all') {
    query = query.eq('status', statusFilter);
  }
  if (selectedLeadId) query = query.eq('id', selectedLeadId);

  const [leadResult, analyticsResult, agentConsoleAnalyticsResult] = await Promise.all([
    query,
    loadPublicGuideConversionAnalytics()
      .then((analytics) => ({ analytics, failed: false }))
      .catch((analyticsError) => {
        console.warn('[JAMIE_PUBLIC_GUIDE_ANALYTICS]', analyticsError);
        return { analytics: null, failed: true };
      }),
    loadAgentConsoleConversionAnalytics()
      .then((analytics) => ({ analytics, failed: false }))
      .catch((analyticsError) => {
        console.warn('[AGENT_CONSOLE_ANALYTICS]', analyticsError);
        return { analytics: null, failed: true };
      }),
  ]);
  const { data, error } = leadResult;
  const fetchedLeads = (data || []) as AgentSiteLead[];
  const { data: bookingRows } = fetchedLeads.length
    ? await supabaseAdmin.from('scheduling_bookings').select('lead_id, status, appointment_type, start_time').in('lead_id', fetchedLeads.map((lead) => lead.id))
    : { data: [] };
  const { data: outcomeRows } = fetchedLeads.length
    ? await supabaseAdmin.from('billable_outcomes').select('lead_id, outcome_type, billing_status, amount_usd, evidence, occurred_at').in('lead_id', fetchedLeads.map((lead) => lead.id)).order('occurred_at', { ascending: false })
    : { data: [] };
  const outcomeByLead = new Map<string, { outcome_type: string; billing_status: string; amount_usd: number; evidence: Record<string, unknown>; occurred_at: string }>();
  for (const outcome of (outcomeRows || []) as Array<{ lead_id: string; outcome_type: string; billing_status: string; amount_usd: number; evidence: Record<string, unknown> | null; occurred_at: string }>) {
    if (!outcomeByLead.has(outcome.lead_id)) outcomeByLead.set(outcome.lead_id, { ...outcome, evidence: outcome.evidence || {} });
  }
  const commercialQueues = buildCommercialQueues(
    fetchedLeads.map((lead) => ({ id: lead.id, status: lead.status, contact_attempted_at: lead.contact_attempted_at, funnel_id: lead.funnel_id, responded_at: lead.responded_at })),
    (bookingRows || []) as Array<{ lead_id: string; status: string; appointment_type: string; start_time: string }>,
  );
  const newestLead = fetchedLeads[0];
  const leads = sortLeadsByIntelligence(fetchedLeads);
  const listingLeadCount = leads.filter((lead) => lead.listing_mls_id || lead.listing_id).length;
  const uniqueAgents = new Set(leads.map((lead) => lead.agent_id)).size;
  const activeLeadCount = leads.filter((lead) => (lead.status || 'new') !== 'archived').length;

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-10 border-b border-cyan-400/20 pb-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-3 flex items-center gap-3 text-cyan-300">
                <Inbox size={20} />
                <span className="text-[10px] font-black uppercase tracking-[0.35em]">SaaS Signal Intake</span>
              </div>
              <h1 className="text-4xl font-black uppercase italic tracking-tight text-white sm:text-5xl">
                Agent Site Leads
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-400">
                Public inquiries captured from tenant agent sites. Review, note, restore, and archive each lead without leaving the operator inbox.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <NotificationInbox />
              <AdminPillLink href="/admin/lead-engine" label="Lead Engine" />
              <AdminPillLink href="/admin/launch-kit" label="Launch Kit" />
              <AdminPillLink href="/admin/site-reviews" label="Site Reviews" />
              <AdminPillLink href="/admin/hot-list" label="Hot List" />
            </div>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-4">
            <MetricCard label="Total Leads" value={leads.length.toString()} />
            <MetricCard label="Active" value={activeLeadCount.toString()} />
            <MetricCard label="Listing Leads" value={listingLeadCount.toString()} />
            <MetricCard label="Agents" value={uniqueAgents.toString()} />
          </div>
          <p className="mt-3 text-xs font-bold uppercase tracking-[0.18em] text-slate-600">
            Newest: {newestLead ? formatDate(newestLead.created_at) : 'None'}
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-2"><MetricCard label="Appointment Ready" value={commercialQueues.appointmentReady.length.toString()} /><MetricCard label="Hot Uncontacted" value={commercialQueues.hotUncontacted.length.toString()} /></div>
          <div className="mt-6 grid gap-5 lg:grid-cols-2"><QueuePanel title="Appointment Ready" items={commercialQueues.appointmentReady.map(({ lead, booking }) => { const evidence = summarizeOutcomeEvidence(outcomeByLead.get(lead.id) || null, booking.status); return { id: lead.id, detail: `${booking.appointment_type.replaceAll('_', ' ')} · ${booking.status}`, context: evidence.detail || `${booking.start_time} · funnel ${lead.funnel_id || 'unknown'}`, eligibility: evidence.eligibility }; })} /><QueuePanel title="Hot Uncontacted" items={commercialQueues.hotUncontacted.map((lead) => ({ id: lead.id, detail: `status ${lead.status || 'new'}`, context: `funnel ${lead.funnel_id || 'unknown'} · no contact receipt`, eligibility: 'Not eligible' }))} /></div>

          <nav className="mt-6 flex flex-wrap gap-2">
            {[
              ['active', 'Active'],
              ['new', 'New'],
              ['reviewed', 'Reviewed'],
              ['archived', 'Archived'],
              ['all', 'All'],
            ].map(([value, label]) => (
              <Link
                key={value}
                href={`/admin/agent-leads?status=${value}`}
                className={`rounded-full px-4 py-2 text-xs font-black uppercase tracking-[0.14em] transition ${
                  statusFilter === value
                    ? 'bg-cyan-300 text-slate-950'
                    : 'border border-white/10 bg-white/[0.05] text-slate-400 hover:bg-white/10 hover:text-white'
                }`}
              >
                {label}
              </Link>
            ))}
          </nav>
        </header>

        <PublicGuideConversionPanel
          analytics={analyticsResult.analytics}
          failed={analyticsResult.failed}
        />

        <AgentConsoleConversionPanel
          analytics={agentConsoleAnalyticsResult.analytics}
          failed={agentConsoleAnalyticsResult.failed}
        />

        {error ? (
          <section className="rounded-3xl border border-red-400/25 bg-red-500/10 p-6">
            <div className="flex items-center gap-3 text-red-200">
              <ShieldAlert />
              <h2 className="text-xl font-black">Lead inbox failed to load</h2>
            </div>
            <p className="mt-3 text-sm leading-7 text-red-100/80">{error.message}</p>
          </section>
        ) : leads.length === 0 ? (
          <section className="rounded-[2rem] border-2 border-dashed border-white/10 bg-white/[0.03] px-6 py-20 text-center">
            <Inbox className="mx-auto mb-5 text-slate-700" size={48} />
            <h2 className="text-2xl font-black uppercase italic tracking-tight text-slate-500">No matching lead signals</h2>
            <p className="mt-3 text-sm text-slate-600">Try another status filter or wait for new public agent-site inquiries.</p>
          </section>
        ) : (
          <section className="grid gap-5">
            {leads.map((lead) => (
              <LeadCard key={lead.id} lead={lead} />
            ))}
          </section>
        )}
      </div>
    </main>
  );
}

function AdminPillLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-5 py-3 text-xs font-black uppercase tracking-[0.16em] text-white transition hover:bg-white/15"
    >
      {label}
      <ArrowUpRight size={15} />
    </Link>
  );
}

function normalizeLeadId(value?: string) {
  return value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
    ? value
    : null;
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.045] p-5">
      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-100/45">{label}</p>
      <p className="mt-2 text-3xl font-black text-white">{value}</p>
    </div>
  );
}

function QueuePanel({ title, items }: { title: string; items: Array<{ id: string; detail: string; context: string; eligibility: string }> }) {
  return <section className="border border-white/10 bg-white/[0.03] p-5"><h2 className="text-sm font-black uppercase tracking-[0.16em] text-white">{title}</h2><div className="mt-4 space-y-3">{items.length ? items.slice(0, 8).map((item) => <article key={item.id} className="border border-white/[0.08] p-3"><div className="flex items-center justify-between gap-3"><span className="truncate text-xs font-bold text-slate-300">{item.id}</span><span className="text-[10px] font-black uppercase text-cyan-200">{item.eligibility}</span></div><p className="mt-2 text-xs text-slate-300">{item.detail}</p><p className="mt-1 text-[11px] text-slate-500">{item.context}</p></article>) : <p className="text-sm text-slate-500">No leads in this queue.</p>}</div></section>;
}

function LeadCard({ lead }: { lead: AgentSiteLead }) {
  const status = lead.status || 'new';
  const listingHref = lead.listing_mls_id || lead.listing_id
    ? `/properties/${encodeURIComponent(lead.listing_mls_id || lead.listing_id || '')}`
    : null;
  const publicSiteHref = getTenantPreviewUrl(lead.site);
  const guideBriefResult = publicGuideHandoffBriefSchema.safeParse(lead.metadata?.publicGuideBrief);
  const guideBrief = guideBriefResult.success ? guideBriefResult.data : null;
  const guideDisposition = lead.source === 'jamie_public_guide'
    ? readPublicGuideDisposition(lead.metadata)
    : undefined;
  const leadIntelligence = readPublicGuideLeadIntelligence(lead.metadata);

  return (
    <article className={`min-w-0 overflow-hidden rounded-[2rem] border p-5 shadow-2xl shadow-black/10 ${
      status === 'archived'
        ? 'border-slate-700/50 bg-slate-900/25 opacity-80'
        : status === 'reviewed'
          ? 'border-emerald-400/20 bg-emerald-950/10'
          : 'border-cyan-300/20 bg-slate-900/50'
    }`}>
      <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={status} />
            <span className="max-w-full break-all rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-cyan-100">
              {lead.source || 'agent_site'}
            </span>
            <span className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-slate-300">
              {formatDateTime(lead.created_at)}
            </span>
            <span className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-slate-300">
              {lead.preferred_contact || 'either'}
            </span>
          </div>

          <div className="mt-5 flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-cyan-200">
              <UserRound size={21} />
            </div>
            <div className="min-w-0">
              <h2 className="break-words text-2xl font-black text-white">{lead.name}</h2>
              <p className="mt-1 break-all text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                {lead.site_name || lead.site} · {lead.agent_id}
              </p>
            </div>
          </div>

          <p className="mt-5 whitespace-pre-wrap break-words rounded-3xl border border-white/10 bg-slate-950/60 p-5 text-sm leading-7 text-slate-300">
            {lead.message}
          </p>

          {guideBrief ? <PublicGuideBrief brief={guideBrief} /> : null}
          {leadIntelligence ? <LeadIntelligencePanel intelligence={leadIntelligence} /> : null}

          {lead.internal_note ? (
            <div className="mt-4 rounded-3xl border border-amber-300/20 bg-amber-300/10 p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-200">Internal note</p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-amber-50/80">{lead.internal_note}</p>
            </div>
          ) : null}
        </div>

        <aside className="min-w-0 rounded-3xl border border-white/10 bg-slate-950/50 p-5">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-100/45">Contact</p>
          <div className="mt-4 grid gap-2">
            <a
              href={`mailto:${lead.email}?subject=${encodeURIComponent(`Sunset Pulse lead from ${lead.name}`)}`}
              className="inline-flex min-w-0 items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm font-bold text-white transition hover:bg-white/10"
            >
              <Mail size={16} />
              <span className="truncate">{lead.email}</span>
            </a>
            {lead.phone ? (
              <a
                href={`tel:${lead.phone}`}
                className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm font-bold text-white transition hover:bg-white/10"
              >
                <Phone size={16} />
                {lead.phone}
              </a>
            ) : null}
          </div>

          <div className="mt-5 border-t border-white/10 pt-5">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-100/45">Listing Context</p>
            {lead.listing_name || lead.listing_mls_id || lead.listing_id ? (
              <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <p className="text-sm font-black text-white">{lead.listing_name || 'Listing inquiry'}</p>
                {lead.listing_mls_id ? (
                  <p className="mt-1 text-xs font-bold uppercase tracking-[0.14em] text-cyan-100/55">MLS {lead.listing_mls_id}</p>
                ) : null}
                {listingHref ? (
                  <Link href={listingHref} className="mt-3 inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-cyan-200 transition hover:text-cyan-100">
                    Open central listing
                    <ArrowUpRight size={13} />
                  </Link>
                ) : null}
              </div>
            ) : (
              <p className="mt-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-slate-500">General site inquiry</p>
            )}
          </div>

          {lead.page_path ? (
            <a
              href={`${publicSiteHref}${lead.page_path}`}
              target="_blank"
              rel="noreferrer"
              className="mt-5 flex items-center gap-2 text-xs font-bold text-slate-500 transition hover:text-cyan-200"
            >
              <MapPin size={14} />
              Open public page
            </a>
          ) : null}

          <AgentLeadActions
            lead={{
              ...lead,
              status: toPipelineLeadStatus(status),
              internal_note: lead.internal_note,
            }}
            publicGuideDisposition={guideDisposition}
          />
        </aside>
      </div>
    </article>
  );
}

function PublicGuideConversionPanel({
  analytics,
  failed,
}: {
  analytics: PublicGuideConversionAnalytics | null;
  failed: boolean;
}) {
  if (!analytics) {
    return failed ? (
      <section className="mb-8 border-y border-amber-300/20 bg-amber-300/[0.04] px-1 py-5 text-sm text-amber-100">
        Jamie conversion signals are temporarily unavailable. The lead inbox remains operational.
      </section>
    ) : null;
  }

  return (
    <section className="mb-8 border-y border-cyan-300/15 py-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-cyan-200">
            <BarChart3 size={17} />
            <h2 className="text-xs font-black uppercase tracking-[0.2em]">Jamie Conversion</h2>
          </div>
          <p className="mt-2 text-sm text-slate-500">Unique guide sessions over the last {analytics.windowDays} days.</p>
        </div>
        <div className="sm:text-right">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-100/45">Opened to handoff</p>
          <p className="mt-1 text-3xl font-black text-white">
            {analytics.conversionRate === null ? 'No data' : `${analytics.conversionRate}%`}
          </p>
        </div>
      </div>

      <div className="mt-6 grid border-l border-t border-white/10 sm:grid-cols-5">
        {analytics.funnel.map((stage) => (
          <div key={stage.id} className="min-w-0 border-b border-r border-white/10 px-4 py-4">
            <p className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-500">{stage.label}</p>
            <div className="mt-2 flex items-baseline justify-between gap-2">
              <span className="text-2xl font-black text-white">{stage.sessions}</span>
              <span className="text-[10px] font-bold text-cyan-200/60">
                {stage.reachRate === null ? '-' : `${stage.reachRate}%`}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-7 grid gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(260px,0.6fr)]">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-slate-300">
            <CircleHelp size={16} />
            <h3 className="text-[10px] font-black uppercase tracking-[0.18em]">Unanswered Categories</h3>
          </div>
          {analytics.unanswered.length ? (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[560px] border-collapse text-left text-xs">
                <thead className="border-b border-white/10 text-[9px] font-black uppercase tracking-[0.14em] text-slate-600">
                  <tr>
                    <th className="py-2 pr-4">Category</th>
                    <th className="py-2 pr-4">Questions</th>
                    <th className="py-2 pr-4">Sessions</th>
                    <th className="py-2 pr-4">Outcome</th>
                    <th className="py-2">Latest</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.unanswered.map((item) => (
                    <tr key={item.category} className="border-b border-white/[0.06] text-slate-300">
                      <td className="py-3 pr-4 font-bold text-white">{formatIntentCategory(item.category)}</td>
                      <td className="py-3 pr-4">{item.count}</td>
                      <td className="py-3 pr-4">{item.sessions}</td>
                      <td className="py-3 pr-4">{item.outcomes.join(', ') || 'Unknown'}</td>
                      <td className="py-3 text-slate-500">{formatDateTime(item.latestAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="mt-3 border-t border-white/10 py-5 text-sm text-slate-600">No unanswered categories in this window.</p>
          )}
          <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-700">
            Category totals only; question text is not retained.
          </p>
        </div>

        <div>
          <div className="flex items-center gap-2 text-slate-300">
            <Target size={16} />
            <h3 className="text-[10px] font-black uppercase tracking-[0.18em]">Lead Outcomes</h3>
          </div>
          <dl className="mt-3 border-t border-white/10">
            {PUBLIC_GUIDE_DISPOSITIONS.map((disposition) => (
              <div key={disposition.id} className="flex items-center justify-between border-b border-white/[0.06] py-2.5 text-xs">
                <dt className="text-slate-500">{disposition.label}</dt>
                <dd className="font-black text-white">{analytics.dispositionCounts[disposition.id]}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-right text-[10px] font-bold uppercase tracking-[0.12em] text-slate-700">
            {analytics.leadCount} Jamie handoffs
          </p>
        </div>
      </div>
    </section>
  );
}

function LeadIntelligencePanel({ intelligence }: { intelligence: PublicGuideLeadIntelligence }) {
  const scoreStyle = intelligence.level === 'high'
    ? 'border-rose-300/25 bg-rose-300/10 text-rose-100'
    : intelligence.level === 'warm'
      ? 'border-amber-300/25 bg-amber-300/10 text-amber-100'
      : 'border-cyan-300/20 bg-cyan-300/10 text-cyan-100';

  return (
    <section className="mt-5 border-y border-emerald-300/15 py-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-emerald-200">
          <Target size={16} />
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em]">Lead Intelligence</h3>
        </div>
        <span className={`rounded-full border px-3 py-1 text-xs font-black uppercase tracking-[0.14em] ${scoreStyle}`}>
          {intelligence.score} / 100 {intelligence.level}
        </span>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(260px,0.8fr)]">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-100/45">
            Why this score
          </p>
          <ul className="mt-2 grid gap-2">
            {intelligence.reasons.map((reason) => (
              <li key={reason.code} className="flex items-start justify-between gap-4 text-xs leading-5 text-slate-300">
                <span>{reason.label}</span>
                <span className="shrink-0 font-black text-emerald-200">+{reason.points}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="border-l border-white/10 pl-4">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-100/45">
            Recommended action
          </p>
          <p className="mt-2 text-sm font-black text-white">{intelligence.recommendedAction.label}</p>
          <p className="mt-2 text-xs leading-5 text-slate-400">{intelligence.recommendedAction.recommendation}</p>
          <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
            {formatIntentCategory(intelligence.inferredIntent)} / {intelligence.recommendedAction.channel}
          </p>
        </div>
      </div>
    </section>
  );
}

function AgentConsoleConversionPanel({
  analytics,
  failed,
}: {
  analytics: AgentConsoleConversionAnalytics | null;
  failed: boolean;
}) {
  if (!analytics) {
    return failed ? (
      <section className="mb-8 border-y border-amber-300/20 bg-amber-300/[0.04] px-1 py-5 text-sm text-amber-100">
        Agent Console conversion signals are temporarily unavailable. Lead intake remains operational.
      </section>
    ) : null;
  }

  return (
    <section className="mb-8 border-y border-emerald-300/15 py-7">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-emerald-200">
            <BarChart3 size={17} />
            <h2 className="text-xs font-black uppercase tracking-[0.2em]">Agent Console Funnel</h2>
          </div>
          <p className="mt-2 text-sm text-slate-500">Unique console sessions over the last {analytics.windowDays} days.</p>
        </div>
        <div className="grid gap-3 text-left sm:grid-cols-3 lg:min-w-[460px]">
          <MiniRate label="Open to completion" value={analytics.conversionRate} />
          <MiniRate label="Submit to completion" value={analytics.completionRate} />
          <MiniRate label="Reuse after completion" value={analytics.reuseRate} />
        </div>
      </div>

      <div className="mt-6 grid border-l border-t border-white/10 sm:grid-cols-3 xl:grid-cols-6">
        {analytics.funnel.map((stage) => (
          <div key={stage.id} className="min-w-0 border-b border-r border-white/10 px-4 py-4">
            <p className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-500">{stage.label}</p>
            <div className="mt-2 flex items-baseline justify-between gap-2">
              <span className="text-2xl font-black text-white">{stage.sessions}</span>
              <span className="text-[10px] font-bold text-emerald-200/60">
                {stage.reachRate === null ? '-' : `${stage.reachRate}%`}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-7 grid gap-8 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-slate-300">
            <Target size={16} />
            <h3 className="text-[10px] font-black uppercase tracking-[0.18em]">Top Console Jobs</h3>
          </div>
          {analytics.jobs.length ? (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[620px] border-collapse text-left text-xs">
                <thead className="border-b border-white/10 text-[9px] font-black uppercase tracking-[0.14em] text-slate-600">
                  <tr>
                    <th className="py-2 pr-4">Job</th>
                    <th className="py-2 pr-4">Selected</th>
                    <th className="py-2 pr-4">Submitted</th>
                    <th className="py-2 pr-4">Completed</th>
                    <th className="py-2 pr-4">Reused</th>
                    <th className="py-2">Latest</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.jobs.map((job) => (
                    <tr key={job.jobId} className="border-b border-white/[0.06] text-slate-300">
                      <td className="py-3 pr-4 font-bold text-white">{job.label}</td>
                      <td className="py-3 pr-4">{job.selectedSessions}</td>
                      <td className="py-3 pr-4">{job.submittedSessions}</td>
                      <td className="py-3 pr-4">{job.completedSessions}</td>
                      <td className="py-3 pr-4">{job.reusedSessions}</td>
                      <td className="py-3 text-slate-500">{formatDateTime(job.latestAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="mt-3 border-t border-white/10 py-5 text-sm text-slate-600">No Agent Console events in this window.</p>
          )}
          <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-700">
            Counts are session-level aggregates; console input text is not retained.
          </p>
        </div>

        <div>
          <div className="flex items-center gap-2 text-slate-300">
            <CircleHelp size={16} />
            <h3 className="text-[10px] font-black uppercase tracking-[0.18em]">Run Health</h3>
          </div>
          <dl className="mt-3 border-t border-white/10">
            <MetricRow label="Opened" value={analytics.openedSessions} />
            <MetricRow label="Submitted" value={analytics.submittedSessions} />
            <MetricRow label="Completed" value={analytics.completedSessions} />
            <MetricRow label="Copied or saved" value={analytics.reusedSessions} />
            <MetricRow label="Failed" value={analytics.failedSessions} />
          </dl>
        </div>
      </div>
    </section>
  );
}

function MiniRate({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="border border-white/10 bg-white/[0.035] px-4 py-3">
      <p className="text-[9px] font-black uppercase tracking-[0.16em] text-emerald-100/45">{label}</p>
      <p className="mt-1 text-2xl font-black text-white">{value === null ? 'No data' : `${value}%`}</p>
    </div>
  );
}

function MetricRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between border-b border-white/[0.06] py-2.5 text-xs">
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-black text-white">{value}</dd>
    </div>
  );
}

function PublicGuideBrief({ brief }: { brief: PublicGuideHandoffBrief }) {
  const criteria = formatGuideSearchCriteria(brief);

  return (
    <section className="mt-5 border-y border-cyan-300/15 py-5">
      <div className="flex items-center gap-2 text-cyan-200">
        <ClipboardList size={16} />
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em]">Jamie Handoff Brief</h3>
      </div>
      <p className="mt-3 text-sm leading-7 text-slate-200">{brief.summary}</p>
      <dl className="mt-4 grid gap-4 text-xs sm:grid-cols-2">
        <div>
          <dt className="font-black uppercase tracking-[0.14em] text-cyan-100/45">Requested next step</dt>
          <dd className="mt-1 text-slate-300">{getPublicGuideNextStepLabel(brief.statedNextStep)}</dd>
        </div>
        <div>
          <dt className="font-black uppercase tracking-[0.14em] text-cyan-100/45">Search criteria</dt>
          <dd className="mt-1 text-slate-300">{criteria || 'None stated'}</dd>
        </div>
        <div>
          <dt className="font-black uppercase tracking-[0.14em] text-cyan-100/45">Discussed listings</dt>
          <dd className="mt-1 break-words text-slate-300">{brief.discussedListingIds.join(', ') || 'None verified'}</dd>
        </div>
        <div>
          <dt className="font-black uppercase tracking-[0.14em] text-cyan-100/45">Privacy</dt>
          <dd className="mt-1 text-slate-300">{brief.conversationTurnCount} turns summarized; raw transcript not stored</dd>
        </div>
      </dl>
    </section>
  );
}

function formatGuideSearchCriteria(brief: PublicGuideHandoffBrief) {
  const criteria = brief.searchCriteria;
  return [
    ...criteria.locations,
    criteria.transactionType !== 'unknown' ? criteria.transactionType : null,
    criteria.priceMin !== null ? `from $${criteria.priceMin.toLocaleString()}` : null,
    criteria.priceMax !== null ? `up to $${criteria.priceMax.toLocaleString()}` : null,
    criteria.bedsMin !== null ? `${criteria.bedsMin}+ beds` : null,
    criteria.bathsMin !== null ? `${criteria.bathsMin}+ baths` : null,
    criteria.leaseTermMonths !== null ? `${criteria.leaseTermMonths}-month lease` : null,
    criteria.timeline ? `timeline: ${criteria.timeline}` : null,
    ...criteria.propertyTypes,
    ...criteria.priorities,
  ].filter(Boolean).join(' / ');
}

function StatusBadge({ status }: { status: LeadStatus }) {
  const styles = {
    new: 'border-cyan-300/25 bg-cyan-300/10 text-cyan-100',
    contacted: 'border-blue-300/25 bg-blue-300/10 text-blue-100',
    touring: 'border-purple-300/25 bg-purple-300/10 text-purple-100',
    nurture: 'border-amber-300/25 bg-amber-300/10 text-amber-100',
    closed: 'border-emerald-300/25 bg-emerald-300/10 text-emerald-100',
    reviewed: 'border-emerald-300/25 bg-emerald-300/10 text-emerald-100',
    archived: 'border-slate-400/20 bg-slate-400/10 text-slate-300',
  };

  return (
    <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${styles[status]}`}>
      {status}
    </span>
  );
}

function normalizeStatusFilter(value: string | undefined): StatusFilter {
  if (
    value === 'new'
    || value === 'contacted'
    || value === 'touring'
    || value === 'nurture'
    || value === 'closed'
    || value === 'reviewed'
    || value === 'archived'
    || value === 'all'
  ) return value;
  return 'active';
}

function toPipelineLeadStatus(status: LeadStatus): PipelineLeadStatus {
  return status === 'reviewed' ? 'contacted' : status;
}

function getTenantPreviewUrl(site: string) {
  return getPublicAgentSiteUrl({ subdomain: site });
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(new Date(value));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

function formatIntentCategory(value: string) {
  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
