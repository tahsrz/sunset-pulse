import Link from 'next/link';
import { headers } from 'next/headers';
import { ArrowUpRight, ClipboardList, Inbox, Mail, MapPin, Phone, ShieldAlert, UserRound } from 'lucide-react';
import {
  getPublicGuideNextStepLabel,
  publicGuideHandoffBriefSchema,
  type PublicGuideHandoffBrief,
} from '@/lib/ai/publicGuideHandoffContract';
import { getOperatorAccess } from '@/lib/core/operator_access';
import { getRequestHostFromHeaders } from '@/lib/core/routeAuth';
import { supabaseAdmin } from '@/lib/supabase';
import { getPublicAgentSiteUrl } from '@/lib/sites/siteUrls';
import AgentLeadActions from './AgentLeadActions';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata = {
  title: 'Agent Site Leads | Sunset Pulse',
  description: 'Operator inbox for public SaaS agent-site lead submissions.',
};

type LeadStatus = 'new' | 'reviewed' | 'archived';
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
  metadata?: Record<string, unknown> | null;
};

type AgentLeadsPageProps = {
  searchParams?: {
    status?: string;
  };
};

export default async function AgentLeadsPage({ searchParams }: AgentLeadsPageProps) {
  const requestHeaders = await headers();
  const access = await getOperatorAccess(getRequestHostFromHeaders(requestHeaders));
  const statusFilter = normalizeStatusFilter(searchParams?.status);

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
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);

  if (statusFilter === 'active') {
    query = query.neq('status', 'archived');
  } else if (statusFilter !== 'all') {
    query = query.eq('status', statusFilter);
  }

  const { data, error } = await query;
  const leads = (data || []) as AgentSiteLead[];
  const newestLead = leads[0];
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

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.045] p-5">
      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-100/45">{label}</p>
      <p className="mt-2 text-3xl font-black text-white">{value}</p>
    </div>
  );
}

function LeadCard({ lead }: { lead: AgentSiteLead }) {
  const status = lead.status || 'new';
  const listingHref = lead.listing_mls_id || lead.listing_id
    ? `/properties/${encodeURIComponent(lead.listing_mls_id || lead.listing_id || '')}`
    : null;
  const publicSiteHref = getTenantPreviewUrl(lead.site);
  const guideBriefResult = publicGuideHandoffBriefSchema.safeParse(lead.metadata?.publicGuideBrief);
  const guideBrief = guideBriefResult.success ? guideBriefResult.data : null;

  return (
    <article className={`rounded-[2rem] border p-5 shadow-2xl shadow-black/10 ${
      status === 'archived'
        ? 'border-slate-700/50 bg-slate-900/25 opacity-80'
        : status === 'reviewed'
          ? 'border-emerald-400/20 bg-emerald-950/10'
          : 'border-cyan-300/20 bg-slate-900/50'
    }`}>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={status} />
            <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-cyan-100">
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
              <h2 className="text-2xl font-black text-white">{lead.name}</h2>
              <p className="mt-1 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                {lead.site_name || lead.site} · {lead.agent_id}
              </p>
            </div>
          </div>

          <p className="mt-5 whitespace-pre-wrap rounded-3xl border border-white/10 bg-slate-950/60 p-5 text-sm leading-7 text-slate-300">
            {lead.message}
          </p>

          {guideBrief ? <PublicGuideBrief brief={guideBrief} /> : null}

          {lead.internal_note ? (
            <div className="mt-4 rounded-3xl border border-amber-300/20 bg-amber-300/10 p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-200">Internal note</p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-amber-50/80">{lead.internal_note}</p>
            </div>
          ) : null}
        </div>

        <aside className="rounded-3xl border border-white/10 bg-slate-950/50 p-5">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-100/45">Contact</p>
          <div className="mt-4 grid gap-2">
            <a
              href={`mailto:${lead.email}?subject=${encodeURIComponent(`Sunset Pulse lead from ${lead.name}`)}`}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm font-bold text-white transition hover:bg-white/10"
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

          <AgentLeadActions leadId={lead.id} status={status} internalNote={lead.internal_note} />
        </aside>
      </div>
    </article>
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
    criteria.priceMin !== null ? `from $${criteria.priceMin.toLocaleString()}` : null,
    criteria.priceMax !== null ? `up to $${criteria.priceMax.toLocaleString()}` : null,
    criteria.bedsMin !== null ? `${criteria.bedsMin}+ beds` : null,
    criteria.bathsMin !== null ? `${criteria.bathsMin}+ baths` : null,
    ...criteria.propertyTypes,
    ...criteria.priorities,
  ].filter(Boolean).join(' / ');
}

function StatusBadge({ status }: { status: LeadStatus }) {
  const styles = {
    new: 'border-cyan-300/25 bg-cyan-300/10 text-cyan-100',
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
  if (value === 'new' || value === 'reviewed' || value === 'archived' || value === 'all') return value;
  return 'active';
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
