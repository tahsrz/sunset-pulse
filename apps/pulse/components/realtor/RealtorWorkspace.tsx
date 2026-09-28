'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { formatUsdCents, parseUsdToCents } from '@/lib/realtor-workspace/money';
import { ProgressPanel } from './ProgressPanel';
import { WeeklyReviewAction } from './WeeklyReview';
import { GoalEditor } from './GoalEditor';
import { JamieProposalCard } from './JamieProposalCard';
import { ModalSurface } from './ModalSurface';
import type { ProgressGoal } from '@/lib/realtor-workspace/progress';

type Section = 'today' | 'planner' | 'business' | 'goals';
type Preferences = {
  workspace_id: string; time_zone: string; reminders_enabled: boolean; gamification_enabled: boolean;
  celebrations_enabled: boolean; hide_amounts_on_today: boolean; records_start_date: string | null; revision: number;
};
type Occurrence = {
  id: string; effective_date: string; effective_time: string | null; title_snapshot: string;
  kind_snapshot: string; expected_amount_cents: number | null; status: string; revision: number; property_id?: string | null; property_label?: string | null;
};
type FinancialEntry = {
  id: string; kind: 'commission' | 'expense' | 'expected_commission'; effective_date: string;
  data: Record<string, unknown>; status: string; current_revision: number; realized_by_record_id: string | null;
};
type RealtorPropertyOption = { id: string; label: string; propertyKind: 'residential' | 'land'; status: 'active' | 'archived' };
type PropertySprintTask = { id: string; title: string; priority: number; estimateMinutes: number | null; taskKind: string; propertyId: string; propertyLabel: string; stale: boolean };

const todayLocal = (timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Chicago') => {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const value = (key: string) => parts.find((part) => part.type === key)?.value || '';
  return value('year') + '-' + value('month') + '-' + value('day');
};
const money = (value: string | number | null | undefined) => formatUsdCents(String(value || '0'));
const key = () => crypto.randomUUID();

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init, cache: 'no-store',
    ...(init?.body ? { headers: { 'Content-Type': 'application/json', ...init.headers } } : {}),
  });
  const body = await response.json().catch(() => null);
  if (!response.ok || !body?.ok) throw new Error(body?.error || 'This request could not be completed.');
  return body.result as T;
}

function SectionNav({ section }: { section: Section }) {
  const links: Array<[Section, string]> = [['today', 'Today'], ['planner', 'Planner'], ['business', 'Business'], ['goals', 'Goals']];
  return <nav aria-label="Realtor workspace" className="flex flex-wrap gap-2">{links.map(([id, label]) => (
    <Link key={id} href={'/' + id} aria-current={section === id ? 'page' : undefined}
      className={'rounded-full px-4 py-2 text-sm font-semibold transition ' + (section === id ? 'bg-cyan-300 text-slate-950' : 'border border-white/10 text-slate-300 hover:bg-white/10')}>
      {label}
    </Link>
  ))}</nav>;
}

function Panel({ title, children, extra }: { title: string; children: React.ReactNode; extra?: React.ReactNode }) {
  return <section className="rounded-2xl border border-white/10 bg-slate-900/80 p-5 shadow-xl shadow-black/10">
    <div className="mb-4 flex items-center justify-between gap-3"><h2 className="text-lg font-bold text-white">{title}</h2>{extra}</div>{children}
  </section>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block text-sm font-medium text-slate-200">{label}<span className="mt-1.5 block">{children}</span></label>;
}

const inputClass = 'w-full rounded-lg border border-white/15 bg-slate-950 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-cyan-300 focus:outline-none';
const buttonClass = 'rounded-lg bg-cyan-300 px-4 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-50';
const quietButton = 'rounded-lg border border-white/15 px-3 py-2 text-sm font-semibold text-slate-200 hover:bg-white/10';

const realtorPlannerTemplates = [
  { label: 'Broker dues', kind: 'bill', frequency: 'monthly' },
  { label: 'Association dues', kind: 'bill', frequency: 'yearly' },
  { label: 'MLS subscription', kind: 'bill', frequency: 'monthly' },
  { label: 'License renewal', kind: 'professional_deadline', frequency: 'once' },
  { label: 'Education deadline', kind: 'professional_deadline', frequency: 'once' },
  { label: 'Showing follow-up', kind: 'follow_up', frequency: 'once' },
  { label: 'Weekly business review', kind: 'weekly_review', frequency: 'weekly' },
] as const;

