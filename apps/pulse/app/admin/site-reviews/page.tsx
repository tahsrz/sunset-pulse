import Link from 'next/link';
import { headers } from 'next/headers';
import type { ReactNode } from 'react';
import { Activity, AlertTriangle, ArrowUpRight, ClipboardList, ShieldAlert } from 'lucide-react';
import { getOperatorAccess } from '@/lib/core/operator_access';
import { getRequestHostFromHeaders } from '@/lib/core/routeAuth';
import { getSiteProvisioningObservability, type SiteProvisioningObservability } from '@/lib/billing/siteProvisioningObservability';
import { supabaseAdmin } from '@/lib/supabase';
import { getPublicAgentSiteUrl } from '@/lib/sites/siteUrls';
import ReviewActions from './ReviewActions';
import StripeEventReconciliationPanel from './StripeEventReconciliationPanel';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata = {
  title: 'Site Review Queue | Sunset Pulse',
  description: 'Operator queue for buyer-submitted agent-site setup reviews.',
};

type SiteReviewRow = {
  agent_id: string;
  owner_name: string | null;
  subdomain: string | null;
  custom_domain: string | null;
  status: string | null;
  subscription_tier: string | null;
  branding: {
    siteName?: string;
  } | null;
  agent_profile: {
    displayName?: string;
    brokerageName?: string;
    email?: string;
  } | null;
  billing_profile: {
    billingStatus?: string;
    trialEndsAt?: string;
    gracePeriodEndsAt?: string;
    billingStatusChangedAt?: string;
  } | null;
  review_profile: {
    status?: string;
    requestedAt?: string;
    requestedBy?: string;
    notes?: string;
  } | null;
  provisioning_audit?: Array<{
    id?: string;
    occurredAt?: string;
    action?: string;
    status?: string;
    message?: string;
    billingStatus?: string;
    siteStatus?: string;
  }> | null;
  updated_at?: string | null;
};

type SiteReviewsPageProps = {
  searchParams?: {
    agentId?: string;
    status?: string;
    billing?: string;
    grace?: string;
  };
};

