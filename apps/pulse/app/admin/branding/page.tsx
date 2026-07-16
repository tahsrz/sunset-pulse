'use client';

import { useState } from 'react';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { useTheme } from '@/context/ThemeProvider';
import { FaPaintBrush, FaSave, FaUndo, FaFont, FaFillDrip, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { supabase } from '@/lib/supabase';
import QuadrantArchitect from '@/components/admin/QuadrantArchitect';
import type {
  AgentProfile,
  AssistantProfile,
  ComplianceProfile,
  IntegrationProfile,
} from '@/lib/sites/agentConfig';
import { getPublicAgentSiteUrl } from '@/lib/sites/siteUrls';

const PRESET_COLORS = ['#2563eb', '#dc2626', '#16a34a', '#9333ea', '#ea580c', '#0f172a'];
const FONTS = ['Inter', 'Roboto Mono', 'Space Grotesk', 'Outfit', 'System-ui'];

type ProfileCheckItem = {
  label: string;
  detail: string;
  complete: boolean;
};

export default function BrandingConfigPage() {
  const { 
    agentId,
    agentProfile,
    assistantProfile,
    complianceProfile,
    integrationProfile,
    setAgentProfile,
    setAssistantProfile,
    setComplianceProfile,
    setIntegrationProfile,
    branding, 
    stagedBranding, 
    stageBranding, 
    confirmBranding, 
    cancelStaging 
  } = useTheme();

  const [saving, setSaving] = useState(false);
  const activeBranding = stagedBranding || branding;
  const profileChecks = buildProfileChecks({
    branding: activeBranding,
    agentProfile,
    assistantProfile,
    complianceProfile,
    integrationProfile,
  });
  const missingProfileChecks = profileChecks.filter((check) => !check.complete);
  const canPublishProfile = missingProfileChecks.length === 0;
  const publicSiteUrl = getPublicAgentSiteUrl({ agentId });
  const firstHotListMlsId = integrationProfile.hotListMlsIds?.[0];
  const publicListingUrl = firstHotListMlsId ? `${publicSiteUrl}/properties/${encodeURIComponent(firstHotListMlsId)}` : null;

  const handleUpdate = (updates: any) => {
    stageBranding(updates);
  };

  const handleQuadrantUpdate = (quadrant: string, field: string, value: string) => {
    const updatedQuadrants = { ...activeBranding.quadrants };
    (updatedQuadrants as any)[quadrant] = { ...(updatedQuadrants as any)[quadrant], [field]: value };
    handleUpdate({ quadrants: updatedQuadrants });
  };

  const saveToSupabase = async () => {
    if (!canPublishProfile) {
      toast.error(`Profile is not publish-ready yet: ${missingProfileChecks[0]?.label || 'missing required fields'}.`);
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('site_config')
        .upsert({
          agent_id: agentId,
          owner_name: agentProfile.displayName,
          status: 'active',
          branding: activeBranding,
          agent_profile: agentProfile,
          assistant_profile: assistantProfile,
          compliance_profile: complianceProfile,
          integration_profile: integrationProfile,
          updated_at: new Date().toISOString()
        }, { onConflict: 'agent_id' });

      if (error) throw error;
      
      confirmBranding();
      toast.success('Branding locked into the grid.');
    } catch (error: any) {
      toast.error(`Grid synchronization failure: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const updateAgentProfile = (updates: Partial<AgentProfile>) => {
    setAgentProfile((previous) => ({ ...previous, ...updates }));
  };

  const updateAssistantProfile = (updates: Partial<AssistantProfile>) => {
    setAssistantProfile((previous) => ({ ...previous, ...updates }));
  };

  const updateComplianceProfile = (updates: Partial<ComplianceProfile>) => {
    setComplianceProfile((previous) => ({ ...previous, ...updates }));
  };

  const updateIntegrationProfile = (updates: Partial<IntegrationProfile>) => {
    setIntegrationProfile((previous) => ({ ...previous, ...updates }));
  };

  const updateCsvList = (value: string, onUpdate: (items: string[]) => void) => {
    onUpdate(value.split(/[\n,]/).map((item) => item.trim()).filter(Boolean));
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8 font-mono pb-24">
      <div className="max-w-6xl mx-auto">
        <header className="flex flex-col justify-between gap-6 mb-12 border-b border-blue-500/30 pb-6 lg:flex-row lg:items-end">
          <div>
            <div className="flex items-center gap-2 text-blue-500 mb-2">
              <FaPaintBrush />
              <span className="text-[10px] font-black uppercase tracking-[0.4em]">Visual Override</span>
            </div>
            <h1 className="text-4xl font-black uppercase italic tracking-tighter text-blue-50">Identity Architect</h1>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/admin/launch-kit"
              className="flex items-center gap-2 bg-cyan-400/10 hover:bg-cyan-400/20 text-cyan-200 px-5 py-3 rounded-xl font-black uppercase tracking-widest text-xs transition-all border border-cyan-300/20"
            >
              Launch Kit
            </Link>
            <Link
              href="/admin/agent-leads"
              className="flex items-center gap-2 bg-white/5 hover:bg-white/10 text-white/70 px-5 py-3 rounded-xl font-black uppercase tracking-widest text-xs transition-all"
            >
              Lead Inbox
            </Link>
            <a
              href={publicSiteUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 bg-white/5 hover:bg-white/10 text-white/70 px-5 py-3 rounded-xl font-black uppercase tracking-widest text-xs transition-all"
            >
              Preview Site
            </a>
            {publicListingUrl ? (
              <a
                href={publicListingUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 bg-white/5 hover:bg-white/10 text-white/70 px-5 py-3 rounded-xl font-black uppercase tracking-widest text-xs transition-all"
              >
                Preview Listing
              </a>
            ) : null}
            {stagedBranding && (
              <button 
                onClick={cancelStaging}
                className="flex items-center gap-2 bg-white/5 hover:bg-white/10 text-white/60 px-6 py-3 rounded-xl font-black uppercase tracking-widest text-xs transition-all"
              >
                <FaUndo /> Discard
              </button>
            )}
            <button 
              onClick={saveToSupabase}
              disabled={saving || !canPublishProfile}
              className="flex items-center gap-3 bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-xl font-black uppercase tracking-widest text-xs transition-all disabled:opacity-50 shadow-[0_0_20px_rgba(37,99,235,0.3)]"
              title={canPublishProfile ? 'Publish this agent profile' : 'Complete the publish checklist before committing public changes'}
            >
              {saving ? <FaCheckCircle className="animate-pulse" /> : <FaSave />}
              {saving ? 'Transmitting...' : canPublishProfile ? 'Commit to Public' : 'Complete Checklist'}
            </button>
          </div>
        </header>

        {stagedBranding && (
          <div className="bg-blue-600/20 border border-blue-500/50 rounded-2xl p-4 mb-8 flex items-center gap-4 animate-pulse">
            <FaExclamationTriangle className="text-blue-400" />
            <p className="text-[10px] font-black uppercase tracking-widest text-blue-200">
              Visual modifications staged. These changes are local until you "Commit to Public".
            </p>
          </div>
        )}

        <ProfileReadinessPanel checks={profileChecks} />

        <section className="mb-8 rounded-3xl border border-cyan-400/20 bg-cyan-950/20 p-6 shadow-[0_0_40px_rgba(34,211,238,0.08)]">
          <div className="mb-6 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-cyan-300">SaaS Agent Site WIP</p>
              <h2 className="mt-2 text-2xl font-black uppercase italic tracking-tight text-cyan-50">Public Agent Profile</h2>
            </div>
            <p className="max-w-xl text-xs leading-6 text-cyan-100/60">
              These fields feed the public tenant site, Jamie naming, MLS hot-list selection, lead routing, and compliance copy.
            </p>
          </div>

          <div className="grid gap-6 xl:grid-cols-4">
            <ProfilePanel title="Site & Agent">
              <ProfileField
                label="Public Site Name"
                value={activeBranding.siteName || ''}
                placeholder="Sunset Pulse Homes"
                onChange={(value) => handleUpdate({ siteName: value })}
              />
              <ProfileField label="Agent ID" value={agentId} readOnly />
              <ProfileField
                label="Agent Name"
                value={agentProfile.displayName}
                onChange={(value) => updateAgentProfile({ displayName: value })}
              />
              <ProfileField
                label="Brokerage"
                value={agentProfile.brokerageName}
                onChange={(value) => updateAgentProfile({ brokerageName: value })}
              />
              <ProfileField
                label="License Number"
                value={agentProfile.licenseNumber || ''}
                onChange={(value) => updateAgentProfile({ licenseNumber: value })}
              />
              <ProfileTextArea
                label="Markets"
                value={agentProfile.markets.join(', ')}
                placeholder="North Texas, Frisco, Abilene"
                onChange={(value) => updateCsvList(value, (markets) => updateAgentProfile({ markets }))}
              />
            </ProfilePanel>

            <ProfilePanel title="Contact">
              <ProfileField
                label="Agent Email"
                type="email"
                value={agentProfile.email || ''}
                onChange={(value) => updateAgentProfile({ email: value })}
              />
              <ProfileField
                label="Lead Email"
                type="email"
                value={integrationProfile.leadEmail || ''}
                onChange={(value) => updateIntegrationProfile({ leadEmail: value })}
              />
              <ProfileField
                label="Phone"
                value={agentProfile.phone || ''}
                onChange={(value) => updateAgentProfile({ phone: value })}
              />
              <ProfileField
                label="Office Address"
                value={agentProfile.officeAddress || ''}
                onChange={(value) => updateAgentProfile({ officeAddress: value })}
              />
              <ProfileField
                label="Headshot URL"
                value={agentProfile.headshotUrl || ''}
                onChange={(value) => updateAgentProfile({ headshotUrl: value })}
              />
              <ProfileField
                label="Calendar URL"
                value={integrationProfile.calendarUrl || ''}
                onChange={(value) => updateIntegrationProfile({ calendarUrl: value })}
              />
            </ProfilePanel>

            <ProfilePanel title="Assistant & MLS">
              <ProfileField
                label="Assistant Name"
                value={assistantProfile.displayName}
                onChange={(value) => updateAssistantProfile({ displayName: value })}
              />
              <ProfileField
                label="Assistant Role"
                value={assistantProfile.roleLabel}
                onChange={(value) => updateAssistantProfile({ roleLabel: value })}
              />
              <ProfileField
                label="Placeholder"
                value={assistantProfile.placeholder}
                onChange={(value) => updateAssistantProfile({ placeholder: value })}
              />
              <ProfileField
                label="MLS Provider"
                value={integrationProfile.mlsProvider || ''}
                onChange={(value) => updateIntegrationProfile({ mlsProvider: value })}
              />
              <ProfileField
                label="CRM Tag"
                value={integrationProfile.crmTag || ''}
                onChange={(value) => updateIntegrationProfile({ crmTag: value })}
              />
              <ProfileTextArea
                label="Hot-list MLS IDs"
                value={(integrationProfile.hotListMlsIds || []).join('\n')}
                placeholder="21177832&#10;21320835"
                onChange={(value) => updateCsvList(value, (hotListMlsIds) => updateIntegrationProfile({ hotListMlsIds }))}
              />
            </ProfilePanel>

            <ProfilePanel title="Compliance">
              <ProfileField
                label="Jurisdiction"
                value={complianceProfile.jurisdiction}
                onChange={(value) => updateComplianceProfile({ jurisdiction: value })}
              />
              <ProfileTextArea
                label="MLS Disclaimer"
                value={complianceProfile.mlsDisclaimer}
                onChange={(value) => updateComplianceProfile({ mlsDisclaimer: value })}
              />
              <ProfileTextArea
                label="Footer Disclaimer"
                value={complianceProfile.footerDisclaimer}
                onChange={(value) => updateComplianceProfile({ footerDisclaimer: value })}
              />
              <label className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-300">
                Equal Housing
                <input
                  type="checkbox"
                  checked={complianceProfile.equalHousing}
                  onChange={(event) => updateComplianceProfile({ equalHousing: event.target.checked })}
                  className="h-4 w-4 accent-cyan-400"
                />
              </label>
            </ProfilePanel>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Core Identity */}
          <div className="lg:col-span-4 space-y-8">
            <section className="bg-slate-900/50 border border-white/5 rounded-2xl p-6">
              <h2 className="text-xs font-black uppercase tracking-[0.2em] text-blue-400 mb-6 flex items-center gap-2">
                <FaFillDrip /> Core Palette
              </h2>
              <div className="space-y-6">
                <div>
                  <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-3 block">Primary Hex</label>
                  <div className="flex gap-4">
                    <input 
                      type="color" 
                      value={activeBranding.primaryColor}
                      onChange={(e) => handleUpdate({ primaryColor: e.target.value })}
                      className="w-12 h-12 rounded-lg bg-transparent cursor-pointer"
                    />
                    <input 
                      type="text" 
                      value={activeBranding.primaryColor}
                      onChange={(e) => handleUpdate({ primaryColor: e.target.value })}
                      className="flex-1 bg-slate-950 border border-white/5 rounded-lg px-4 text-xs font-mono uppercase"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-6 gap-2">
                  {PRESET_COLORS.map(c => (
                    <button 
                      key={c}
                      onClick={() => handleUpdate({ primaryColor: c })}
                      className="w-full aspect-square rounded-md border border-white/10 hover:scale-110 transition-transform"
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            </section>

            <section className="bg-slate-900/50 border border-white/5 rounded-2xl p-6">
              <h2 className="text-xs font-black uppercase tracking-[0.2em] text-blue-400 mb-6 flex items-center gap-2">
                <FaFont /> Typography
              </h2>
              <div className="space-y-4">
                {FONTS.map(f => (
                  <button 
                    key={f}
                    onClick={() => handleUpdate({ fontFamily: f })}
                    className={`w-full text-left px-4 py-3 rounded-xl border text-xs transition-all ${
                      activeBranding.fontFamily === f 
                        ? 'bg-blue-600/20 border-blue-500 text-white' 
                        : 'bg-slate-950 border-white/5 text-slate-500 hover:text-slate-300'
                    }`}
                    style={{ fontFamily: f }}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </section>
          </div>

          {/* Quadrant Architect */}
          <div className="lg:col-span-8">
            <QuadrantArchitect 
              quadrants={activeBranding.quadrants}
              borderRadius={activeBranding.borderRadius}
              mainBackground={activeBranding.mainBackground}
              handleUpdate={handleUpdate}
              handleQuadrantUpdate={handleQuadrantUpdate}
            />
          </div>

        </div>
      </div>
    </div>
  );
}

function buildProfileChecks({
  branding,
  agentProfile,
  assistantProfile,
  complianceProfile,
  integrationProfile,
}: {
  branding: { siteName?: string; primaryColor?: string; fontFamily?: string };
  agentProfile: AgentProfile;
  assistantProfile: AssistantProfile;
  complianceProfile: ComplianceProfile;
  integrationProfile: IntegrationProfile;
}): ProfileCheckItem[] {
  const contactRoutes = [agentProfile.email, integrationProfile.leadEmail, agentProfile.phone].filter(isPresent);

  return [
    {
      label: 'Public site name',
      detail: 'Used in the tenant header, page metadata, and public agent-site footer.',
      complete: isPresent(branding.siteName),
    },
    {
      label: 'Agent identity',
      detail: 'Agent name and brokerage must be present before this can look like a real agent site.',
      complete: isPresent(agentProfile.displayName) && isPresent(agentProfile.brokerageName),
    },
    {
      label: 'Local markets',
      detail: 'At least one market is required for hero copy and local positioning.',
      complete: Array.isArray(agentProfile.markets) && agentProfile.markets.some(isPresent),
    },
    {
      label: 'Lead contact route',
      detail: 'Add agent email, lead email, or phone so public CTAs do not dead-end.',
      complete: contactRoutes.length > 0,
    },
    {
      label: 'Assistant identity',
      detail: 'Assistant name and placeholder keep Jamie/assistant copy agent-specific.',
      complete: isPresent(assistantProfile.displayName) && isPresent(assistantProfile.placeholder),
    },
    {
      label: 'MLS configuration',
      detail: 'Provider plus at least one hot-list MLS ID are required for image-backed featured listings.',
      complete: isPresent(integrationProfile.mlsProvider) && Boolean(integrationProfile.hotListMlsIds?.length),
    },
    {
      label: 'Compliance copy',
      detail: 'Jurisdiction, MLS disclaimer, and footer disclaimer must exist before publishing.',
      complete: isPresent(complianceProfile.jurisdiction)
        && isPresent(complianceProfile.mlsDisclaimer)
        && isPresent(complianceProfile.footerDisclaimer),
    },
    {
      label: 'Visual identity',
      detail: 'Primary color and font family are required for the generated public shell.',
      complete: isPresent(branding.primaryColor) && isPresent(branding.fontFamily),
    },
  ];
}

function isPresent(value: unknown): boolean {
  return typeof value === 'string' ? value.trim().length > 0 : Boolean(value);
}

function ProfileReadinessPanel({ checks }: { checks: ProfileCheckItem[] }) {
  const completeCount = checks.filter((check) => check.complete).length;
  const isReady = completeCount === checks.length;

  return (
    <section className={`mb-8 rounded-3xl border p-5 ${
      isReady
        ? 'border-emerald-400/30 bg-emerald-950/20'
        : 'border-amber-400/30 bg-amber-950/20'
    }`}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className={`text-[10px] font-black uppercase tracking-[0.3em] ${isReady ? 'text-emerald-300' : 'text-amber-300'}`}>
            Publish Readiness
          </p>
          <h2 className="mt-2 text-2xl font-black uppercase italic tracking-tight text-white">
            {isReady ? 'Profile can publish' : `${completeCount}/${checks.length} requirements complete`}
          </h2>
          <p className="mt-2 max-w-2xl text-xs leading-6 text-slate-300">
            This gate keeps unfinished SaaS agent sites from being pushed public with missing contact, compliance, or MLS listing setup.
          </p>
        </div>
        <div className={`rounded-2xl px-4 py-3 text-[10px] font-black uppercase tracking-widest ${
          isReady ? 'bg-emerald-400 text-emerald-950' : 'bg-amber-400 text-amber-950'
        }`}>
          {isReady ? 'Ready' : 'Blocked'}
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {checks.map((check) => (
          <div
            key={check.label}
            className={`rounded-2xl border p-4 ${
              check.complete
                ? 'border-emerald-400/20 bg-emerald-500/10'
                : 'border-amber-400/20 bg-slate-950/60'
            }`}
          >
            <div className="flex items-center gap-2">
              {check.complete ? (
                <FaCheckCircle className="shrink-0 text-emerald-300" />
              ) : (
                <FaExclamationTriangle className="shrink-0 text-amber-300" />
              )}
              <h3 className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-100">{check.label}</h3>
            </div>
            <p className="mt-2 text-[11px] leading-5 text-slate-400">{check.detail}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function ProfilePanel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-5">
      <h3 className="mb-4 text-[10px] font-black uppercase tracking-[0.24em] text-cyan-300">{title}</h3>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function ProfileField({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  readOnly = false,
}: {
  label: string;
  value: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  type?: string;
  readOnly?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[8px] font-black uppercase tracking-widest text-slate-500">{label}</span>
      <input
        type={type}
        value={value}
        readOnly={readOnly}
        placeholder={placeholder}
        onChange={(event) => onChange?.(event.target.value)}
        className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-xs text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-cyan-400/70 read-only:text-slate-500"
      />
    </label>
  );
}

function ProfileTextArea({
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
      <span className="mb-2 block text-[8px] font-black uppercase tracking-widest text-slate-500">{label}</span>
      <textarea
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        rows={4}
        className="w-full resize-y rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-xs leading-5 text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-cyan-400/70"
      />
    </label>
  );
}