export default function RealtorWorkspace({ section }: { section: Section }) {
  const router = useRouter();
  const [preferences, setPreferences] = useState<Preferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [data, setData] = useState<any>(null);
  const [refresh, setRefresh] = useState(0);
  const [setup, setSetup] = useState({ remindersEnabled: true, gamificationEnabled: true, celebrationsEnabled: true });
  const [mode, setMode] = useState<'gross' | 'net_deposit'>('gross');
  const [selectedBusinessYear, setSelectedBusinessYear] = useState<number | null>(null);
  const [paymentFor, setPaymentFor] = useState<Occurrence | null>(null);
  const [plannerReloadToken, setPlannerReloadToken] = useState(0);

  const request = useCallback(async <T,>(url: string, init?: RequestInit) => api<T>(url, init), []);
  useEffect(() => {
    let active = true;
    setLoading(true); setError('');
    void request<Preferences | null>('/api/realtor/preferences').then(async (value) => {
      if (!active) return;
      setPreferences(value);
      if (!value) { setData(null); return; }
      const currentYear = Number(new Intl.DateTimeFormat('en-US', { timeZone: value.time_zone, year: 'numeric' }).format(new Date()));
      const year = section === 'business' ? selectedBusinessYear ?? currentYear : currentYear;
      const applyData = (next: unknown) => { if (active) setData(next); };
      if (section === 'today') applyData(await request('/api/realtor/today'));
      else if (section === 'planner') {
        const today = todayLocal(value.time_zone);
        applyData(await request('/api/realtor/planner?from=' + today.slice(0, 4) + '-01-01&through=' + today.slice(0, 4) + '-12-31&limit=100'));
      } else if (section === 'business') {
        const [summary, ledger] = await Promise.all([
          request('/api/realtor/business-summary?year=' + year),
          request<{ year: number; entries: FinancialEntry[]; nextCursor: string | null }>('/api/realtor/financial-records?year=' + year + '&limit=50'),
        ]);
        applyData({ summary, ledger });
      } else {
        const [goals, summary] = await Promise.all([
          request('/api/realtor/goals?year=' + year),
          request('/api/realtor/business-summary?year=' + year),
        ]);
        applyData({ goals, summary });
      }
    }).catch((reason) => { if (active) setError(reason instanceof Error ? reason.message : 'Unable to load your workspace.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [request, section, refresh, selectedBusinessYear]);

  const submit = async (url: string, method: 'POST' | 'PATCH', value: unknown, success: string) => {
    setBusy(true); setError(''); setNotice('');
    try {
      await request(url, { method, body: JSON.stringify(value) });
      setNotice(success); setRefresh((revision) => revision + 1); router.refresh();
      return true;
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to save this change.'); return false; }
    finally { setBusy(false); }
  };

  const setupWorkspace = () => {
    setBusy(true); setError('');
    void request('/api/realtor/preferences', { method: 'POST', body: JSON.stringify({
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Chicago',
      remindersEnabled: setup.remindersEnabled, gamificationEnabled: setup.gamificationEnabled,
      celebrationsEnabled: setup.celebrationsEnabled, hideAmountsOnToday: false,
      recordsStartDate: todayLocal(), expectedRevision: null, requestKey: key(),
    }) }).then(() => setRefresh((value) => value + 1))
      .catch((reason) => setError(reason instanceof Error ? reason.message : 'Unable to create your planner.'))
      .finally(() => setBusy(false));
  };

  const loadMoreOccurrences = async (cursor: string) => {
    if (!preferences) return;
    setError('');
    try {
      const today = todayLocal(preferences.time_zone);
      const page = await request<{ items: Occurrence[]; nextCursor: string | null }>(
        '/api/realtor/planner?from=' + today.slice(0, 4) + '-01-01&through=' + today.slice(0, 4) + '-12-31&limit=100&cursor=' + encodeURIComponent(cursor),
      );
      setData((current: any) => {
        if (current?.nextCursor !== cursor) return current;
        const seen = new Set((current.items || []).map((item: Occurrence) => item.id));
        return { ...current, items: [...current.items, ...page.items.filter((item) => !seen.has(item.id))], nextCursor: page.nextCursor };
      });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to load more deadlines.');
    }
  };

  const loadMoreProjections = async (cursor: string) => {
    if (!preferences) return;
    setError('');
    try {
      const today = todayLocal(preferences.time_zone);
      const page = await request<{ projected: any[]; projectionsTruncated: boolean; nextProjectionCursor: string | null }>(
        '/api/realtor/planner?from=' + today.slice(0, 4) + '-01-01&through=' + today.slice(0, 4) + '-12-31&limit=100&projectionCursor=' + encodeURIComponent(cursor),
      );
      setData((current: any) => ({
        ...current,
        projected: [...(current?.projected || []), ...page.projected],
        projectionsTruncated: page.projectionsTruncated,
        nextProjectionCursor: page.nextProjectionCursor,
      }));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to load more projected dates.');
    }
  };

  const reloadLatestPlanner = async () => {
    if (!preferences) return;
    setError('');
    try {
      const today = todayLocal(preferences.time_zone);
      const latest = await request('/api/realtor/planner?from=' + today.slice(0, 4) + '-01-01&through=' + today.slice(0, 4) + '-12-31&limit=100');
      setData(latest);
      setPlannerReloadToken((token) => token + 1);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to refresh planner data.');
    }
  };

  const loadMoreLedger = async (cursor: string) => {
    if (!preferences || !section || section !== 'business') return;
    const year = selectedBusinessYear ?? Number(new Intl.DateTimeFormat('en-US', { timeZone: preferences.time_zone, year: 'numeric' }).format(new Date()));
    setError('');
    try {
      const page = await request<{ year: number; entries: FinancialEntry[]; nextCursor: string | null }>(
        '/api/realtor/financial-records?year=' + year + '&limit=50&cursor=' + encodeURIComponent(cursor),
      );
      setData((current: any) => {
        if (current?.ledger?.year !== year) return current;
        const existing = new Set((current.ledger.entries as FinancialEntry[]).map((entry) => entry.id));
        return {
          ...current,
          ledger: {
            ...current.ledger,
            entries: [...current.ledger.entries, ...page.entries.filter((entry) => !existing.has(entry.id))],
            nextCursor: page.nextCursor,
          },
        };
      });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to load more ledger entries.');
    }
  };

  const summary = data?.summary || data?.business?.value;

  return <main className="min-h-screen bg-[#07111a] px-4 py-8 text-white md:px-8">
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div><p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-200">Your real estate business</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight md:text-4xl">{section === 'today' ? 'Today' : section[0].toUpperCase() + section.slice(1)}</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-400">Keep your deadlines, recorded business money, and next steps in one place.</p>
        </div>
        <SectionNav section={section} />
      </header>
      {error ? <div role="alert" className="rounded-xl border border-rose-300/30 bg-rose-300/10 p-4 text-sm text-rose-100">{error}{section === 'planner' && /changed.*reload|reload it before saving/i.test(error) ? <button type="button" onClick={() => void reloadLatestPlanner()} className="ml-3 rounded-md border border-rose-100/30 px-3 py-1.5 font-semibold hover:bg-rose-100/10">Refresh latest planner data</button> : null}</div> : null}
      {notice ? <div role="status" className="rounded-xl border border-emerald-300/30 bg-emerald-300/10 p-4 text-sm text-emerald-100">{notice}</div> : null}
      {loading ? <p className="text-sm text-slate-400">Loading your workspace…</p> : null}
      {!loading && !preferences ? <Panel title="Set up your personal planner">
        <p className="max-w-2xl text-sm leading-6 text-slate-300">Your planner and earnings stay private in a personal workspace. Add your own dates and amounts; the scoreboard only counts records you enter.</p>
        <div className="mt-5 flex flex-wrap gap-5 text-sm">
          <label className="flex items-center gap-2"><input type="checkbox" checked={setup.remindersEnabled} onChange={(event) => setSetup({ ...setup, remindersEnabled: event.target.checked })} /> Enable in-app reminders</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={setup.gamificationEnabled} onChange={(event) => setSetup({ ...setup, gamificationEnabled: event.target.checked })} /> Show personal progress</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={setup.celebrationsEnabled} onChange={(event) => setSetup({ ...setup, celebrationsEnabled: event.target.checked })} /> Show milestone celebrations</label>
        </div>
        <button disabled={busy} onClick={setupWorkspace} className={'mt-5 ' + buttonClass}>{busy ? 'Setting up…' : 'Create my planner'}</button>
      </Panel> : null}
      {!loading && preferences && section === 'today' ? <TodayView data={data} preferences={preferences} busy={busy} submit={submit} /> : null}
      {!loading && preferences && section === 'planner' ? <PlannerView data={data} timeZone={preferences.time_zone} busy={busy} submit={submit} onPayment={setPaymentFor} onMoreProjections={loadMoreProjections} onMoreOccurrences={loadMoreOccurrences} reloadToken={plannerReloadToken} /> : null}
      {!loading && preferences && section === 'business' ? <BusinessView data={data} timeZone={preferences.time_zone} year={selectedBusinessYear ?? Number(new Intl.DateTimeFormat('en-US', { timeZone: preferences.time_zone, year: 'numeric' }).format(new Date()))} setYear={setSelectedBusinessYear} mode={mode} setMode={setMode} busy={busy} submit={submit} onMoreEntries={loadMoreLedger} /> : null}
      {!loading && preferences && section === 'goals' ? <GoalsView data={data} preferences={preferences} busy={busy} submit={submit} /> : null}
      {paymentFor ? <PaymentDialog occurrence={paymentFor} timeZone={preferences?.time_zone || 'America/Chicago'} busy={busy} onClose={() => setPaymentFor(null)} onSave={(amount, date) => {
        return submit('/api/realtor/planner/' + paymentFor.id, 'PATCH', {
          action: 'record_payment', expectedRevision: paymentFor.revision, paidAmountCents: amount, paidDate: date, requestKey: key(),
        }, 'Payment recorded and added to your expense ledger.').then((saved) => { if (saved) setPaymentFor(null); return saved; });
        }} /> : null}
      <footer className="border-t border-white/10 pt-5 text-xs text-slate-500">Recorded business totals are based on entries you supplied and are shown before taxes. <Link className="text-cyan-200 hover:underline" href="/property-shortlist">Open your Keller / Westlake shortlist</Link>.</footer>
    </div>
  </main>;
}

function TodayView({ data, preferences, busy, submit }: { data: any; preferences: Preferences; busy: boolean; submit: (url: string, method: 'POST' | 'PATCH', data: unknown, success: string) => Promise<boolean> }) {
  const summary = data?.business?.value;
  const agenda = data?.agenda?.value;
  const goals: Array<{ metric: string; target: number }> = data?.goals?.value || [];
  const [workspaces, setWorkspaces] = useState<Array<{ workspace: { id: string; name: string; kind: string } }>>([]);
  const [workspacesError, setWorkspacesError] = useState(false);
  useEffect(() => {
    let active = true;
    void fetch('/api/workspaces', { cache: 'no-store' })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok || payload?.ok !== true || !Array.isArray(payload.workspaces)) throw new Error('Unavailable');
        if (active) setWorkspaces(payload.workspaces.filter((entry: any) => entry?.workspace?.id && entry?.workspace?.name));
      })
      .catch(() => { if (active) setWorkspacesError(true); });
    return () => { active = false; };
  }, []);
  const progressValue = (metric: string) => {
    const goal = goals.find((item) => item.metric === metric);
    if (!goal || !summary) return null;
    const actual = metric === 'net_income' ? Number(summary.recordedNetCents) : metric === 'closings' ? Number(summary.closingCount) : Number(summary.completedWeeklyReviews);
    return { actual, target: Number(goal.target), percent: Math.max(0, Math.min(100, actual / Number(goal.target) * 100)) };
  };
  const net = progressValue('net_income');
  return <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
    <div className="space-y-5">
      <Panel title="Business progress" extra={<Link href="/business" className="text-sm font-semibold text-cyan-200">Open scoreboard →</Link>}>
        {data?.business?.status !== 'available' ? <p className="text-sm text-slate-400">Your business summary could not be loaded.</p> : <div>
          <p className="text-3xl font-black text-cyan-100">{preferences.hide_amounts_on_today ? '••••••' : money(summary?.recordedNetCents)}</p>
          <p className="mt-1 text-xs text-slate-400">Recorded net before taxes · based on entries you supplied</p>
          {preferences.gamification_enabled ? net ? <div className="mt-4"><div className="mb-1 flex justify-between text-xs text-slate-400"><span>Annual net goal</span><span>{Math.floor(net.percent)}%</span></div><div className="h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-cyan-300" style={{ width: net.percent + '%' }} /></div></div> : <p className="mt-4 text-xs text-slate-500"><Link href="/goals" className="text-cyan-200">Set an annual goal</Link> to track your progress.</p> : <p className="mt-4 text-xs text-slate-500">Progress features are hidden. Turn them on in Personal settings to view goals.</p>}
        </div>}
      </Panel>
      <Panel title="Coming up" extra={<Link href="/planner" className="text-sm font-semibold text-cyan-200">Open planner →</Link>}>
        {data?.agenda?.status !== 'available' ? <p className="text-sm text-slate-400">Your schedule could not be loaded.</p> : !agenda?.overdue?.length && !agenda?.upcoming?.length
          ? <div className="rounded-xl border border-dashed border-white/15 p-5 text-sm text-slate-400">No upcoming planner items yet. Add recurring dues or a deadline to get started.</div>
          : <div className="space-y-2">{[...(agenda?.overdue || []), ...(agenda?.upcoming || [])].map((item: Occurrence) => <div key={item.id} className="flex items-center justify-between gap-4 rounded-xl bg-white/[0.04] p-3"><div><p className="font-semibold">{item.title_snapshot}</p><p className="mt-1 text-xs text-slate-400">{item.kind_snapshot.replace('_', ' ')} · {item.effective_date}</p>{item.property_label ? <p className="mt-1 text-xs text-cyan-100">{item.property_label}</p> : null}</div>{item.expected_amount_cents ? <span className="text-sm text-slate-300">{money(item.expected_amount_cents)}</span> : null}</div>)}</div>}
      </Panel>
    </div>
    <div className="space-y-5">
      <Panel title="Needs your attention">{data?.agenda?.status !== 'available' ? <p className="text-sm text-slate-400">Reminder status is unavailable.</p> : agenda?.reminders?.length ? <div className="space-y-3">{agenda.reminders.map((reminder: any) => <div key={reminder.id} className="rounded-xl bg-white/[0.04] p-3"><p className="font-semibold">{reminder.occurrence?.title_snapshot || 'Planner reminder'}</p><p className="mt-1 text-xs text-slate-400">Due {reminder.occurrence?.effective_date || 'date unavailable'}</p>{reminder.occurrence?.property_label ? <p className="mt-1 text-xs text-cyan-100">{reminder.occurrence.property_label}</p> : null}<div className="mt-3 flex gap-2"><button disabled={busy} onClick={() => void submit('/api/realtor/reminders', 'PATCH', { reminderId: reminder.id, action: 'dismiss', expectedRevision: reminder.revision, requestKey: key() }, 'Reminder dismissed.')} className={quietButton}>Dismiss reminder</button><button disabled={busy} onClick={() => void submit('/api/realtor/reminders', 'PATCH', { reminderId: reminder.id, action: 'snooze', expectedRevision: reminder.revision, until: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), requestKey: key() }, 'Reminder snoozed until tomorrow.')} className={quietButton}>Snooze 1 day</button></div></div>)}</div> : <p className="text-sm leading-6 text-slate-400">No reminders are ready right now. Jamie can help organize your next property task once you add it to the shortlist.</p>}
        <Link href="/property-shortlist" className={'mt-4 inline-flex ' + quietButton}>Open shortlist</Link>
      </Panel>
      <Panel title="Your work"><div className="flex flex-col gap-2"><Link href="/sprints" className={quietButton}>Review this week’s sprint</Link><Link href="/workspaces" className={quietButton}>Open team workspaces</Link>{workspaces.slice(0, 5).map(({ workspace }) => <Link key={workspace.id} href={'/workspaces/' + encodeURIComponent(workspace.id) + '/inbox'} className={quietButton}>Open {workspace.name} inbox</Link>)}{workspaces.length > 5 ? <Link href="/workspaces" className="px-3 py-1 text-xs text-cyan-200 hover:underline">See all {workspaces.length} workspaces</Link> : null}{!workspaces.length && !workspacesError ? <p className="px-3 py-1 text-xs text-slate-500">No team workspaces are available yet.</p> : null}{workspacesError ? <p role="status" className="px-3 py-1 text-xs text-amber-200">Workspace inbox links could not be loaded. Open the workspace hub to retry.</p> : null}<Link href="/jamie-chat" className={quietButton}>Ask Jamie to help organize something</Link></div></Panel>
      {preferences.gamification_enabled ? <Panel title="Small wins"><p className="text-sm leading-6 text-slate-400">Your progress comes from recorded closings and completed weekly reviews. It never rewards sending more messages.</p></Panel> : null}
      <Panel title="Personal settings"><div className="space-y-3 text-sm">{([
        ['hide_amounts_on_today', 'Hide money on Today'],
        ['reminders_enabled', 'Enable in-app reminders'],
        ['gamification_enabled', 'Show progress features'],
        ['celebrations_enabled', 'Show quiet milestone highlights'],
      ] as const).map(([field, label]) => <label key={field} className="flex items-center justify-between gap-3 text-slate-300"><span>{label}</span><input type="checkbox" checked={preferences[field]} disabled={busy} onChange={(event) => {
        const next = { ...preferences, [field]: event.target.checked };
        void submit('/api/realtor/preferences', 'POST', {
          timeZone: next.time_zone, remindersEnabled: next.reminders_enabled,
          gamificationEnabled: next.gamification_enabled, celebrationsEnabled: next.celebrations_enabled,
          hideAmountsOnToday: next.hide_amounts_on_today, recordsStartDate: next.records_start_date,
          expectedRevision: preferences.revision, requestKey: key(),
        }, 'Personal settings saved.');
      }} /></label>)}</div></Panel>
    </div>
  </div>;
}

export function PlannerView({ data, timeZone, busy, submit, onPayment, onMoreProjections, onMoreOccurrences, reloadToken = 0 }: { data: any; timeZone: string; busy: boolean; submit: (url: string, method: 'POST' | 'PATCH', data: unknown, success: string) => Promise<boolean>; onPayment: (value: Occurrence) => void; onMoreProjections: (cursor: string) => Promise<void>; onMoreOccurrences?: (cursor: string) => Promise<void>; reloadToken?: number }) {
  const [kind, setKind] = useState('bill');
  const [frequency, setFrequency] = useState('monthly');
  const [date, setDate] = useState(todayLocal(timeZone));
  const [title, setTitle] = useState('');
  const [time, setTime] = useState('');
  const [amount, setAmount] = useState('');
  const [offsets, setOffsets] = useState('3, 1');
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [propertyId, setPropertyId] = useState('');
  const [sourceSprintTaskId, setSourceSprintTaskId] = useState<string | null>(null);
  const [properties, setProperties] = useState<RealtorPropertyOption[]>([]);
  const [propertyLoadError, setPropertyLoadError] = useState('');
  const [propertyTasks, setPropertyTasks] = useState<PropertySprintTask[]>([]);
  const [propertyTasksTruncated, setPropertyTasksTruncated] = useState(false);
  const [propertyTasksError, setPropertyTasksError] = useState('');
  const [loadingSchedulePage, setLoadingSchedulePage] = useState(false);
  const [propertyDraftNotice, setPropertyDraftNotice] = useState('');
  const [formError, setFormError] = useState('');
  const dueDateRef = useRef<HTMLInputElement>(null);
  const occurrences: Occurrence[] = data?.items || [];
  const projected: Array<{ itemId: string; itemRevision: number; original_date: string; effective_date: string; title_snapshot: string; kind_snapshot: string; expected_amount_cents: number | null; property_id?: string | null }> = data?.projected || [];
  useEffect(() => {
    let active = true;
    void api<{ properties: RealtorPropertyOption[] }>('/api/realtor/planner/properties')
      .then((result) => { if (active) setProperties(result.properties); })
      .catch((reason) => { if (active) setPropertyLoadError(reason instanceof Error ? reason.message : 'Shortlist properties could not be loaded.'); });
    void api<{ tasks: PropertySprintTask[]; truncated: boolean }>('/api/realtor/planner/property-tasks')
      .then((result) => { if (active) { setPropertyTasks(result.tasks); setPropertyTasksTruncated(result.truncated); } })
      .catch((reason) => { if (active) setPropertyTasksError(reason instanceof Error ? reason.message : 'Property sprint tasks could not be loaded.'); });
    return () => { active = false; };
  }, [reloadToken]);
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError('');
    const amountCents = kind === 'bill' && amount.trim() ? parseUsdToCents(amount) : null;
    const recurrence = frequency === 'once' ? { frequency: 'once' }
      : frequency === 'weekly' ? { frequency: 'weekly', interval: 1 }
        : frequency === 'quarterly' ? { frequency: 'monthly', interval: 3 }
          : frequency === 'yearly' ? { frequency: 'yearly', interval: 1 } : { frequency: 'monthly', interval: 1 };
    const reminderOffsetsDays = offsets.split(',').map((value) => value.trim()).filter(Boolean).map(Number);
    const saved = await submit('/api/realtor/planner', 'POST', {
      itemId: null, expectedRevision: null, item: {
        kind, title, notes: '', expectedAmountCents: amountCents, property: propertyId ? { propertyId } : null, sourceSprintTaskId, requestKey: key(),
        due: { anchorDate: date, localTime: time || null, timeZone, recurrence, endsOn: null, reminderOffsetsDays },
      },
    }, sourceSprintTaskId ? 'Planner item saved and linked. The source sprint task remains unchanged.' : 'Planner item saved.');
    if (saved) {
      setTitle(''); setAmount(''); setPropertyId(''); setSourceSprintTaskId(null); setSelectedTemplate(null); setPropertyDraftNotice('');
      if (sourceSprintTaskId) setPropertyTasks((tasks) => tasks.filter((task) => task.id !== sourceSprintTaskId));
    }
  };
  const applyTemplate = (template: typeof realtorPlannerTemplates[number]) => {
    setKind(template.kind);
    setFrequency(template.frequency);
    setTitle(template.label);
    setDate('');
    setTime('');
    setAmount('');
    setPropertyId('');
    setSourceSprintTaskId(null);
    setSelectedTemplate(template.label);
  };
  const applyPropertySprintTask = (task: PropertySprintTask) => {
    setKind('task'); setFrequency('once'); setTitle(task.title.slice(0, 160));
    setDate(''); setTime(''); setAmount(''); setPropertyId(task.propertyId); setSelectedTemplate(null);
    setSourceSprintTaskId(task.id);
    setPropertyDraftNotice(`Draft loaded from ${task.propertyLabel}. Choose the real due date, then save it to your personal planner.`);
    window.setTimeout(() => dueDateRef.current?.focus(), 0);
  };
  return <div className="grid gap-5 lg:grid-cols-[1fr_1.2fr]">
    <div className="lg:col-span-2"><JamieProposalCard kind="planner" timeZone={timeZone} properties={properties} busy={busy} submit={submit} /></div>
    <div className="lg:col-span-2"><Panel title="Start with a template"><p className="mb-3 text-sm text-slate-400">Templates fill only a label and recurrence. They do not assume your due date, jurisdiction, or cost.</p><div className="flex flex-wrap gap-2">{realtorPlannerTemplates.map((template) => <button key={template.label} type="button" disabled={busy} aria-pressed={selectedTemplate === template.label} onClick={() => applyTemplate(template)} className={selectedTemplate === template.label ? buttonClass : quietButton}>{template.label}</button>)}</div></Panel></div>
    <div className="lg:col-span-2"><Panel title="Property sprint tasks"><p className="mb-3 text-sm text-slate-400">Choose a current task to prefill a personal planner draft. You must choose its real due date and save it yourself; this links the task for traceability but does not change its sprint status.</p>{propertyTasksError ? <p role="status" className="text-sm text-amber-200">{propertyTasksError}</p> : null}<div className="space-y-2">{propertyTasks.map((task) => <div key={task.id} className="flex flex-col gap-3 rounded-xl border border-white/10 bg-slate-950/60 p-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold">{task.title}</p><p className="mt-1 text-xs text-cyan-100">{task.propertyLabel}</p><p className="mt-1 text-xs text-slate-500">{task.taskKind.replaceAll('_', ' ')}{task.estimateMinutes ? ` · about ${task.estimateMinutes} min` : ''}</p>{task.stale ? <p className="mt-1 text-xs text-amber-200">The property has changed since this task was prepared. <Link href="/property-shortlist" className="underline">Refresh the property sprint.</Link></p> : null}</div><button type="button" disabled={busy || task.stale} onClick={() => applyPropertySprintTask(task)} className={quietButton}>Use as planner draft</button></div>)}</div>{propertyTasksTruncated ? <p className="mt-3 text-xs text-slate-500">Showing the first 100 open property tasks.</p> : null}{!propertyTasks.length && !propertyTasksError ? <p className="text-sm text-slate-500">No open property sprint tasks yet. <Link href="/property-shortlist" className="text-cyan-200 hover:underline">Ask Jamie to prepare property tasks.</Link></p> : null}</Panel></div>
    <Panel title="Add a deadline or bill"><form onSubmit={(event) => { void save(event).catch((reason) => setFormError(reason instanceof Error ? reason.message : 'Check the amount and reminder offsets.')); }} className="space-y-4">
      {formError ? <p role="alert" className="rounded-lg border border-rose-300/30 bg-rose-300/10 p-3 text-sm text-rose-100">{formError}</p> : null}
      {propertyDraftNotice ? <p role="status" className="rounded-lg bg-cyan-200/10 p-3 text-sm text-cyan-100">{propertyDraftNotice}</p> : null}
      <Field label="What is it called?"><input required maxLength={160} value={title} onChange={(event) => { setTitle(event.target.value); setSelectedTemplate(null); }} className={inputClass} placeholder="Monthly broker dues" /></Field>
      <div className="grid gap-4 sm:grid-cols-2"><Field label="Type"><select value={kind} onChange={(event) => { setKind(event.target.value); setSelectedTemplate(null); if (sourceSprintTaskId && event.target.value !== 'task') { setSourceSprintTaskId(null); setPropertyDraftNotice('The planner draft is no longer linked to its source sprint task.'); } }} className={inputClass}><option value="bill">Bill</option><option value="professional_deadline">Professional deadline</option><option value="appointment">Appointment</option><option value="follow_up">Follow-up</option><option value="task">Task</option><option value="weekly_review">Weekly business review</option></select></Field><Field label="First due date"><input ref={dueDateRef} required type="date" value={date} onChange={(event) => { setDate(event.target.value); setSelectedTemplate(null); }} className={inputClass} /></Field></div>
      <Field label="Related shortlist property (optional)"><select value={propertyId} onChange={(event) => { setPropertyId(event.target.value); if (sourceSprintTaskId && event.target.value !== propertyId) { setSourceSprintTaskId(null); setPropertyDraftNotice('The planner draft is no longer linked to its source sprint task.'); } }} className={inputClass}><option value="">No property link</option>{properties.filter((property) => property.status === 'active').map((property) => <option key={property.id} value={property.id}>{property.label}</option>)}</select></Field>
      {propertyLoadError ? <p role="status" className="text-xs text-amber-200">{propertyLoadError} You can still create a planner item without a property link.</p> : null}
      <div className="grid gap-4 sm:grid-cols-2"><Field label="Repeats"><select value={frequency} onChange={(event) => { setFrequency(event.target.value); setSelectedTemplate(null); }} className={inputClass}><option value="once">One time</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option><option value="quarterly">Quarterly</option><option value="yearly">Yearly</option></select></Field>{kind === 'bill' ? <Field label="Expected amount (USD)"><input inputMode="decimal" value={amount} onChange={(event) => { setAmount(event.target.value); setSelectedTemplate(null); }} className={inputClass} placeholder="150.00" /></Field> : <Field label="Due time (optional)"><input type="time" value={time} onChange={(event) => setTime(event.target.value)} className={inputClass} /></Field>}</div>
      <Field label="Remind me (calendar days before; comma-separated)"><input value={offsets} onChange={(event) => setOffsets(event.target.value)} className={inputClass} placeholder="3, 1" /></Field>
      <p className="text-xs leading-5 text-slate-500">Monthly dues on the 31st use the last day of shorter months, then return to the 31st. Dates use your saved timezone. Opt-in reminders appear here in the app.</p>
      <button className={buttonClass} disabled={busy || !title.trim()}>{busy ? 'Saving…' : 'Save to planner'}</button>
    </form></Panel>
    <Panel title="Your schedule">{occurrences.length ? <div className="space-y-2">{occurrences.map((item) => <div key={item.id} className="flex flex-col gap-3 rounded-xl border border-white/10 bg-slate-950/60 p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold">{item.title_snapshot}</p><p className="mt-1 text-xs text-slate-400">{item.effective_date}{item.effective_time ? ' · ' + item.effective_time.slice(0, 5) : ''} · {item.status === 'completed' ? 'done' : item.status}</p>{item.property_id ? <p className="mt-1 text-xs text-cyan-100">{properties.find((property) => property.id === item.property_id)?.label || 'Linked shortlist property'}</p> : null}{item.expected_amount_cents ? <p className="mt-1 text-sm text-slate-200">Expected {money(item.expected_amount_cents)}</p> : null}</div>{item.status === 'pending' ? <div className="flex gap-2">{item.kind_snapshot === 'bill' ? <button type="button" onClick={() => onPayment(item)} className={buttonClass}>Record payment</button> : item.kind_snapshot === 'weekly_review' ? <WeeklyReviewAction occurrence={item} busy={busy} submit={submit} /> : <button type="button" disabled={busy} onClick={() => void submit('/api/realtor/planner/' + item.id, 'PATCH', { action: 'complete', expectedRevision: item.revision, requestKey: key() }, 'Marked complete.')} className={quietButton}>Mark complete</button>}</div> : null}</div>)}</div> : <p className="rounded-xl border border-dashed border-white/15 p-5 text-sm text-slate-400">Your planner will show each due date here. Recurring entries keep their original schedule and each payment is recorded separately.</p>}{data?.nextCursor && onMoreOccurrences ? <button type="button" disabled={busy || loadingSchedulePage} className={'mt-4 ' + quietButton} onClick={() => {
      if (loadingSchedulePage) return;
      setLoadingSchedulePage(true);
      void onMoreOccurrences(data.nextCursor).finally(() => setLoadingSchedulePage(false));
    }}>{loadingSchedulePage ? 'Loading…' : 'Load more deadlines'}</button> : null}</Panel>
    {projected.length || data?.nextProjectionCursor ? <div className="lg:col-span-2"><Panel title="Later dates in your recurring schedule"><p className="mb-3 text-xs text-slate-400">These dates are calculated from your saved recurrence and aren’t yet stored as actionable occurrences. Add a date to your planner before marking it complete or recording a payment.</p><div className="space-y-2">{projected.map((item) => <div key={item.itemId + ':' + item.original_date} className="flex flex-col gap-3 rounded-xl border border-dashed border-white/15 p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold">{item.title_snapshot}</p><p className="mt-1 text-xs text-slate-400">{item.effective_date} · projected {item.kind_snapshot.replace('_', ' ')}</p>{item.property_id ? <p className="mt-1 text-xs text-cyan-100">{properties.find((property) => property.id === item.property_id)?.label || 'Linked shortlist property'}</p> : null}{item.expected_amount_cents ? <p className="mt-1 text-sm text-slate-200">Expected {money(item.expected_amount_cents)}</p> : null}</div><button type="button" disabled={busy} onClick={() => void submit('/api/realtor/planner', 'POST', { action: 'materialize_occurrence', itemId: item.itemId, expectedItemRevision: item.itemRevision, originalDate: item.original_date, requestKey: key() }, 'Date added to your actionable planner.')} className={quietButton}>Add to planner</button></div>)}</div>{data?.nextProjectionCursor ? <button type="button" onClick={() => void onMoreProjections(data.nextProjectionCursor)} className={'mt-4 ' + quietButton}>Load more projected dates</button> : null}{data?.projectionsTruncated && !data?.nextProjectionCursor ? <p className="mt-3 text-xs text-amber-200">Projection reached its safety limit. Narrow the date range to view remaining items.</p> : null}</Panel></div> : null}
  </div>;
}

export function BusinessView({ data, timeZone, year, setYear, mode, setMode, busy, submit, onMoreEntries }: { data: any; timeZone: string; year: number; setYear: (year: number) => void; mode: 'gross' | 'net_deposit'; setMode: (mode: 'gross' | 'net_deposit') => void; busy: boolean; submit: (url: string, method: 'POST' | 'PATCH', data: unknown, success: string) => Promise<boolean>; onMoreEntries: (cursor: string) => Promise<void> }) {
  const [commission, setCommission] = useState('');
  const [deductions, setDeductions] = useState('');
  const [expense, setExpense] = useState('');
  const [expectedIncome, setExpectedIncome] = useState('');
  const [expectedDate, setExpectedDate] = useState(todayLocal(timeZone));
  const [expectedLabel, setExpectedLabel] = useState('');
  const [category, setCategory] = useState('other');
  const [mutation, setMutation] = useState<{ entry: FinancialEntry; purpose: 'correct' | 'realize' } | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [formError, setFormError] = useState('');
  const summary = data?.summary;
  const entries: FinancialEntry[] = data?.ledger?.entries || [];
  const loadNextPage = async () => {
    if (!data?.ledger?.nextCursor || loadingMore) return;
    setLoadingMore(true);
    try { await onMoreEntries(data.ledger.nextCursor); }
    finally { setLoadingMore(false); }
  };
  const currentYear = Number(new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric' }).format(new Date()));
  const saveCommission = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError('');
    const receivedDate = todayLocal(timeZone);
    const amountCents = parseUsdToCents(commission);
    if (mode === 'gross') {
      const deductionCents = !deductions.trim() || /^0(?:\.0{1,2})?$/.test(deductions.trim()) ? 0 : parseUsdToCents(deductions);
      const saved = await submit('/api/realtor/financial-records', 'POST', {
        mode, grossCents: amountCents, deductions: deductionCents ? [{ kind: 'broker_split', label: 'Broker deductions', amountCents: deductionCents }] : [],
        receivedDate, closingReference: null, property: null, memo: '', requestKey: key(),
      }, 'Commission recorded.');
      if (!saved) return;
    } else {
      const saved = await submit('/api/realtor/financial-records', 'POST', {
        mode, depositCents: amountCents, receivedDate, closingReference: null, property: null, memo: '', requestKey: key(),
      }, 'Deposit recorded.');
      if (!saved) return;
    }
    setCommission(''); setDeductions('');
  };
  const saveExpense = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError('');
    const saved = await submit('/api/realtor/financial-records', 'POST', {
      amountCents: parseUsdToCents(expense), paidDate: todayLocal(timeZone), category, payee: '', note: '',
      occurrenceId: null, requestKey: key(),
    }, 'Expense recorded.');
    if (saved) setExpense('');
  };
  const saveExpectedIncome = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError('');
    const saved = await submit('/api/realtor/financial-records', 'POST', {
      estimatedTakeHomeCents: parseUsdToCents(expectedIncome), expectedDate, label: expectedLabel.trim(),
      property: null, requestKey: key(),
    }, 'Expected income saved; it is not counted as received income.');
    if (saved) { setExpectedIncome(''); setExpectedLabel(''); }
  };
  const handleForm = (action: (event: React.FormEvent) => Promise<void>) => (event: React.FormEvent) => {
    void action(event).catch((reason) => setFormError(reason instanceof Error ? reason.message : 'Check the entered amount and try again.'));
  };
  return <div className="space-y-5">
    <JamieProposalCard kind="financial" timeZone={timeZone} busy={busy} submit={submit} />
    <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-slate-900/80 p-4 sm:flex-row sm:items-end sm:justify-between">
      <Field label="Ledger year"><select className={inputClass} value={year} onChange={(event) => setYear(Number(event.target.value))}>{Array.from({ length: Math.min(10, currentYear - 2000 + 1) }, (_, index) => currentYear - index).map((value) => <option key={value} value={value}>{value}</option>)}</select></Field>
      <a className={quietButton + ' text-center'} href={'/api/realtor/financial-records/export?year=' + year} download={`sunset-pulse-ledger-${year}.csv`}>Download {year} CSV</a>
    </div>
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      <Metric title="Recorded net" value={money(summary?.recordedNetCents)} prominent />
      <Metric title="Deposits received" value={money(summary?.receivedCents)} />
      <Metric title="Withheld from gross" value={money(summary?.knownWithheldCents)} />
      <Metric title="Business expenses" value={money(summary?.paidExpensesCents)} />
      <Metric title="Pending income" value={money(summary?.pendingIncomeCents)} />
    </section>
    {summary?.grossComplete === false ? <p className="rounded-xl border border-amber-200/25 bg-amber-200/10 p-3 text-sm text-amber-100">{summary.netOnlyReceiptCount} deposit-only record(s) do not include gross commission or withheld deductions, so those totals are incomplete.</p> : null}
    <p className="text-xs text-slate-500">Net = money received − recorded paid business expenses. Gross-mode broker deductions are already reflected in the deposit; record them again as an expense only when you separately paid them. All totals are before taxes and based only on entries you supplied.</p>
    {formError ? <p role="alert" className="rounded-lg border border-rose-300/30 bg-rose-300/10 p-3 text-sm text-rose-100">{formError}</p> : null}
    <div className="grid gap-5 lg:grid-cols-2">
      <Panel title="Record a commission"><form onSubmit={handleForm(saveCommission)} className="space-y-4">
        <Field label="What amount are you entering?"><select value={mode} onChange={(event) => setMode(event.target.value as 'gross' | 'net_deposit')} className={inputClass}><option value="gross">Gross commission before broker deductions</option><option value="net_deposit">Deposit I received</option></select></Field>
        <Field label={mode === 'gross' ? 'Gross commission (USD)' : 'Net deposit received (USD)'}><input inputMode="decimal" required value={commission} onChange={(event) => setCommission(event.target.value)} className={inputClass} placeholder="12,000.00" /></Field>
        {mode === 'gross' ? <Field label="Broker/transaction deductions (USD)"><input inputMode="decimal" value={deductions} onChange={(event) => setDeductions(event.target.value)} className={inputClass} placeholder="2,700.00" /></Field> : <p className="text-xs text-slate-400">We will not subtract broker fees again from a deposit amount.</p>}
        <button className={buttonClass} disabled={busy}>{busy ? 'Saving…' : 'Record commission'}</button>
      </form></Panel>
      <Panel title="Record a paid business expense"><form onSubmit={handleForm(saveExpense)} className="space-y-4">
        <Field label="Amount paid (USD)"><input inputMode="decimal" required value={expense} onChange={(event) => setExpense(event.target.value)} className={inputClass} placeholder="150.00" /></Field>
        <Field label="Category"><select value={category} onChange={(event) => setCategory(event.target.value)} className={inputClass}>{['broker_dues','mls','association','education','license','insurance','marketing','software','other'].map((value) => <option key={value} value={value}>{value.replace('_', ' ')}</option>)}</select></Field>
        <button className={buttonClass} disabled={busy}>{busy ? 'Saving…' : 'Record expense'}</button>
      </form></Panel>
      <Panel title="Track expected income"><form onSubmit={handleForm(saveExpectedIncome)} className="space-y-4">
        <Field label="Expected take-home (USD)"><input inputMode="decimal" required value={expectedIncome} onChange={(event) => setExpectedIncome(event.target.value)} className={inputClass} placeholder="8,500.00" /></Field>
        <Field label="Expected date"><input type="date" required value={expectedDate} onChange={(event) => setExpectedDate(event.target.value)} className={inputClass} /></Field>
        <Field label="Closing or reminder name"><input required maxLength={160} value={expectedLabel} onChange={(event) => setExpectedLabel(event.target.value)} className={inputClass} placeholder="Smith purchase closing" /></Field>
        <button className={buttonClass} disabled={busy}>{busy ? 'Saving…' : 'Add expected income'}</button>
      </form></Panel>
    </div>
    <Panel title={`${year} recorded activity`}>
      {entries.length ? <div className="divide-y divide-white/10">{entries.map((entry) => <div key={entry.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold">{entry.kind === 'commission' ? 'Commission received' : entry.kind === 'expense' ? String(entry.data.category || 'Expense').replace('_', ' ') : 'Expected income'}</p><p className="mt-1 text-xs text-slate-400">{entry.effective_date} · {entry.status === 'realized' ? 'realized' : entry.status}</p><p className="mt-1 text-sm font-semibold">{entry.kind === 'commission' ? money(entry.data.receivedCents as string) : entry.kind === 'expense' ? '−' + money(entry.data.amountCents as string) : money(entry.data.estimatedTakeHomeCents as string) + ' expected'}</p></div>{entry.status === 'active' ? <div className="flex flex-wrap gap-2"><button type="button" disabled={busy} onClick={() => setMutation({ entry, purpose: 'correct' })} className={quietButton}>Correct</button>{entry.kind === 'expected_commission' ? <button type="button" disabled={busy} onClick={() => setMutation({ entry, purpose: 'realize' })} className={quietButton}>Record received</button> : null}<button type="button" disabled={busy} onClick={() => { if (window.confirm('Void this entry? It will be excluded from your totals. If it is a bill payment, the bill will become pending again.')) void submit('/api/realtor/financial-records', 'PATCH', { action: 'void', recordId: entry.id, expectedRevision: entry.current_revision, requestKey: key() }, 'Entry voided; linked planner bill reopened if applicable.'); }} className="rounded-lg px-3 py-2 text-sm text-rose-200 hover:bg-rose-300/10">Void</button></div> : null}</div>)}</div> : <p className="text-sm text-slate-400">Record a commission or expense to build your business summary.</p>}
      {data?.ledger?.nextCursor ? <button type="button" disabled={loadingMore} onClick={() => void loadNextPage()} className={'mt-4 ' + quietButton}>{loadingMore ? 'Loading entries…' : 'Load more activity'}</button> : null}
    </Panel>
    {mutation ? <FinancialMutationDialog entry={mutation.entry} purpose={mutation.purpose} timeZone={timeZone} busy={busy} onClose={() => setMutation(null)} submit={submit} /> : null}
  </div>;
}

function FinancialMutationDialog({ entry, purpose, timeZone, busy, onClose, submit }: {
  entry: FinancialEntry; purpose: 'correct' | 'realize'; timeZone: string; busy: boolean; onClose: () => void;
  submit: (url: string, method: 'POST' | 'PATCH', data: unknown, success: string) => Promise<boolean>;
}) {
  const storedMode = entry.data.mode === 'gross' ? 'gross' : 'net_deposit';
  const [mode, setMode] = useState<'gross' | 'net_deposit'>(purpose === 'realize' ? 'net_deposit' : storedMode);
  const initialAmount = purpose === 'realize' ? '' : entry.kind === 'commission'
    ? String(entry.data.mode === 'gross' ? entry.data.grossCents || '' : entry.data.depositCents || '')
    : String(entry.data.amountCents || entry.data.estimatedTakeHomeCents || '');
  const [amount, setAmount] = useState(initialAmount ? (Number(initialAmount) / 100).toFixed(2) : '');
  const [deductions, setDeductions] = useState(() => {
    const withheldCents = purpose === 'realize' ? 0 : Number(entry.data.withheldCents || 0);
    return withheldCents > 0 ? (withheldCents / 100).toFixed(2) : '';
  });
  const [date, setDate] = useState(purpose === 'realize' ? todayLocal(timeZone) : entry.effective_date);
  const [label, setLabel] = useState(String(entry.data.label || ''));
  const [expenseCategory, setExpenseCategory] = useState(String(entry.data.category || 'other'));
  const [payee, setPayee] = useState(String(entry.data.payee || ''));
  const [note, setNote] = useState(String(entry.data.note || ''));
  const [formError, setFormError] = useState('');

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError('');
    try {
      const amountCents = parseUsdToCents(amount);
      const requestKey = key();
      if (purpose === 'realize' || entry.kind === 'commission') {
        const deductionCents = mode === 'gross' && deductions.trim() ? parseUsdToCents(deductions) : 0;
        const commission = mode === 'gross'
          ? { mode, grossCents: amountCents, deductions: deductionCents ? [{ kind: 'broker_split', label: 'Broker deductions', amountCents: deductionCents }] : [], receivedDate: date, closingReference: String(entry.data.closingReference || '') || null, property: null, memo: String(entry.data.memo || ''), requestKey }
          : { mode, depositCents: amountCents, receivedDate: date, closingReference: String(entry.data.closingReference || '') || null, property: null, memo: String(entry.data.memo || ''), requestKey };
        const body = purpose === 'realize'
          ? { action: 'realize_expected', recordId: entry.id, expectedRevision: entry.current_revision, commission }
          : { action: 'correct_commission', recordId: entry.id, expectedRevision: entry.current_revision, entry: commission };
        if (await submit('/api/realtor/financial-records', 'PATCH', body, purpose === 'realize' ? 'Expected income marked received and linked to a commission.' : 'Commission corrected.')) onClose();
        return;
      }
      if (entry.kind === 'expense') {
        const body = { action: 'correct_expense', recordId: entry.id, expectedRevision: entry.current_revision, entry: {
          amountCents, paidDate: date, category: expenseCategory, payee, note, occurrenceId: null, requestKey,
        } };
        if (await submit('/api/realtor/financial-records', 'PATCH', body, 'Expense corrected.')) onClose();
        return;
      }
      const body = { action: 'correct_expected_income', recordId: entry.id, expectedRevision: entry.current_revision, entry: {
        estimatedTakeHomeCents: amountCents, expectedDate: date, label: label.trim(), property: null, requestKey,
      } };
      if (await submit('/api/realtor/financial-records', 'PATCH', body, 'Expected income corrected.')) onClose();
    } catch (reason) {
      setFormError(reason instanceof Error ? reason.message : 'Check the amount and try again.');
    }
  };

  return <ModalSurface labelId="financial-mutation-title" onClose={onClose}>
      <h2 id="financial-mutation-title" className="text-xl font-bold">{purpose === 'realize' ? 'Record income received' : 'Correct ledger entry'}</h2>
      <p className="mt-2 text-sm text-slate-400">The previous revision stays in history. Corrected amounts update recorded totals; expected income remains excluded until received.</p>
      <form onSubmit={(event) => { void save(event); }} className="mt-5 space-y-4">
        {formError ? <p role="alert" className="rounded-lg border border-rose-300/30 bg-rose-300/10 p-3 text-sm text-rose-100">{formError}</p> : null}
        {purpose === 'realize' || entry.kind === 'commission' ? <>
          <Field label="What amount are you entering?"><select value={mode} onChange={(event) => setMode(event.target.value as 'gross' | 'net_deposit')} className={inputClass}><option value="gross">Gross commission before deductions</option><option value="net_deposit">Deposit received</option></select></Field>
          <Field label={mode === 'gross' ? 'Gross commission (USD)' : 'Amount actually deposited (USD)'}><input autoFocus required inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} className={inputClass} /></Field>
          {mode === 'gross' ? <Field label="Broker/transaction deductions (USD)"><input inputMode="decimal" value={deductions} onChange={(event) => setDeductions(event.target.value)} className={inputClass} /></Field> : null}
          <Field label={purpose === 'realize' ? 'Date received' : 'Corrected received date'}><input type="date" required value={date} onChange={(event) => setDate(event.target.value)} className={inputClass} /></Field>
        </> : entry.kind === 'expense' ? <>
          <Field label="Amount (USD)"><input autoFocus required inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} className={inputClass} /></Field>
          <Field label="Category"><select value={expenseCategory} onChange={(event) => setExpenseCategory(event.target.value)} className={inputClass}>{['broker_dues','mls','association','education','license','insurance','marketing','software','other'].map((value) => <option key={value} value={value}>{value.replace('_', ' ')}</option>)}</select></Field>
          <Field label="Paid date"><input type="date" required value={date} onChange={(event) => setDate(event.target.value)} className={inputClass} /></Field>
          <Field label="Payee"><input maxLength={160} value={payee} onChange={(event) => setPayee(event.target.value)} className={inputClass} /></Field>
          <Field label="Note"><input maxLength={1000} value={note} onChange={(event) => setNote(event.target.value)} className={inputClass} /></Field>
        </> : <>
          <Field label="Expected take-home (USD)"><input autoFocus required inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} className={inputClass} /></Field>
          <Field label="Expected date"><input type="date" required value={date} onChange={(event) => setDate(event.target.value)} className={inputClass} /></Field>
          <Field label="Closing or reminder name"><input required maxLength={160} value={label} onChange={(event) => setLabel(event.target.value)} className={inputClass} /></Field>
        </>}
        <div className="flex gap-2"><button className={buttonClass} disabled={busy}>{busy ? 'Saving…' : purpose === 'realize' ? 'Record received' : 'Save correction'}</button><button type="button" className={quietButton} onClick={onClose}>Cancel</button></div>
      </form>
  </ModalSurface>;
}

