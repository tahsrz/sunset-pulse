'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, CheckCircle2, Circle, CreditCard, Loader2, Save, Send, ShieldCheck } from 'lucide-react';
import type { AgentLaunchKit, AgentLaunchKitResponse } from '@/lib/sites/launchKit';

type SetupResponse = AgentLaunchKitResponse & {
  status: 'ready' | 'reconciled' | 'saved';
  sessionId: string;
  trialDays: number;
  setupUrl: string;
  previewPath: string;
  savedStores?: string[];
};

type SetupForm = {
  ownerName: string;
  siteName: string;
  primaryColor: string;
  fontFamily: string;
  heroTitle: string;
  heroSubtitle: string;
  backgroundImage: string;
  displayName: string;
  brokerageName: string;
  licenseNumber: string;
  phone: string;
  email: string;
  markets: string;
  headshotUrl: string;
  officeAddress: string;
  jurisdiction: string;
  footerDisclaimer: string;
  mlsDisclaimer: string;
  equalHousing: boolean;
  leadEmail: string;
  calendarUrl: string;
  crmTag: string;
};

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

export default function BuyerSiteSetupPage() {
  return (
    <Suspense fallback={<SetupShell loading />}>
      <BuyerSiteSetupClient />
    </Suspense>
  );
}

function BuyerSiteSetupClient() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id') || '';
  const [data, setData] = useState<SetupResponse | null>(null);
  const [form, setForm] = useState<SetupForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [portalLoading, setPortalLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadSetup() {
      if (!sessionId) {
        setMessage('Checkout session missing.');
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/onboarding/site?session_id=${encodeURIComponent(sessionId)}`, {
          cache: 'no-store',
        });
        const body = await response.json();

        if (!response.ok || body.error) {
          throw new Error(body.message || 'Site setup is unavailable.');
        }

        const nextData = body.data as SetupResponse;
        if (!cancelled) {
          setData(nextData);
          setForm(formFromKit(nextData.kit));
        }
      } catch (error: any) {
        if (!cancelled) setMessage(error.message || 'Site setup is unavailable.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadSetup();

    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  const readiness = data?.readiness || [];
  const completeCount = useMemo(() => readiness.filter((check) => check.complete).length, [readiness]);

  async function saveSetup(requestReview = false) {
    if (!form || !sessionId) return;

    setSaveState('saving');
    setMessage('');

    try {
      const response = await fetch(`/api/onboarding/site?session_id=${encodeURIComponent(sessionId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payloadFromForm(form),
          requestReview,
        }),
      });
      const body = await response.json();

      if (!response.ok || body.error) {
        throw new Error(body.message || 'Failed to save site setup.');
      }

      const nextData = body.data as SetupResponse;
      setData(nextData);
      setForm(formFromKit(nextData.kit));
      setSaveState('saved');
      setMessage(requestReview ? 'Review requested. The operator queue has your setup.' : 'Site setup saved.');
    } catch (error: any) {
      setSaveState('error');
      setMessage(error.message || 'Failed to save site setup.');
    }
  }

  async function openBillingPortal() {
    setPortalLoading(true);
    setMessage('');

    try {
      const response = await fetch('/api/billing/site-portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const body = await response.json();

      if (!response.ok || body.error) {
        throw new Error(body.message || 'Billing portal is unavailable.');
      }

      window.location.href = body.data.url;
    } catch (error: any) {
      setMessage(error.message || 'Billing portal is unavailable.');
      setPortalLoading(false);
    }
  }

  function update<K extends keyof SetupForm>(key: K, value: SetupForm[K]) {
    setForm((current) => current ? { ...current, [key]: value } : current);
    setSaveState('idle');
  }

  if (loading) return <SetupShell loading />;

  if (!data || !form) {
    return (
      <SetupShell>
        <main className="mx-auto max-w-3xl px-6 py-16 text-white">
          <div className="border border-rose-400/30 bg-rose-950/30 p-8">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-rose-200">Setup unavailable</p>
            <h1 className="mt-4 text-3xl font-black tracking-tight">We could not load this checkout session.</h1>
            <p className="mt-3 text-sm leading-6 text-rose-100/80">{message}</p>
            <Link href="/premium" className="mt-6 inline-flex items-center gap-2 bg-white px-4 py-3 text-sm font-black uppercase tracking-[0.14em] text-slate-950">
              Back to Premium
            </Link>
          </div>
        </main>
      </SetupShell>
    );
  }

  return (
    <SetupShell>
      <main className="mx-auto max-w-6xl px-6 py-8 text-white">
        <header className="flex flex-col gap-5 border-b border-white/10 pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Link href={`/onboarding/site?session_id=${encodeURIComponent(sessionId)}`} className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-slate-400 hover:text-white">
              <ArrowLeft size={14} />
              Site Onboarding
            </Link>
            <h1 className="mt-4 text-4xl font-black tracking-tight md:text-5xl">Buyer-Safe Site Setup</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
              Edit the public profile and launch copy. Publishing, subdomain changes, billing tier, MLS hot-list IDs, and operator controls stay locked.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="border border-white/10 px-4 py-3 text-xs font-black uppercase tracking-[0.16em] text-slate-300">
              {completeCount}/{readiness.length} Ready
            </div>
            <button
              type="button"
              onClick={openBillingPortal}
              disabled={portalLoading}
              className="inline-flex items-center gap-2 border border-white/15 px-4 py-3 text-sm font-black uppercase tracking-[0.14em] text-white disabled:opacity-50"
            >
              {portalLoading ? <Loader2 className="animate-spin" size={16} /> : <CreditCard size={16} />}
              Billing
            </button>
            <button
              type="button"
              onClick={() => saveSetup(false)}
              disabled={saveState === 'saving'}
              className="inline-flex items-center gap-2 bg-cyan-300 px-4 py-3 text-sm font-black uppercase tracking-[0.14em] text-slate-950 disabled:opacity-50"
            >
              {saveState === 'saving' ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
              Save Setup
            </button>
            <button
              type="button"
              onClick={() => saveSetup(true)}
              disabled={saveState === 'saving'}
              className="inline-flex items-center gap-2 bg-emerald-300 px-4 py-3 text-sm font-black uppercase tracking-[0.14em] text-slate-950 disabled:opacity-50"
            >
              {saveState === 'saving' ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
              Request Review
            </button>
          </div>
        </header>

        {message ? (
          <div className={`mt-5 border px-4 py-3 text-sm font-bold ${saveState === 'error' ? 'border-rose-400/30 bg-rose-950/30 text-rose-100' : 'border-emerald-400/25 bg-emerald-400/10 text-emerald-100'}`}>
            {message}
          </div>
        ) : null}

        <section className="grid gap-6 py-8 lg:grid-cols-[1fr_320px]">
          <div className="space-y-6">
            <Panel title="Brand Shell">
              <Field label="Owner Name" value={form.ownerName} onChange={(value) => update('ownerName', value)} />
              <Field label="Site Name" value={form.siteName} onChange={(value) => update('siteName', value)} />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Primary Color" value={form.primaryColor} onChange={(value) => update('primaryColor', value)} />
                <Field label="Font Family" value={form.fontFamily} onChange={(value) => update('fontFamily', value)} />
              </div>
            </Panel>

            <Panel title="Hero">
              <Field label="Hero Title" value={form.heroTitle} onChange={(value) => update('heroTitle', value)} />
              <TextArea label="Hero Subtitle" value={form.heroSubtitle} onChange={(value) => update('heroSubtitle', value)} rows={3} />
              <Field label="Background Image URL" value={form.backgroundImage} onChange={(value) => update('backgroundImage', value)} />
            </Panel>

            <Panel title="Public Agent Profile">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Display Name" value={form.displayName} onChange={(value) => update('displayName', value)} />
                <Field label="Brokerage Name" value={form.brokerageName} onChange={(value) => update('brokerageName', value)} />
                <Field label="License Number" value={form.licenseNumber} onChange={(value) => update('licenseNumber', value)} />
                <Field label="Phone" value={form.phone} onChange={(value) => update('phone', value)} />
                <Field label="Public Email" value={form.email} onChange={(value) => update('email', value)} />
                <Field label="Headshot URL" value={form.headshotUrl} onChange={(value) => update('headshotUrl', value)} />
              </div>
              <Field label="Markets" value={form.markets} onChange={(value) => update('markets', value)} />
              <Field label="Office Address" value={form.officeAddress} onChange={(value) => update('officeAddress', value)} />
            </Panel>

            <Panel title="Lead Routing">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Lead Email" value={form.leadEmail} onChange={(value) => update('leadEmail', value)} />
                <Field label="Calendar URL" value={form.calendarUrl} onChange={(value) => update('calendarUrl', value)} />
              </div>
              <Field label="CRM Tag" value={form.crmTag} onChange={(value) => update('crmTag', value)} />
            </Panel>

            <Panel title="Compliance">
              <Field label="Jurisdiction" value={form.jurisdiction} onChange={(value) => update('jurisdiction', value)} />
              <TextArea label="Footer Disclaimer" value={form.footerDisclaimer} onChange={(value) => update('footerDisclaimer', value)} rows={4} />
              <TextArea label="MLS Disclaimer" value={form.mlsDisclaimer} onChange={(value) => update('mlsDisclaimer', value)} rows={4} />
              <label className="flex items-center gap-3 text-sm font-bold text-slate-200">
                <input
                  type="checkbox"
                  checked={form.equalHousing}
                  onChange={(event) => update('equalHousing', event.target.checked)}
                  className="h-4 w-4 accent-cyan-300"
                />
                Equal housing notice enabled
              </label>
            </Panel>
          </div>

          <aside className="h-fit border border-white/10 bg-white/[0.04] p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-black tracking-tight">Publish Readiness</h2>
              <ShieldCheck size={20} className="text-cyan-200" />
            </div>
            <div className="mt-5 space-y-3">
              {readiness.map((check) => (
                <div key={check.key} className="flex items-center justify-between gap-3 border border-white/10 bg-slate-950/60 px-3 py-3">
                  <span className="text-xs font-bold text-slate-200">{check.label}</span>
                  {check.complete ? <CheckCircle2 size={18} className="text-emerald-300" /> : <Circle size={18} className="text-slate-500" />}
                </div>
              ))}
            </div>
            <div className="mt-5 border border-amber-300/20 bg-amber-300/10 p-4 text-xs leading-5 text-amber-100">
              MLS hot-list and publishing are handled by the operator Launch Kit after the public setup is complete.
            </div>
            <div className="mt-3 border border-white/10 bg-slate-950/60 p-4 text-xs leading-5 text-slate-300">
              Review status: <span className="font-black uppercase tracking-[0.12em] text-cyan-100">{data.kit.reviewProfile.status}</span>
            </div>
          </aside>
        </section>
      </main>
    </SetupShell>
  );
}

function SetupShell({ children, loading = false }: { children?: ReactNode; loading?: boolean }) {
  return (
    <div className="min-h-screen bg-[#071013] text-white">
      {loading ? (
        <div className="flex min-h-screen items-center justify-center">
          <div className="flex items-center gap-3 text-sm font-black uppercase tracking-[0.18em] text-cyan-100">
            <Loader2 className="animate-spin" size={18} />
            Loading Setup
          </div>
        </div>
      ) : children}
    </div>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border border-white/10 bg-white/[0.04] p-5">
      <h2 className="text-lg font-black tracking-tight">{title}</h2>
      <div className="mt-5 space-y-4">{children}</div>
    </section>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block text-sm font-bold text-slate-300">
      <span>{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full border border-white/10 bg-slate-950 px-3 py-3 text-sm text-white outline-none focus:border-cyan-300"
      />
    </label>
  );
}

function TextArea({ label, value, onChange, rows }: { label: string; value: string; onChange: (value: string) => void; rows: number }) {
  return (
    <label className="block text-sm font-bold text-slate-300">
      <span>{label}</span>
      <textarea
        value={value}
        rows={rows}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full resize-y border border-white/10 bg-slate-950 px-3 py-3 text-sm leading-6 text-white outline-none focus:border-cyan-300"
      />
    </label>
  );
}

function formFromKit(kit: AgentLaunchKit): SetupForm {
  return {
    ownerName: kit.ownerName,
    siteName: kit.branding.siteName,
    primaryColor: kit.branding.primaryColor,
    fontFamily: kit.branding.fontFamily,
    heroTitle: kit.hero.title,
    heroSubtitle: kit.hero.subtitle,
    backgroundImage: kit.hero.backgroundImage || '',
    displayName: kit.agentProfile.displayName,
    brokerageName: kit.agentProfile.brokerageName,
    licenseNumber: kit.agentProfile.licenseNumber || '',
    phone: kit.agentProfile.phone || '',
    email: kit.agentProfile.email || '',
    markets: kit.agentProfile.markets.join(', '),
    headshotUrl: kit.agentProfile.headshotUrl || '',
    officeAddress: kit.agentProfile.officeAddress || '',
    jurisdiction: kit.complianceProfile.jurisdiction,
    footerDisclaimer: kit.complianceProfile.footerDisclaimer,
    mlsDisclaimer: kit.complianceProfile.mlsDisclaimer,
    equalHousing: kit.complianceProfile.equalHousing,
    leadEmail: kit.integrationProfile.leadEmail || '',
    calendarUrl: kit.integrationProfile.calendarUrl || '',
    crmTag: kit.integrationProfile.crmTag || '',
  };
}

function payloadFromForm(form: SetupForm) {
  return {
    ownerName: form.ownerName,
    branding: {
      siteName: form.siteName,
      primaryColor: form.primaryColor,
      fontFamily: form.fontFamily,
    },
    hero: {
      title: form.heroTitle,
      subtitle: form.heroSubtitle,
      backgroundImage: form.backgroundImage,
    },
    agentProfile: {
      displayName: form.displayName,
      brokerageName: form.brokerageName,
      licenseNumber: form.licenseNumber,
      phone: form.phone,
      email: form.email,
      markets: form.markets.split(',').map((market) => market.trim()).filter(Boolean),
      headshotUrl: form.headshotUrl,
      officeAddress: form.officeAddress,
    },
    complianceProfile: {
      jurisdiction: form.jurisdiction,
      footerDisclaimer: form.footerDisclaimer,
      mlsDisclaimer: form.mlsDisclaimer,
      equalHousing: form.equalHousing,
    },
    integrationProfile: {
      leadEmail: form.leadEmail,
      calendarUrl: form.calendarUrl,
      crmTag: form.crmTag,
    },
  };
}
