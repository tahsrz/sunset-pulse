'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import Link from 'next/link';
import {
  ArrowUpRight,
  CheckCircle2,
  ClipboardList,
  ExternalLink,
  Loader2,
  Rocket,
  Save,
  Search,
  ShieldCheck,
  TriangleAlert,
} from 'lucide-react';
import {
  createDefaultLaunchKit,
  getLaunchKitSummary,
  parseListInput,
  type AgentLaunchKit,
  type AgentLaunchKitResponse,
} from '@/lib/sites/launchKit';
import { getAgentSiteSubdomain } from '@/lib/sites/siteUrls';

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

export function LaunchKitWorkspace() {
  const [agentIdLookup, setAgentIdLookup] = useState('taz-realty-001');
  const [kit, setKit] = useState<AgentLaunchKit>(() => createDefaultLaunchKit('taz-realty-001'));
  const [publicUrl, setPublicUrl] = useState('');
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  const summary = useMemo(() => getLaunchKitSummary(kit), [kit]);
  const previewUrl = publicUrl || summary.publicUrl;
  const readiness = summary.readiness;
  const readyToPublish = summary.readyToPublish;
  const completedCount = readiness.filter((check) => check.complete).length;

  useEffect(() => {
    void loadKit(agentIdLookup);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadKit(agentId = agentIdLookup) {
    setLoading(true);
    setMessage('');

    try {
      const response = await fetch(`/api/admin/sites/launch-kit?agentId=${encodeURIComponent(agentId)}`, {
        cache: 'no-store',
      });
      const payload = await response.json();

      if (!response.ok || payload.error) {
        throw new Error(payload.message || 'Failed to load launch kit.');
      }

      const data = payload.data as AgentLaunchKitResponse;
      setKit(data.kit);
      setAgentIdLookup(data.kit.agentId);
      setPublicUrl(data.publicUrl);
      setMessage('Launch kit loaded.');
    } catch (error: any) {
      setMessage(error.message || 'Failed to load launch kit.');
    } finally {
      setLoading(false);
    }
  }

  async function saveKit(statusOverride?: AgentLaunchKit['status']) {
    const nextKit = statusOverride ? { ...kit, status: statusOverride } : kit;
    setSaveState('saving');
    setMessage('');

    try {
      const response = await fetch('/api/admin/sites/launch-kit', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nextKit),
      });
      const payload = await response.json();

      if (!response.ok || payload.error) {
        throw new Error(payload.message || 'Failed to save launch kit.');
      }

      const data = payload.data as AgentLaunchKitResponse & { savedStores?: string[] };
      setKit(data.kit);
      setPublicUrl(data.publicUrl);
      setSaveState('saved');
      setMessage(`Saved to ${data.savedStores?.join(' + ') || 'site config'}.`);
    } catch (error: any) {
      setSaveState('error');
      setMessage(error.message || 'Failed to save launch kit.');
    }
  }

  function updateKit(updates: Partial<AgentLaunchKit>) {
    setKit((previous) => ({ ...previous, ...updates }));
    setSaveState('idle');
  }

  function updateAgentId(value: string) {
    const agentId = value.trim().toLowerCase();
    updateKit({
      agentId,
      subdomain: getAgentSiteSubdomain(agentId),
    });
  }

  return (
    <main className="min-h-screen bg-slate-950 px-5 py-24 text-slate-100 md:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-10 rounded-3xl border border-cyan-400/20 bg-gradient-to-br from-cyan-500/10 via-blue-500/10 to-slate-900 p-6 shadow-[0_0_60px_rgba(34,211,238,0.08)] md:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.28em] text-cyan-200">
                <Rocket size={14} />
                Agent Site Launch Kit
              </div>
              <h1 className="text-4xl font-black uppercase italic tracking-tight text-white md:text-6xl">
                Spin up a swappable agent site
              </h1>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300">
                Capture the agent profile, brand shell, lead route, compliance copy, and image-backed MLS hot-list in one place.
                Save as draft while onboarding, then publish to the agent subdomain when the checklist is green.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link href="/admin/branding" className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-xs font-black uppercase tracking-widest text-white/70 transition hover:bg-white/10">
                Identity Architect
              </Link>
              <Link href="/admin/hot-list" className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-xs font-black uppercase tracking-widest text-white/70 transition hover:bg-white/10">
                Hot List
              </Link>
              <a href={previewUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-cyan-300 px-4 py-3 text-xs font-black uppercase tracking-widest text-slate-950 transition hover:bg-cyan-200">
                Preview <ExternalLink size={14} />
              </a>
            </div>
          </div>
        </header>

        <section className="mb-8 grid gap-4 rounded-3xl border border-white/10 bg-slate-900/60 p-5 md:grid-cols-[1fr_auto] md:items-end">
          <label className="block">
            <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">Load existing agent</span>
            <input
              value={agentIdLookup}
              onChange={(event) => setAgentIdLookup(event.target.value)}
              placeholder="taz-realty-001"
              className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-cyan-400"
            />
          </label>
          <button
            onClick={() => loadKit(agentIdLookup)}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-xs font-black uppercase tracking-widest text-slate-950 disabled:opacity-50"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
            Load
          </button>
        </section>

        <div className="mb-8 grid gap-4 lg:grid-cols-4">
          <StatusCard label="Public URL" value={previewUrl.replace(/^https?:\/\//, '')} tone="cyan" />
          <StatusCard label="Status" value={kit.status} tone={kit.status === 'active' ? 'emerald' : 'amber'} />
          <StatusCard label="Readiness" value={`${completedCount}/${readiness.length}`} tone={readyToPublish ? 'emerald' : 'amber'} />
          <StatusCard label="Hot-list IDs" value={String(kit.integrationProfile.hotListMlsIds?.length || 0)} tone="slate" />
        </div>

        {message ? (
          <div className={`mb-8 rounded-2xl border px-4 py-3 text-sm ${
            saveState === 'error'
              ? 'border-red-300/30 bg-red-500/10 text-red-100'
              : 'border-cyan-300/20 bg-cyan-500/10 text-cyan-100'
          }`}>
            {message}
          </div>
        ) : null}

        <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_380px]">
          <section className="space-y-6">
            <Panel title="1. Site shell" icon={<Rocket size={16} />}>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Agent ID" value={kit.agentId} onChange={updateAgentId} />
                <Field label="Subdomain" value={kit.subdomain} onChange={(subdomain) => updateKit({ subdomain })} />
                <Field label="Custom Domain" value={kit.customDomain || ''} onChange={(customDomain) => updateKit({ customDomain })} placeholder="optional custom domain" />
                <SelectField
                  label="Status"
                  value={kit.status}
                  options={['draft', 'active', 'suspended']}
                  onChange={(status) => updateKit({ status: status as AgentLaunchKit['status'] })}
                />
                <Field label="Site Name" value={kit.branding.siteName} onChange={(siteName) => updateKit({ branding: { ...kit.branding, siteName } })} />
                <Field label="Primary Color" value={kit.branding.primaryColor} onChange={(primaryColor) => updateKit({ branding: { ...kit.branding, primaryColor } })} />
                <Field label="Font Family" value={kit.branding.fontFamily} onChange={(fontFamily) => updateKit({ branding: { ...kit.branding, fontFamily } })} />
                <SelectField
                  label="Subscription Tier"
                  value={kit.subscriptionTier}
                  options={['starter', 'site', 'atlas', 'enterprise']}
                  onChange={(subscriptionTier) => updateKit({ subscriptionTier: subscriptionTier as AgentLaunchKit['subscriptionTier'] })}
                />
              </div>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <Field label="Hero Title" value={kit.hero.title} onChange={(title) => updateKit({ hero: { ...kit.hero, title } })} />
                <Field label="Hero Background URL" value={kit.hero.backgroundImage || ''} onChange={(backgroundImage) => updateKit({ hero: { ...kit.hero, backgroundImage } })} />
                <TextArea label="Hero Subtitle" value={kit.hero.subtitle} onChange={(subtitle) => updateKit({ hero: { ...kit.hero, subtitle } })} className="md:col-span-2" />
              </div>
            </Panel>

            <Panel title="2. Agent profile" icon={<ClipboardList size={16} />}>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Owner Name" value={kit.ownerName} onChange={(ownerName) => updateKit({ ownerName })} />
                <Field label="Display Name" value={kit.agentProfile.displayName} onChange={(displayName) => updateKit({ agentProfile: { ...kit.agentProfile, displayName } })} />
                <Field label="Brokerage" value={kit.agentProfile.brokerageName} onChange={(brokerageName) => updateKit({ agentProfile: { ...kit.agentProfile, brokerageName } })} />
                <Field label="License Number" value={kit.agentProfile.licenseNumber || ''} onChange={(licenseNumber) => updateKit({ agentProfile: { ...kit.agentProfile, licenseNumber } })} />
                <Field label="Agent Email" value={kit.agentProfile.email || ''} onChange={(email) => updateKit({ agentProfile: { ...kit.agentProfile, email } })} />
                <Field label="Phone" value={kit.agentProfile.phone || ''} onChange={(phone) => updateKit({ agentProfile: { ...kit.agentProfile, phone } })} />
                <Field label="Headshot URL" value={kit.agentProfile.headshotUrl || ''} onChange={(headshotUrl) => updateKit({ agentProfile: { ...kit.agentProfile, headshotUrl } })} />
                <Field label="Office Address" value={kit.agentProfile.officeAddress || ''} onChange={(officeAddress) => updateKit({ agentProfile: { ...kit.agentProfile, officeAddress } })} />
              </div>
              <TextArea
                label="Markets"
                value={kit.agentProfile.markets.join(', ')}
                onChange={(value) => updateKit({ agentProfile: { ...kit.agentProfile, markets: parseListInput(value) } })}
                className="mt-4"
              />
            </Panel>

            <Panel title="3. Assistant, leads, and MLS" icon={<ArrowUpRight size={16} />}>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Assistant Name" value={kit.assistantProfile.displayName} onChange={(displayName) => updateKit({ assistantProfile: { ...kit.assistantProfile, displayName } })} />
                <Field label="Assistant Role" value={kit.assistantProfile.roleLabel} onChange={(roleLabel) => updateKit({ assistantProfile: { ...kit.assistantProfile, roleLabel } })} />
                <Field label="Assistant Status" value={kit.assistantProfile.statusLabel} onChange={(statusLabel) => updateKit({ assistantProfile: { ...kit.assistantProfile, statusLabel } })} />
                <Field label="Tool Action Label" value={kit.assistantProfile.toolActionLabel} onChange={(toolActionLabel) => updateKit({ assistantProfile: { ...kit.assistantProfile, toolActionLabel } })} />
                <Field label="Chat Placeholder" value={kit.assistantProfile.placeholder} onChange={(placeholder) => updateKit({ assistantProfile: { ...kit.assistantProfile, placeholder } })} />
                <Field label="Lead Email" value={kit.integrationProfile.leadEmail || ''} onChange={(leadEmail) => updateKit({ integrationProfile: { ...kit.integrationProfile, leadEmail } })} />
                <Field label="MLS Provider" value={kit.integrationProfile.mlsProvider || ''} onChange={(mlsProvider) => updateKit({ integrationProfile: { ...kit.integrationProfile, mlsProvider } })} />
                <Field label="Calendar URL" value={kit.integrationProfile.calendarUrl || ''} onChange={(calendarUrl) => updateKit({ integrationProfile: { ...kit.integrationProfile, calendarUrl } })} />
                <Field label="CRM Tag" value={kit.integrationProfile.crmTag || ''} onChange={(crmTag) => updateKit({ integrationProfile: { ...kit.integrationProfile, crmTag } })} />
              </div>
              <TextArea
                label="Hot-list MLS IDs"
                value={(kit.integrationProfile.hotListMlsIds || []).join('\n')}
                onChange={(value) => updateKit({ integrationProfile: { ...kit.integrationProfile, hotListMlsIds: parseListInput(value) } })}
                className="mt-4"
                rows={6}
              />
            </Panel>

            <Panel title="4. Compliance" icon={<ShieldCheck size={16} />}>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Jurisdiction" value={kit.complianceProfile.jurisdiction} onChange={(jurisdiction) => updateKit({ complianceProfile: { ...kit.complianceProfile, jurisdiction } })} />
                <label className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-xs font-black uppercase tracking-widest text-slate-300">
                  Equal Housing
                  <input
                    type="checkbox"
                    checked={kit.complianceProfile.equalHousing}
                    onChange={(event) => updateKit({ complianceProfile: { ...kit.complianceProfile, equalHousing: event.target.checked } })}
                    className="h-4 w-4 accent-cyan-300"
                  />
                </label>
              </div>
              <TextArea label="MLS Disclaimer" value={kit.complianceProfile.mlsDisclaimer} onChange={(mlsDisclaimer) => updateKit({ complianceProfile: { ...kit.complianceProfile, mlsDisclaimer } })} className="mt-4" />
              <TextArea label="Footer Disclaimer" value={kit.complianceProfile.footerDisclaimer} onChange={(footerDisclaimer) => updateKit({ complianceProfile: { ...kit.complianceProfile, footerDisclaimer } })} className="mt-4" />
            </Panel>
          </section>

          <aside className="space-y-6">
            <section className="sticky top-24 rounded-3xl border border-white/10 bg-slate-900/80 p-5 shadow-2xl backdrop-blur">
              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-cyan-300">Launch sequence</p>
              <h2 className="mt-2 text-2xl font-black uppercase italic text-white">
                {readyToPublish ? 'Ready to publish' : 'Draft needs polish'}
              </h2>
              <p className="mt-3 text-xs leading-6 text-slate-400">
                Save as draft any time. Publishing switches the public tenant status to active and keeps the preview URL stable.
              </p>

              <div className="mt-5 space-y-3">
                {readiness.map((check) => (
                  <div key={check.key} className="flex gap-3 rounded-2xl border border-white/10 bg-slate-950/70 p-3">
                    {check.complete ? (
                      <CheckCircle2 className="mt-0.5 shrink-0 text-emerald-300" size={18} />
                    ) : (
                      <TriangleAlert className="mt-0.5 shrink-0 text-amber-300" size={18} />
                    )}
                    <div>
                      <p className="text-xs font-black uppercase tracking-widest text-slate-100">{check.label}</p>
                      <p className="mt-1 text-[11px] text-slate-500">{check.complete ? 'Complete' : 'Missing'}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 grid gap-3">
                <button
                  onClick={() => saveKit('draft')}
                  disabled={saveState === 'saving'}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs font-black uppercase tracking-widest text-white transition hover:bg-white/10 disabled:opacity-50"
                >
                  {saveState === 'saving' ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  Save Draft
                </button>
                <button
                  onClick={() => saveKit('active')}
                  disabled={saveState === 'saving' || !readyToPublish}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-300 px-4 py-3 text-xs font-black uppercase tracking-widest text-emerald-950 transition hover:bg-emerald-200 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {saveState === 'saving' ? <Loader2 size={16} className="animate-spin" /> : <Rocket size={16} />}
                  Publish Agent Site
                </button>
                <a href={previewUrl} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-cyan-300 px-4 py-3 text-xs font-black uppercase tracking-widest text-slate-950 transition hover:bg-cyan-200">
                  Preview Public Site <ExternalLink size={16} />
                </a>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}

function Panel({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-3xl border border-white/10 bg-slate-900/60 p-5 md:p-6">
      <h2 className="mb-5 flex items-center gap-2 text-xs font-black uppercase tracking-[0.24em] text-cyan-300">
        {icon}
        {title}
      </h2>
      {children}
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">{label}</span>
      <input
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-cyan-400"
      />
    </label>
  );
}

function TextArea({
  label,
  value,
  onChange,
  className = '',
  rows = 4,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
  rows?: number;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">{label}</span>
      <textarea
        rows={rows}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full resize-y rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm leading-6 text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-cyan-400"
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-cyan-400"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function StatusCard({ label, value, tone }: { label: string; value: string; tone: 'cyan' | 'emerald' | 'amber' | 'slate' }) {
  const toneClass = {
    cyan: 'border-cyan-300/20 bg-cyan-500/10 text-cyan-100',
    emerald: 'border-emerald-300/20 bg-emerald-500/10 text-emerald-100',
    amber: 'border-amber-300/20 bg-amber-500/10 text-amber-100',
    slate: 'border-white/10 bg-white/5 text-slate-100',
  }[tone];

  return (
    <div className={`rounded-3xl border p-5 ${toneClass}`}>
      <p className="text-[10px] font-black uppercase tracking-[0.24em] opacity-70">{label}</p>
      <p className="mt-2 truncate text-xl font-black uppercase tracking-tight">{value}</p>
    </div>
  );
}