function GoalsView({ data, preferences, busy, submit }: { data: any; preferences: Preferences; busy: boolean; submit: (url: string, method: 'POST' | 'PATCH', data: unknown, success: string) => Promise<boolean> }) {
  const goals: Array<{ id: string; metric: ProgressGoal['metric']; target: number; revision: number; year: number }> = data?.goals || [];
  const progressGoals: ProgressGoal[] = goals.map(({ id, metric, target, year }) => ({ id, metric, target, year }));
  const completedReviews: Array<{ localWeekKey: string }> = data?.summary?.completedReviewWeeks || [];
  const summary = data?.summary;
  const year = Number(new Intl.DateTimeFormat('en-US', { timeZone: preferences.time_zone, year: 'numeric' }).format(new Date()));
  return <div className="grid gap-5 lg:grid-cols-[1fr_1.3fr]">
    <div className="lg:col-span-2"><JamieProposalCard kind="goal" timeZone={preferences.time_zone} busy={busy} submit={submit} /></div>
    <GoalEditor goals={goals} year={year} busy={busy} submit={submit} hidden={!preferences.gamification_enabled} />
    <ProgressPanel summary={summary || {}} goals={progressGoals} reviews={completedReviews} timeZone={preferences.time_zone} celebrationsEnabled={preferences.celebrations_enabled} hideProgress={!preferences.gamification_enabled} busy={busy} onArchive={(goal) => {
      const record = goals.find((item) => item.id === goal.id);
      if (record) void submit('/api/realtor/goals', 'POST', { id: goal.id, archive: true, metric: goal.metric, year: record.year, target: goal.target, expectedRevision: record.revision, requestKey: key() }, 'Goal archived.');
    }} />
  </div>;
}

