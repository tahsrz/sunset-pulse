'use client';

import { useState } from 'react';
import type { ReactNode } from 'react';
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

const PRESET_COLORS = ['#2563eb', '#dc2626', '#16a34a', '#9333ea', '#ea580c', '#0f172a'];
const FONTS = ['Inter', 'Roboto Mono', 'Space Grotesk', 'Outfit', 'System-ui'];

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

  const handleUpdate = (updates: any) => {
    stageBranding(updates);
  };

  const handleQuadrantUpdate = (quadrant: string, field: string, value: string) => {
    const updatedQuadrants = { ...activeBranding.quadrants };
    (updatedQuadrants as any)[quadrant] = { ...(updatedQuadrants as any)[quadrant], [field]: value };
    handleUpdate({ quadrants: updatedQuadrants });
  };

  const saveToSupabase = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('site_config')
        .upsert({
          agent_id: agentId,
          owner_name: agentProfile.displayName,
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
        <header className="flex justify-between items-end mb-12 border-b border-blue-500/30 pb-6">
          <div>
            <div className="flex items-center gap-2 text-blue-500 mb-2">
              <FaPaintBrush />
              <span className="text-[10px] font-black uppercase tracking-[0.4em]">Visual Override</span>
            </div>
            <h1 className="text-4xl font-black uppercase italic tracking-tighter text-blue-50">Identity Architect</h1>
          </div>
          <div className="flex gap-4">
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
              disabled={saving}
              className="flex items-center gap-3 bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-xl font-black uppercase tracking-widest text-xs transition-all disabled:opacity-50 shadow-[0_0_20px_rgba(37,99,235,0.3)]"
            >
              {saving ? <FaCheckCircle className="animate-pulse" /> : <FaSave />}
              {saving ? 'Transmitting...' : 'Commit to Public'}
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
