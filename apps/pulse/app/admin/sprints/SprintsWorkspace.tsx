'use client';

import { useEffect, useRef, useState } from 'react';
import { SprintCard } from './SprintCard';

type Backlog = { id: string; title: string; description?: string | null; priority: number; status: string; estimate_minutes?: number | null; source_type?: string | null; source_id?: string | null };
type Sprint = { id: string; name: string; goal: string; status: string; revision?: number };
type SprintItem = { id: string; sprint_id: string; title: string; description?: string; priority: number; status: string; property_id?: string | null; property_revision?: number | null };
type Assignment = { id: string; sprint_item_id: string; worker_id?: string | null; status: string };
type Schedule = { id: string; enabled: boolean; planning_mode?: 'manual_backlog' | 'property_shortlist'; cadence: 'daily' | 'weekly'; time_zone: string; local_hour: number; local_minute: number; local_weekday: number; next_run_at: string; revision?: number };
type Job = { id: string; status: string; scheduled_for: string; attempts: number; workflow_key: string; trigger_kind?: 'scheduled' | 'event'; event_key?: string | null };

const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export function SprintsWorkspace() {
  const [backlog, setBacklog] = useState<Backlog[]>([]), [sprints, setSprints] = useState<Sprint[]>([]), [items, setItems] = useState<SprintItem[]>([]), [assignments, setAssignments] = useState<Assignment[]>([]), [jobs, setJobs] = useState<Job[]>([]);
  const [schedule, setSchedule] = useState<Schedule | null>(null), [cadence, setCadence] = useState<'daily' | 'weekly'>('weekly'), [planningMode, setPlanningMode] = useState<'manual_backlog' | 'property_shortlist'>('manual_backlog');
  const [timeZone, setTimeZone] = useState('America/Chicago'), [localWeekday, setLocalWeekday] = useState(1), [localHour, setLocalHour] = useState(8), [localMinute, setLocalMinute] = useState(0);
  const [title, setTitle] = useState(''), [editing, setEditing] = useState<Backlog | null>(null), [error, setError] = useState(''), [pending, setPending] = useState(false);
  const scheduleDirtyRef = useRef(false);
  const markScheduleDirty = () => { scheduleDirtyRef.current = true; };

  const load = async (preserveScheduleDraft = false) => {
    const response = await fetch('/api/sprints', { cache: 'no-store' }); const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || 'Unable to load sprints.');
    setBacklog(payload.backlog || []); setSprints(payload.sprints || []); setItems(payload.items || []); setAssignments(payload.assignments || []);
    const saved = payload.schedules?.[0] as Schedule | undefined; setSchedule(saved || null);
    if (saved && !preserveScheduleDraft && !scheduleDirtyRef.current) { setCadence(saved.cadence); setPlanningMode(saved.planning_mode || 'manual_backlog'); setTimeZone(saved.time_zone); setLocalWeekday(saved.local_weekday); setLocalHour(saved.local_hour); setLocalMinute(saved.local_minute); }
    const scheduler = await fetch('/api/scheduler', { cache: 'no-store' }); const schedulerPayload = await scheduler.json();
    if (!scheduler.ok) throw new Error(schedulerPayload.error || 'Unable to load scheduler jobs.');
    setJobs((schedulerPayload.jobs || []).filter((job: Job) => job.workflow_key === 'sprint_planner'));
  };
  useEffect(() => { void load().catch((e) => setError(e.message)); }, []);
  const post = async (body: unknown) => { setPending(true); setError(''); try { const response = await fetch('/api/sprints', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); const payload = await response.json(); if (!response.ok) throw new Error(payload.error || 'Sprint request failed.'); const isScheduleSave = typeof body === 'object' && body !== null && 'action' in body && body.action === 'create_schedule'; const preserveDraft = scheduleDirtyRef.current && !isScheduleSave; if (isScheduleSave) scheduleDirtyRef.current = false; await load(preserveDraft); return true; } catch (e) { setError(e instanceof Error ? e.message : 'Sprint request failed.'); return false; } finally { setPending(false); } };
  const mutateScheduler = async (body: unknown) => { setPending(true); setError(''); try { const response = await fetch('/api/scheduler', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); const payload = await response.json(); if (!response.ok) throw new Error(payload.error || 'Scheduler request failed.'); await load(); } catch (e) { setError(e instanceof Error ? e.message : 'Scheduler request failed.'); } finally { setPending(false); } };
  const generatePropertyPlan = async () => { setPending(true); setError(''); try { const response = await fetch('/api/property-shortlist/plan', { method: 'POST' }); const payload = await response.json(); if (!response.ok) throw new Error(payload.error || 'Unable to generate property plan.'); await load(scheduleDirtyRef.current); } catch (e) { setError(e instanceof Error ? e.message : 'Unable to generate property plan.'); } finally { setPending(false); } };
  const refresh = () => void load(true).catch((e) => setError(e instanceof Error ? e.message : 'Unable to refresh sprints.'));
  const toggle = () => schedule && void mutateScheduler({ action: schedule.enabled ? 'pause' : 'resume', id: schedule.id });
  const cancel = (id: string) => void mutateScheduler({ action: 'cancel_job', id });

  return (
    <section className="rounded-3xl border border-cyan-200/20 bg-cyan-500/[.05] p-6 text-slate-100">
      <p className="text-xs uppercase tracking-widest text-cyan-200">Reusable sprint planner</p>
      <h1 className="mt-2 text-3xl font-black text-white">Plan work on a schedule</h1>
      <p className="mt-2 text-sm text-slate-300">Build the next research and buyer follow-up tasks from your Keller / Westlake shortlist.</p>
      <button disabled={pending} onClick={() => void generatePropertyPlan()} className="mt-3 rounded-xl border border-cyan-200/30 px-4 py-2 text-xs font-black uppercase text-cyan-100">Generate property plan</button>

      <div className="mt-6 flex flex-wrap gap-3">
        <label className="flex items-center gap-2 text-xs text-slate-300">Planning mode
          <select aria-label="Planning mode" value={planningMode} onChange={(e) => { markScheduleDirty(); setPlanningMode(e.target.value as 'manual_backlog' | 'property_shortlist'); }} className="rounded-xl bg-slate-950 p-3">
            <option value="manual_backlog">Manual backlog</option>
            <option value="property_shortlist">Keller / Westlake shortlist</option>
          </select>
        </label>
        <label className="flex items-center gap-2 text-xs text-slate-300">Cadence
          <select aria-label="Cadence" value={cadence} onChange={(e) => { markScheduleDirty(); setCadence(e.target.value as 'daily' | 'weekly'); }} className="rounded-xl bg-slate-950 p-3">
            <option value="weekly">Weekly</option>
            <option value="daily">Daily</option>
          </select>
        </label>
        {cadence === 'weekly' && <label className="flex items-center gap-2 text-xs text-slate-300">Day
          <select aria-label="Weekday" value={localWeekday} onChange={(e) => { markScheduleDirty(); setLocalWeekday(Number(e.target.value)); }} className="rounded-xl bg-slate-950 p-3">
            {weekdays.map((day, i) => <option key={day} value={i + 1}>{day}</option>)}
          </select>
        </label>}
        <label className="flex items-center gap-2 text-xs text-slate-300">Timezone
          <input value={timeZone} onChange={(e) => { markScheduleDirty(); setTimeZone(e.target.value); }} aria-label="Timezone" className="w-52 rounded-xl bg-slate-950 p-3" />
        </label>
        <label className="flex items-center gap-2 text-xs text-slate-300">Hour
          <input type="number" min={0} max={23} value={localHour} onChange={(e) => { markScheduleDirty(); setLocalHour(Number(e.target.value)); }} aria-label="Hour" className="w-20 rounded-xl bg-slate-950 p-3" />
        </label>
        <label className="flex items-center gap-2 text-xs text-slate-300">Minute
          <input type="number" min={0} max={59} value={localMinute} onChange={(e) => { markScheduleDirty(); setLocalMinute(Number(e.target.value)); }} aria-label="Minute" className="w-20 rounded-xl bg-slate-950 p-3" />
        </label>
        <button disabled={pending} onClick={() => void post({ action: 'create_schedule', planningMode, cadence, timeZone, localHour, localMinute, localWeekday, expectedRevision: schedule?.revision ?? null })} className="rounded-xl bg-cyan-300 px-4 py-3 text-xs font-black uppercase text-cyan-950">{schedule ? 'Save schedule' : 'Enable planning'}</button>
        {schedule && <button disabled={pending} onClick={toggle} className="rounded-xl border border-white/20 px-4 py-3 text-xs uppercase">{schedule.enabled ? 'Pause' : 'Resume'}</button>}
        <button disabled={pending} onClick={refresh} className="rounded-xl border border-white/20 px-4 py-3 text-xs uppercase">Refresh</button>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Backlog item title" className="flex-1 rounded-xl bg-slate-950 p-3" />
        <button disabled={pending || !title.trim()} onClick={async () => { const ok = await post({ action: 'add_backlog_item', title, priority: 3 }); if (ok) setTitle(''); }} className="rounded-xl bg-cyan-300 px-4 py-3 text-xs font-black uppercase text-cyan-950">Add</button>
      </div>

      {schedule?.next_run_at && <p className="mt-3 text-xs text-slate-400">Next run: {new Date(schedule.next_run_at).toLocaleString(undefined, { timeZone: schedule.time_zone })} ({schedule.time_zone})</p>}
      {error && <p className="mt-3 text-red-200">{error}</p>}

      <div className="mt-4 rounded-xl bg-slate-950/40 p-3 text-xs">
        <p className="uppercase text-slate-500">Scheduler jobs</p>
        {jobs.slice(0, 5).map((job) => <div key={job.id} className="flex justify-between gap-3">
          <span>{job.trigger_kind === 'event' ? `Event · ${job.event_key || 'unlabeled'}` : 'Scheduled'} · {new Date(job.scheduled_for).toLocaleString()}</span>
          <span>{job.status} · {job.attempts}/3 {['queued', 'running'].includes(job.status) && <button disabled={pending} onClick={() => cancel(job.id)} className="ml-2 text-red-200">Cancel</button>}</span>
        </div>)}
      </div>

      <div className="mt-8 grid gap-8 md:grid-cols-2">
        <section>
          <h2 className="font-black uppercase text-slate-400">Backlog</h2>
          {backlog.filter((item) => item.status === 'open').map((item) => <div key={item.id} className="mt-2 rounded-xl bg-slate-950/60 p-3">
            {editing?.id === item.id ? <>
              <input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} className="w-full rounded bg-slate-900 p-2" />
              <textarea value={editing.description || ''} onChange={(e) => setEditing({ ...editing, description: e.target.value })} placeholder="Description or owner context" className="mt-2 min-h-20 w-full rounded bg-slate-900 p-2 text-sm" />
              <input type="number" min={1} max={10080} value={editing.estimate_minutes ?? ''} onChange={(e) => setEditing({ ...editing, estimate_minutes: e.target.value ? Number(e.target.value) : null })} placeholder="Estimate in minutes" className="mt-2 w-full rounded bg-slate-900 p-2 text-sm" />
              <button disabled={pending} onClick={() => { if (editing) void post({ action: 'update_backlog_item', itemId: item.id, title: editing.title, description: editing.description || '', priority: editing.priority, estimateMinutes: editing.estimate_minutes ?? null, status: 'open' }).then((ok) => { if (ok) setEditing(null); }); }} className="mr-3 mt-2 text-emerald-200">Save</button>
              <button disabled={pending} onClick={() => setEditing(null)} className="text-slate-400">Cancel</button>
            </> : <>
              <span>P{item.priority} · {item.title}</span>
              <div className="mt-1 flex flex-wrap gap-2 text-[10px] uppercase tracking-widest"><span className="text-cyan-200">{item.source_type === 'property_shortlist' ? 'Keller / Westlake shortlist' : item.source_type === 'pulse_command' ? 'Pulse command' : 'Manual'}</span>{item.source_id ? <span className="text-slate-500">Source linked</span> : null}</div>
              <p className="mt-1 text-xs text-slate-500">{item.description || 'No description'}{item.estimate_minutes ? ` · ${item.estimate_minutes} min` : ''}</p>
              <button disabled={pending} onClick={() => setEditing(item)} className="float-right text-cyan-200">Edit</button>
            </>}
          </div>)}
        </section>
        <section>
          <h2 className="font-black uppercase text-slate-400">Proposed sprints</h2>
          {sprints.map((sprint) => <SprintCard
            key={sprint.id}
            sprint={sprint}
            items={items.filter((item) => item.sprint_id === sprint.id)}
            assignments={assignments}
            onApprove={() => void post({ action: 'approve', sprintId: sprint.id, expectedRevision: sprint.revision ?? 1 })}
            onRemove={(id, sprintId, revision) => void post({ action: 'remove_sprint_item', itemId: id, sprintId, expectedRevision: revision })}
            onComplete={(assignmentId) => void post({ action: 'complete_assignment', assignmentId })}
            onUpdate={(itemId, sprintId, sprintRevision, values) => post({ action: 'update_sprint_item', itemId, sprintId, expectedSprintRevision: sprintRevision, ...values })}
          />)}
        </section>
      </div>
    </section>
  );
}