function Metric({ title, value, prominent }: { title: string; value: string; prominent?: boolean }) {
  return <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{title}</p><p className={'mt-2 font-black ' + (prominent ? 'text-2xl text-cyan-100' : 'text-xl text-white')}>{value}</p></div>;
}

export function PaymentDialog({ occurrence, timeZone, busy, onClose, onSave }: { occurrence: Occurrence; timeZone: string; busy: boolean; onClose: () => void; onSave: (amount: number, date: string) => Promise<boolean> }) {
  const [amount, setAmount] = useState(occurrence.expected_amount_cents ? (occurrence.expected_amount_cents / 100).toFixed(2) : '');
  const [date, setDate] = useState(todayLocal(timeZone));
  const [formError, setFormError] = useState('');
  const save = async () => {
    setFormError('');
    try { await onSave(parseUsdToCents(amount), date); }
    catch (reason) { setFormError(reason instanceof Error ? reason.message : 'Check the amount and try again.'); }
  };
  return <ModalSurface labelId="bill-payment-title" onClose={onClose} className="w-full max-w-md"><h2 id="bill-payment-title" className="text-xl font-bold">Record bill payment</h2><p className="mt-2 text-sm text-slate-400">{occurrence.title_snapshot} · expected {money(occurrence.expected_amount_cents)}</p><div className="mt-5 space-y-4"><Field label="Amount actually paid (USD)"><input autoFocus inputMode="decimal" className={inputClass} value={amount} onChange={(event) => setAmount(event.target.value)} /></Field><Field label="Payment date"><input type="date" className={inputClass} value={date} onChange={(event) => setDate(event.target.value)} /></Field>{formError ? <p role="alert" className="rounded-lg border border-rose-300/30 bg-rose-300/10 p-3 text-sm text-rose-100">{formError}</p> : null}<div className="flex gap-2"><button className={buttonClass} disabled={busy} onClick={() => void save()}>{busy ? 'Saving…' : 'Save payment'}</button><button type="button" className={quietButton} onClick={onClose}>Cancel</button></div></div></ModalSurface>;
}
