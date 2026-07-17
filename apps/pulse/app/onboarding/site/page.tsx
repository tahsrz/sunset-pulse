'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { AlertTriangle, ArrowUpRight, CheckCircle2, Circle, Clock3, CreditCard, Loader2, RefreshCw, Rocket, ShieldCheck } from 'lucide-react';
import type { AgentLaunchKitResponse } from '@/lib/sites/launchKit';

type OnboardingResponse = AgentLaunchKitResponse & {
  status: 'ready' | 'reconciled';
  sessionId: string;
  trialDays: number;
  setupUrl: string;
  previewPath: string;
  buyerStatus?: {
    payment: {
      state: 'received' | 'action_needed';
      stripePaymentStatus: string;
    };
    provisioning: {
      state: 'site_ready' | 'site_reconciled' | 'setup_saved';
      siteStatus: string;
    };
    trial: {
      state: string;
      verified: boolean;
      daysExpected: number;
      daysObserved: number | null;
      endsAt: string;
    };
    actionNeeded: boolean;
  };
};

export default function SiteOnboardingPage() {
  return (
    <Suspense fallback={<OnboardingShell loading />}>
      <SiteOnboardingClient />
    </Suspense>
  );
}

function SiteOnboardingClient() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id') || '';
  const [data, setData] = useState<OnboardingResponse | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [attempts, setAttempts] = useState(0);

  const loadOnboarding = useCallback(async (cancelledRef?: { cancelled: boolean }) => {
      if (!sessionId) {
        setError('Checkout session missing.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError('');
      setAttempts((current) => current + 1);

      try {
        const response = await fetch(`/api/onboarding/site?session_id=${encodeURIComponent(sessionId)}`, {
          cache: 'no-store',
        });
        const body = await response.json();

        if (!response.ok || body.error) {
          throw new Error(body.message || 'Site onboarding is unavailable.');
        }

        if (!cancelledRef?.cancelled) setData(body.data);
      } catch (loadError: any) {
        if (!cancelledRef?.cancelled) setError(loadError.message || 'Site onboarding is unavailable.');
      } finally {
        if (!cancelledRef?.cancelled) setLoading(false);
      }
    },
    [sessionId],
  );

  useEffect(() => {
    const cancelledRef = { cancelled: false };
    loadOnboarding(cancelledRef);

    return () => {
      cancelledRef.cancelled = true;
    };
  }, [loadOnboarding]);

  if (loading) return <OnboardingShell loading sessionId={sessionId} attempts={attempts} />;

  if (error || !data) {
    return (
      <OnboardingShell>
        <section className="mx-auto max-w-3xl px-6 py-16">
          <div className="border border-amber-300/30 bg-amber-300/10 p-8 text-amber-50">
            <div className="inline-flex items-center gap-2 text-sm font-black uppercase tracking-[0.2em] text-amber-100">
              <Clock3 size={16} />
              Payment Received
            </div>
            <h1 className="mt-4 text-3xl font-black tracking-tight">Provisioning is still catching up.</h1>
            <p className="mt-3 text-sm leading-6 text-amber-50/85">
              Stripe returned you successfully, but the site workspace is not ready to display yet. This usually clears after the checkout webhook and launch-kit write finish.
            </p>
            {error ? (
              <div className="mt-5 flex items-start gap-3 border border-amber-200/20 bg-slate-950/50 p-4 text-sm leading-6 text-amber-50/80">
                <AlertTriangle className="mt-0.5 shrink-0 text-amber-200" size={18} />
                <p>{error}</p>
              </div>
            ) : null}
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => loadOnboarding()}
                className="inline-flex items-center gap-2 bg-amber-200 px-4 py-3 text-sm font-black uppercase tracking-[0.14em] text-slate-950"
              >
                <RefreshCw size={16} />
                Retry Setup
              </button>
              <Link href="/dashboard" className="inline-flex items-center gap-2 border border-white/15 px-4 py-3 text-sm font-black uppercase tracking-[0.14em] text-white">
                Open Dashboard
                <ArrowUpRight size={16} />
              </Link>
            </div>
            <p className="mt-6 text-xs font-bold leading-5 text-amber-100/70">
              If this keeps showing after a minute, contact Sunset Pulse support with checkout session {sessionId || 'from your receipt'}.
            </p>
          </div>
        </section>
      </OnboardingShell>
    );
  }

  const completeCount = data.readiness.filter((check) => check.complete).length;
  const isPublished = data.kit.status === 'active';
  const buyerSteps = getBuyerSteps(data);

  return (
    <OnboardingShell>
      <main className="mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-10 text-white">
        <header className="flex flex-col gap-4 border-b border-white/10 pb-8 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 border border-cyan-300/25 bg-cyan-300/10 px-3 py-2 text-xs font-black uppercase tracking-[0.18em] text-cyan-100">
              <Rocket size={14} />
              {data.buyerStatus?.trial.verified ? '90 Day Trial Verified' : 'Site Checkout Received'}
            </div>
            <h1 className="mt-5 max-w-3xl text-4xl font-black tracking-tight md:text-6xl">
              {data.kit.branding.siteName} is in draft.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300">
              Your site workspace is provisioned. Finish the checklist, publish when ready, and the public route will open at your Sunset Pulse subdomain.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href={data.setupUrl} className="inline-flex items-center gap-2 bg-cyan-300 px-4 py-3 text-sm font-black uppercase tracking-[0.14em] text-slate-950">
              Open Site Setup
              <ArrowUpRight size={16} />
            </Link>
            {isPublished ? (
              <Link href={data.publicUrl} className="inline-flex items-center gap-2 border border-white/15 px-4 py-3 text-sm font-black uppercase tracking-[0.14em] text-white">
                View Site
                <ArrowUpRight size={16} />
              </Link>
            ) : (
              <span className="inline-flex items-center gap-2 border border-white/10 px-4 py-3 text-sm font-black uppercase tracking-[0.14em] text-slate-500">
                Publish First
              </span>
            )}
          </div>
        </header>

        <section className="grid gap-5 py-8 md:grid-cols-3">
          <StatusPanel label="Payment" value={formatPaymentStatus(data.buyerStatus?.payment.stripePaymentStatus)} detail={data.buyerStatus?.actionNeeded ? 'Billing needs attention' : 'Stripe checkout returned successfully'} />
          <StatusPanel label="Trial" value={data.buyerStatus?.trial.verified ? 'Verified' : formatBillingStatus(data.kit.billingProfile.billingStatus)} detail={data.buyerStatus?.trial.endsAt ? `Ends ${formatShortDate(data.buyerStatus.trial.endsAt)}` : `${data.trialDays} day trial expected`} />
          <StatusPanel label="Checklist" value={`${completeCount}/${data.readiness.length}`} detail={data.readyToPublish ? 'Ready to publish' : 'Needs setup'} />
        </section>

        <section className="border-y border-white/10 py-6">
          <div className="grid gap-3 md:grid-cols-3">
            {buyerSteps.map((step) => (
              <div key={step.label} className="flex min-h-28 items-start gap-4 bg-white/[0.035] p-5">
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center border ${step.complete ? 'border-emerald-300/40 bg-emerald-300/10 text-emerald-200' : 'border-amber-300/40 bg-amber-300/10 text-amber-100'}`}>
                  {step.complete ? <CheckCircle2 size={18} /> : <Clock3 size={18} />}
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">{step.label}</p>
                  <p className="mt-2 text-sm font-bold leading-6 text-slate-100">{step.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-6 pb-12 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="border border-white/10 bg-white/[0.04] p-6">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-xl font-black tracking-tight">Publish Readiness</h2>
              <ShieldCheck className="text-cyan-200" size={22} />
            </div>
            <div className="mt-6 grid gap-3">
              {data.readiness.map((check) => (
                <div key={check.key} className="flex items-center justify-between gap-4 border border-white/10 bg-slate-950/60 px-4 py-3">
                  <span className="text-sm font-bold text-slate-100">{check.label}</span>
                  {check.complete ? (
                    <CheckCircle2 className="shrink-0 text-emerald-300" size={20} />
                  ) : (
                    <Circle className="shrink-0 text-slate-500" size={20} />
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="border border-white/10 bg-slate-900/80 p-6">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-xl font-black tracking-tight">Launch Kit Snapshot</h2>
              <CreditCard className="text-cyan-200" size={22} />
            </div>
            <dl className="mt-6 space-y-4 text-sm">
              <SnapshotRow label="Agent ID" value={data.kit.agentId} />
              <SnapshotRow label="Subdomain" value={data.kit.subdomain} />
              <SnapshotRow label="Tier" value={data.kit.subscriptionTier} />
              <SnapshotRow label="Billing" value={formatBillingStatus(data.kit.billingProfile.billingStatus)} />
              <SnapshotRow label="Assistant" value={data.kit.assistantProfile.displayName} />
              <SnapshotRow label="MLS" value={data.kit.integrationProfile.mlsProvider || 'Pending'} />
            </dl>
          </div>
        </section>
      </main>
    </OnboardingShell>
  );
}

function OnboardingShell({
  children,
  loading = false,
  sessionId = '',
  attempts = 0,
}: {
  children?: React.ReactNode;
  loading?: boolean;
  sessionId?: string;
  attempts?: number;
}) {
  return (
    <div className="min-h-screen bg-[#071013] text-white">
      {loading ? (
        <div className="flex min-h-screen items-center justify-center px-6">
          <div className="max-w-md border border-cyan-300/20 bg-cyan-300/10 p-8 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center border border-cyan-200/30 bg-slate-950/40">
              <Loader2 className="animate-spin text-cyan-100" size={20} />
            </div>
            <p className="mt-5 text-sm font-black uppercase tracking-[0.18em] text-cyan-100">
              Payment Received
            </p>
            <h1 className="mt-3 text-3xl font-black tracking-tight">Preparing your site workspace.</h1>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              Stripe is confirming the checkout and Sunset Pulse is reconciling the launch kit. Keep this tab open while provisioning finishes.
            </p>
            <p className="mt-4 truncate text-xs font-bold text-slate-500">
              {sessionId ? `Session ${sessionId}` : 'Waiting for checkout session'}{attempts > 1 ? ` / attempt ${attempts}` : ''}
            </p>
          </div>
        </div>
      ) : children}
    </div>
  );
}

function StatusPanel({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="border border-white/10 bg-white/[0.04] p-5">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-3 text-2xl font-black capitalize tracking-tight">{value}</p>
      <p className="mt-2 truncate text-xs font-bold text-slate-400">{detail}</p>
    </div>
  );
}

function SnapshotRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-3">
      <dt className="font-bold text-slate-500">{label}</dt>
      <dd className="text-right font-black text-slate-100">{value}</dd>
    </div>
  );
}

function getBuyerSteps(data: OnboardingResponse) {
  const buyerStatus = data.buyerStatus;

  return [
    {
      label: 'Payment',
      complete: buyerStatus?.payment.state === 'received',
      detail: buyerStatus?.actionNeeded
        ? 'Stripe says billing needs attention before launch can continue.'
        : `Checkout status: ${formatPaymentStatus(buyerStatus?.payment.stripePaymentStatus || 'unknown')}.`,
    },
    {
      label: 'Provisioning',
      complete: Boolean(buyerStatus?.provisioning.state),
      detail: buyerStatus?.provisioning.state === 'site_reconciled'
        ? 'The return page restored the site workspace after checkout.'
        : 'Your site workspace is ready for setup.',
    },
    {
      label: 'Trial',
      complete: Boolean(buyerStatus?.trial.verified),
      detail: buyerStatus?.trial.endsAt
        ? `${buyerStatus.trial.daysExpected} day trial ends ${formatShortDate(buyerStatus.trial.endsAt)}.`
        : `${data.trialDays} day trial expected once Stripe confirms the subscription.`,
    },
  ];
}

function formatPaymentStatus(value = 'unknown') {
  if (value === 'no_payment_required') return 'Trial Started';
  if (value === 'paid') return 'Paid';
  if (value === 'unpaid') return 'Unpaid';
  return value.replace(/_/g, ' ') || 'Unknown';
}

function formatBillingStatus(value: string) {
  return value.replace(/_/g, ' ') || 'Unknown';
}

function formatShortDate(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return 'date pending';
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}
