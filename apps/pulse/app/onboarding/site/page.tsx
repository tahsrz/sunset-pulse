'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowUpRight, CheckCircle2, Circle, Loader2, Rocket, ShieldCheck } from 'lucide-react';
import type { AgentLaunchKitResponse } from '@/lib/sites/launchKit';

type OnboardingResponse = AgentLaunchKitResponse & {
  status: 'ready' | 'reconciled';
  sessionId: string;
  trialDays: number;
  setupUrl: string;
  previewPath: string;
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

  useEffect(() => {
    let cancelled = false;

    async function loadOnboarding() {
      if (!sessionId) {
        setError('Checkout session missing.');
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/onboarding/site?session_id=${encodeURIComponent(sessionId)}`);
        const body = await response.json();

        if (!response.ok || body.error) {
          throw new Error(body.message || 'Site onboarding is unavailable.');
        }

        if (!cancelled) setData(body.data);
      } catch (loadError: any) {
        if (!cancelled) setError(loadError.message || 'Site onboarding is unavailable.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadOnboarding();

    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  if (loading) return <OnboardingShell loading />;

  if (error || !data) {
    return (
      <OnboardingShell>
        <section className="mx-auto max-w-3xl px-6 py-16">
          <div className="border border-rose-400/30 bg-rose-950/30 p-8 text-rose-50">
            <p className="text-sm font-black uppercase tracking-[0.2em] text-rose-200">Checkout received</p>
            <h1 className="mt-4 text-3xl font-black tracking-tight">Site onboarding needs a refresh.</h1>
            <p className="mt-3 text-sm leading-6 text-rose-100/80">{error || 'Try opening the checkout success link again.'}</p>
            <Link href="/premium" className="mt-6 inline-flex items-center gap-2 bg-white px-4 py-3 text-sm font-black uppercase tracking-[0.14em] text-slate-950">
              Back to Premium
              <ArrowUpRight size={16} />
            </Link>
          </div>
        </section>
      </OnboardingShell>
    );
  }

  const completeCount = data.readiness.filter((check) => check.complete).length;
  const isPublished = data.kit.status === 'active';

  return (
    <OnboardingShell>
      <main className="mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-10 text-white">
        <header className="flex flex-col gap-4 border-b border-white/10 pb-8 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 border border-cyan-300/25 bg-cyan-300/10 px-3 py-2 text-xs font-black uppercase tracking-[0.18em] text-cyan-100">
              <Rocket size={14} />
              90 Day Trial Active
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
          <StatusPanel label="Site" value={data.kit.status} detail={data.publicUrl} />
          <StatusPanel label="Owner" value={data.kit.ownerName} detail={data.kit.agentProfile.email || data.kit.integrationProfile.leadEmail || 'Lead email pending'} />
          <StatusPanel label="Checklist" value={`${completeCount}/${data.readiness.length}`} detail={data.readyToPublish ? 'Ready to publish' : 'Needs setup'} />
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
            <h2 className="text-xl font-black tracking-tight">Launch Kit Snapshot</h2>
            <dl className="mt-6 space-y-4 text-sm">
              <SnapshotRow label="Agent ID" value={data.kit.agentId} />
              <SnapshotRow label="Subdomain" value={data.kit.subdomain} />
              <SnapshotRow label="Tier" value={data.kit.subscriptionTier} />
              <SnapshotRow label="Assistant" value={data.kit.assistantProfile.displayName} />
              <SnapshotRow label="MLS" value={data.kit.integrationProfile.mlsProvider || 'Pending'} />
            </dl>
          </div>
        </section>
      </main>
    </OnboardingShell>
  );
}

function OnboardingShell({ children, loading = false }: { children?: React.ReactNode; loading?: boolean }) {
  return (
    <div className="min-h-screen bg-[#071013] text-white">
      {loading ? (
        <div className="flex min-h-screen items-center justify-center">
          <div className="flex items-center gap-3 text-sm font-black uppercase tracking-[0.18em] text-cyan-100">
            <Loader2 className="animate-spin" size={18} />
            Preparing Site
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
