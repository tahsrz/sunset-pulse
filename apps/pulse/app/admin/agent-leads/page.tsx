import Link from 'next/link';
import { headers } from 'next/headers';
import { ArrowUpRight, Inbox, Mail, MapPin, Phone, ShieldAlert, UserRound } from 'lucide-react';
import { getOperatorAccess } from '@/lib/core/operator_access';
import { getRequestHostFromHeaders } from '@/lib/core/routeAuth';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata = {
  title: 'Agent Site Leads | Sunset Pulse',
  description: 'Operator inbox for public SaaS agent-site lead submissions.',
};

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
  metadata?: Record<string, unknown> | null;
};

export default async function AgentLeadsPage() {
  const requestHeaders = await headers();
  const access = await getOperatorAccess(getRequestHostFromHeaders(requestHeaders));

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

  const { data, error } = await supabaseAdmin
    .from('agent_site_leads')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);

  const leads = (data || []) as AgentSiteLead[];
  const newestLead = leads[0];
  const listingLeadCount = leads.filter((lead) => lead.listing_mls_id || lead.listing_id).length;
  const uniqueAgents = new Set(leads.map((lead) => lead.agent_id)).size;

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
                Public inquiries captured from tenant agent sites. This inbox keeps listing context, agent routing, and consumer contact details in one operator view.
              </p>
            </div>

            <Link
              href="/admin/branding"
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-5 py-3 text-xs font-black uppercase tracking-[0.16em] text-white transition hover:bg-white/15"
            >
              Agent Profiles
              <ArrowUpRight size={15} />
            </Link>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-4">
            <MetricCard label="Total Leads" value={leads.length.toString()} />
            <MetricCard label="Listing Leads" value={listingLeadCount.toString()} />
            <MetricCard label="Agent Profiles" value={uniqueAgents.toString()} />
            <MetricCard label="Newest" value={newestLead ? formatDate(newestLead.created_at) : 'None'} />
          </div>
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
            <h2 className="text-2xl font-black uppercase italic tracking-tight text-slate-500">No public lead signals yet</h2>
            <p className="mt-3 text-sm text-slate-600">Agent-site forms are wired. New submissions will appear here after consumers send inquiries.</p>
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

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.045] p-5">
      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-100/45">{label}</p>
      <p className="mt-2 text-3xl font-black text-white">{value}</p>
    </div>
  );
}

function LeadCard({ lead }: { lead: AgentSiteLead }) {
  const listingHref = lead.listing_mls_id || lead.listing_id
    ? `/properties/${encodeURIComponent(lead.listing_mls_id || lead.listing_id || '')}`
    : null;

  return (
    <article className="rounded-[2rem] border border-white/10 bg-slate-900/50 p-5 shadow-2xl shadow-black/10">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div>
          <div className="flex flex-wrap items-center gap-2">
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
                    Open listing
                    <ArrowUpRight size={13} />
                  </Link>
                ) : null}
              </div>
            ) : (
              <p className="mt-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-slate-500">General site inquiry</p>
            )}
          </div>

          {lead.page_path ? (
            <p className="mt-5 flex items-center gap-2 text-xs font-bold text-slate-500">
              <MapPin size={14} />
              {lead.page_path}
            </p>
          ) : null}
        </aside>
      </div>
    </article>
  );
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