export default async function SiteReviewsPage({ searchParams }: SiteReviewsPageProps) {
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
    .from('site_config')
    .select('agent_id, owner_name, subdomain, custom_domain, status, subscription_tier, branding, agent_profile, billing_profile, review_profile, provisioning_audit, updated_at')
    .order('updated_at', { ascending: false })
    .limit(100);
  const allRows = ((data || []) as SiteReviewRow[])
    .filter((row) => row.review_profile?.status && row.review_profile.status !== 'not_started')
    .filter((row) => !searchParams?.agentId || row.agent_id === searchParams.agentId);
  const rows = allRows
    .filter((row) => !searchParams?.status || row.review_profile?.status === searchParams.status)
    .filter((row) => !searchParams?.billing || row.billing_profile?.billingStatus === searchParams.billing)
    .filter((row) => searchParams?.grace !== 'expiring_soon' || isGraceExpiringSoon(row));
  const requestedCount = allRows.filter((row) => row.review_profile?.status === 'requested').length;
  const savedCount = allRows.filter((row) => row.review_profile?.status === 'setup_saved').length;
  const approvedCount = allRows.filter((row) => row.review_profile?.status === 'approved').length;
  const changesCount = allRows.filter((row) => row.review_profile?.status === 'changes_requested').length;
  const pastDueCount = allRows.filter((row) => row.billing_profile?.billingStatus === 'past_due').length;
  const unpaidCount = allRows.filter((row) => row.billing_profile?.billingStatus === 'unpaid').length;
  const canceledCount = allRows.filter((row) => row.billing_profile?.billingStatus === 'canceled').length;
  const graceSoonCount = allRows.filter(isGraceExpiringSoon).length;
  const observability = await getSiteProvisioningObservability(allRows);

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-10 border-b border-cyan-400/20 pb-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-3 flex items-center gap-3 text-cyan-300">
                <ClipboardList size={20} />
                <span className="text-[10px] font-black uppercase tracking-[0.35em]">Operator Review</span>
              </div>
              <h1 className="text-4xl font-black uppercase italic tracking-tight text-white sm:text-5xl">
                Site Review Queue
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-400">
                Buyer-submitted setup profiles land here for compliance review, MLS hot-list selection, and final publish from the operator Launch Kit.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <AdminPillLink href="/admin/launch-kit" label="Launch Kit" />
              <AdminPillLink href="/admin/agent-leads" label="Lead Inbox" />
            </div>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3 xl:grid-cols-6">
            <MetricCard label="Queue" value={rows.length.toString()} />
            <MetricCard label="Requested" value={requestedCount.toString()} />
            <MetricCard label="Saved" value={savedCount.toString()} />
            <MetricCard label="Approved" value={approvedCount.toString()} />
            <MetricCard label="Changes" value={changesCount.toString()} />
            <MetricCard label="Past Due" value={pastDueCount.toString()} />
          </div>

          <ProvisioningObservabilityStrip observability={observability} />

          <div className="mt-6 grid gap-4 xl:grid-cols-2">
            <FilterGroup label="Review">
              <FilterLink href={reviewQueueHref(searchParams, { status: '' })} active={!searchParams?.status} label="All" count={allRows.length} />
              <FilterLink href={reviewQueueHref(searchParams, { status: 'requested' })} active={searchParams?.status === 'requested'} label="Requested" count={requestedCount} />
              <FilterLink href={reviewQueueHref(searchParams, { status: 'setup_saved' })} active={searchParams?.status === 'setup_saved'} label="Saved" count={savedCount} />
              <FilterLink href={reviewQueueHref(searchParams, { status: 'approved' })} active={searchParams?.status === 'approved'} label="Approved" count={approvedCount} />
              <FilterLink href={reviewQueueHref(searchParams, { status: 'changes_requested' })} active={searchParams?.status === 'changes_requested'} label="Changes" count={changesCount} />
            </FilterGroup>
            <FilterGroup label="Billing">
              <FilterLink href={reviewQueueHref(searchParams, { billing: '', grace: '' })} active={!searchParams?.billing && !searchParams?.grace} label="All" count={allRows.length} />
              <FilterLink href={reviewQueueHref(searchParams, { billing: 'past_due', grace: '' })} active={searchParams?.billing === 'past_due'} label="Past Due" count={pastDueCount} />
              <FilterLink href={reviewQueueHref(searchParams, { billing: 'unpaid', grace: '' })} active={searchParams?.billing === 'unpaid'} label="Unpaid" count={unpaidCount} />
              <FilterLink href={reviewQueueHref(searchParams, { billing: 'canceled', grace: '' })} active={searchParams?.billing === 'canceled'} label="Canceled" count={canceledCount} />
              <FilterLink href={reviewQueueHref(searchParams, { billing: '', grace: 'expiring_soon' })} active={searchParams?.grace === 'expiring_soon'} label="Grace Soon" count={graceSoonCount} />
            </FilterGroup>
          </div>
        </header>

        {error ? (
          <section className="rounded-3xl border border-red-400/25 bg-red-500/10 p-6">
            <div className="flex items-center gap-3 text-red-200">
              <ShieldAlert />
              <h2 className="text-xl font-black">Review queue failed to load</h2>
            </div>
            <p className="mt-3 text-sm leading-7 text-red-100/80">{error.message}</p>
          </section>
        ) : rows.length === 0 ? (
          <section className="rounded-[2rem] border-2 border-dashed border-white/10 bg-white/[0.03] px-6 py-20 text-center">
            <ClipboardList className="mx-auto mb-5 text-slate-700" size={48} />
            <h2 className="text-2xl font-black uppercase italic tracking-tight text-slate-500">No site reviews waiting</h2>
            <p className="mt-3 text-sm text-slate-600">Buyer setup submissions and review requests will appear here.</p>
          </section>
        ) : (
          <section className="grid gap-5">
            {rows.map((row) => (
              <ReviewCard key={row.agent_id} row={row} />
            ))}
          </section>
        )}
      </div>
    </main>
  );
}

function ProvisioningObservabilityStrip({ observability }: { observability: SiteProvisioningObservability }) {
  const hasWebhookAttention = !observability.webhooks.available
    || observability.webhooks.failed > 0
    || observability.webhooks.staleProcessing > 0;
  const latestFailure = observability.webhooks.latestFailure;

  return (
    <section className="mt-6 rounded-3xl border border-white/10 bg-slate-900/60 p-4">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <div className={`grid h-10 w-10 place-items-center rounded-2xl border ${hasWebhookAttention ? 'border-amber-300/30 bg-amber-300/10 text-amber-100' : 'border-emerald-300/25 bg-emerald-300/10 text-emerald-100'}`}>
            {hasWebhookAttention ? <AlertTriangle size={18} /> : <Activity size={18} />}
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">Payment To Site Observability</p>
            <h2 className="text-lg font-black text-white">
              {hasWebhookAttention ? 'Provisioning needs attention' : 'Provisioning pipeline looks steady'}
            </h2>
          </div>
        </div>
        <p className="text-xs font-bold text-slate-500">
          {observability.windows.recentDays}d window / stale after {observability.windows.staleProcessingMinutes}m
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Signal label="Webhook Failures" value={observability.webhooks.available ? observability.webhooks.failed : 'n/a'} tone={observability.webhooks.failed > 0 || !observability.webhooks.available ? 'warn' : 'ok'} />
        <Signal label="Stale Processing" value={observability.webhooks.available ? observability.webhooks.staleProcessing : 'n/a'} tone={observability.webhooks.staleProcessing > 0 || !observability.webhooks.available ? 'warn' : 'ok'} />
        <Signal label="Duplicates Blocked" value={observability.webhooks.available ? observability.webhooks.duplicates : 'n/a'} tone="neutral" />
        <Signal label="Sites Provisioned" value={observability.sites.recentProvisioned} tone="ok" />
        <Signal label="Billing Recovered" value={observability.sites.recentRecovered} tone="ok" />
        <Signal label="Grace Expired" value={observability.sites.graceExpired} tone={observability.sites.graceExpired > 0 ? 'warn' : 'neutral'} />
      </div>

      {!observability.webhooks.available ? (
        <p className="mt-4 rounded-2xl border border-amber-300/20 bg-amber-300/10 p-3 text-xs leading-5 text-amber-100">
          Stripe webhook ledger unavailable: {observability.webhooks.error}
        </p>
      ) : latestFailure ? (
        <p className="mt-4 rounded-2xl border border-red-300/20 bg-red-300/10 p-3 text-xs leading-5 text-red-100">
          Latest failure: {latestFailure.eventType || latestFailure.eventId} / {formatDate(latestFailure.failedAt, 'time unknown')} / {latestFailure.message}
        </p>
      ) : (
        <p className="mt-4 text-xs leading-5 text-slate-500">
          {observability.webhooks.totalRecent} recent webhook events, {observability.webhooks.succeeded} succeeded, {observability.sites.graceExpiringSoon} grace window ending within 48 hours.
        </p>
      )}
    </section>
  );
}

function ReviewCard({ row }: { row: SiteReviewRow }) {
  const publicUrl = getPublicAgentSiteUrl({
    agentId: row.agent_id,
    subdomain: row.subdomain,
    customDomain: row.custom_domain,
  });
  const reviewStatus = row.review_profile?.status || 'setup_saved';
  const latestAudit = row.provisioning_audit?.[0];

  return (
    <article className="rounded-[2rem] border border-cyan-300/20 bg-slate-900/50 p-5 shadow-2xl shadow-black/10">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div>
          <div className="flex flex-wrap gap-2">
            <StatusBadge status={reviewStatus} />
            <span className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-slate-300">
              {row.status || 'draft'} · {row.subscription_tier || 'site'}
            </span>
            <span className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-slate-300">
              Billing: {formatBillingStatus(row.billing_profile?.billingStatus)}
            </span>
          </div>
          <h2 className="mt-5 text-2xl font-black text-white">{row.branding?.siteName || row.owner_name || row.agent_id}</h2>
          <p className="mt-1 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
            {row.agent_profile?.displayName || row.owner_name || 'Agent'} · {row.agent_profile?.brokerageName || 'Brokerage pending'}
          </p>
          <dl className="mt-5 grid gap-3 text-sm text-slate-300 md:grid-cols-3">
            <Info label="Agent ID" value={row.agent_id} />
            <Info label="Subdomain" value={row.subdomain || 'Pending'} />
            <Info label="Requested" value={formatDate(row.review_profile?.requestedAt || row.updated_at)} />
            <Info label="Trial Ends" value={formatDate(row.billing_profile?.trialEndsAt, 'Not set')} />
            <Info label="Grace Ends" value={formatDate(row.billing_profile?.gracePeriodEndsAt, 'No grace')} />
            <Info label="Billing Changed" value={formatDate(row.billing_profile?.billingStatusChangedAt, 'No change')} />
          </dl>
          {latestAudit ? (
            <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/60 p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Latest Audit Event</p>
              <p className="mt-2 text-sm font-black text-white">{latestAudit.action || 'Provisioning event'}</p>
              <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-400">{latestAudit.message || 'No audit message.'}</p>
              <p className="mt-2 font-mono text-[10px] text-slate-600">
                {[latestAudit.status, latestAudit.billingStatus, latestAudit.siteStatus, formatDate(latestAudit.occurredAt, '')].filter(Boolean).join(' / ')}
              </p>
            </div>
          ) : null}
        </div>
        <div className="grid content-start gap-3">
          <div className="flex flex-wrap gap-3">
            <Link href={`/admin/launch-kit?agentId=${encodeURIComponent(row.agent_id)}`} className="inline-flex items-center gap-2 rounded-2xl bg-cyan-300 px-4 py-3 text-xs font-black uppercase tracking-[0.14em] text-slate-950">
              Review in Launch Kit
              <ArrowUpRight size={14} />
            </Link>
            <a href={publicUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-2xl border border-white/10 px-4 py-3 text-xs font-black uppercase tracking-[0.14em] text-white">
              Public URL
              <ArrowUpRight size={14} />
            </a>
          </div>
          <ReviewActions agentId={row.agent_id} defaultNotes={row.review_profile?.notes || ''} />
          <StripeEventReconciliationPanel agentId={row.agent_id} />
        </div>
      </div>
    </article>
  );
}

function AdminPillLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-5 py-3 text-xs font-black uppercase tracking-[0.16em] text-white transition hover:bg-white/15">
      {label}
      <ArrowUpRight size={15} />
    </Link>
  );
}

function FilterGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-4">
      <p className="mb-3 text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">{label}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function FilterLink({ href, active, label, count }: { href: string; active: boolean; label: string; count: number }) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] transition ${
        active
          ? 'border-cyan-200 bg-cyan-200 text-slate-950'
          : 'border-white/10 bg-slate-950/40 text-slate-300 hover:bg-white/10'
      }`}
    >
      <span>{label}</span>
      <span className={`rounded-full px-2 py-0.5 font-mono text-[10px] ${active ? 'bg-slate-950/15' : 'bg-white/10'}`}>{count}</span>
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

function Signal({ label, value, tone }: { label: string; value: number | string; tone: 'ok' | 'warn' | 'neutral' }) {
  const toneClass = tone === 'ok'
    ? 'border-emerald-300/20 bg-emerald-300/10 text-emerald-100'
    : tone === 'warn'
      ? 'border-amber-300/25 bg-amber-300/10 text-amber-100'
      : 'border-white/10 bg-slate-950/50 text-slate-200';

  return (
    <div className={`rounded-2xl border p-4 ${toneClass}`}>
      <p className="text-[10px] font-black uppercase tracking-[0.16em] opacity-70">{label}</p>
      <p className="mt-2 text-2xl font-black">{value}</p>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
      <dt className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">{label}</dt>
      <dd className="mt-2 truncate font-bold text-white">{value}</dd>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const active = status === 'requested';

  return (
    <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${
      active ? 'border-emerald-300/25 bg-emerald-300/10 text-emerald-100' : 'border-cyan-300/25 bg-cyan-300/10 text-cyan-100'
    }`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}

function formatDate(value?: string | null, fallback = 'Not requested') {
  if (!value) return fallback;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return fallback;

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

function formatBillingStatus(value?: string | null) {
  return (value || 'unknown').replace(/_/g, ' ');
}

function isGraceExpiringSoon(row: SiteReviewRow) {
  if (row.billing_profile?.billingStatus !== 'past_due') return false;
  const graceEndsAt = row.billing_profile?.gracePeriodEndsAt;
  if (!graceEndsAt) return false;
  const graceTime = new Date(graceEndsAt).getTime();
  if (!Number.isFinite(graceTime)) return false;
  const now = Date.now();
  const twoDays = 48 * 60 * 60 * 1000;
  return graceTime > now && graceTime <= now + twoDays;
}

function reviewQueueHref(
  current: SiteReviewsPageProps['searchParams'],
  patch: Partial<NonNullable<SiteReviewsPageProps['searchParams']>>,
) {
  const params = new URLSearchParams();
  const next = {
    agentId: current?.agentId || '',
    status: current?.status || '',
    billing: current?.billing || '',
    grace: current?.grace || '',
    ...patch,
  };

  for (const [key, value] of Object.entries(next)) {
    if (value) params.set(key, value);
  }

  const query = params.toString();
  return query ? `/admin/site-reviews?${query}` : '/admin/site-reviews';
}
