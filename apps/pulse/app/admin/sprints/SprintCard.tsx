'use client';
import React, { useState } from 'react';
import { canOwnerMarkAssignmentComplete, getSprintAssignmentState, sprintAssignmentLabel } from '@/lib/sprints/sprintPresentation';
import { intelligenceWorkers } from '@/lib/command-center/workerRoster';

type Item = { id: string; title: string; description?: string; priority: number; estimate_minutes?: number | null; status: string; worker_id?: string | null; property_id?: string | null; property_revision?: number | null };
type Assignment = { id: string; sprint_item_id: string; worker_id?: string | null; status: string };
type Sprint = { id: string; name: string; goal: string; status: string; revision?: number };

export function SprintCard({ sprint, items, assignments, onApprove, onRemove, onComplete, onUpdate }: { sprint: Sprint; items: Item[]; assignments: Assignment[]; onApprove: () => void; onRemove: (id: string, sprintId: string, revision: number) => void; onComplete: (assignmentId: string) => void; onUpdate: (itemId: string, sprintId: string, sprintRevision: number, item: { title: string; description: string; priority: number; estimateMinutes: number | null; workerId: string | null }) => Promise<boolean> }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Item | null>(null);
  const [saving, setSaving] = useState(false);
  const [draftRevision, setDraftRevision] = useState(1);
  return <article className="mt-2 rounded-xl bg-slate-950/60 p-4">
    <div className="flex justify-between gap-3"><b>{sprint.name}</b><span className="rounded-full border border-white/10 px-2 py-1 text-[10px] uppercase tracking-widest text-slate-300">{sprint.status}</span></div>
    <p className="mt-2 text-sm">{sprint.goal}</p>
    <div className="mt-3 grid gap-2 text-xs text-slate-400">
      {items.filter((item) => item.status !== 'cancelled').map((item) => {
        const assignment = assignments.find((entry) => entry.sprint_item_id === item.id);
        const state = getSprintAssignmentState(sprint.status, assignment);
        const canComplete = Boolean(assignment && canOwnerMarkAssignmentComplete(state));
        return <div key={item.id} className="rounded-lg border border-white/5 p-3">
          <div className="flex justify-between gap-3"><span className="font-bold text-slate-200">P{item.priority} · {item.title}</span>{sprint.status === 'proposed' && <div className="flex gap-3"><button onClick={() => { setEditingId(item.id); setDraftRevision(sprint.revision ?? 1); setDraft({ ...item }); }} className="text-cyan-200">Edit</button><button onClick={() => onRemove(item.id, sprint.id, sprint.revision ?? 1)} className="text-red-200">Remove</button></div>}</div>
          {editingId === item.id && draft ? <div className="mt-3 space-y-2"><input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} className="w-full rounded bg-slate-900 p-2 text-sm text-white" /><textarea value={draft.description || ''} onChange={(event) => setDraft({ ...draft, description: event.target.value })} className="min-h-20 w-full rounded bg-slate-900 p-2 text-sm text-white" /><div className="grid gap-2 sm:grid-cols-2"><input type="number" min={1} max={5} value={draft.priority} onChange={(event) => setDraft({ ...draft, priority: Number(event.target.value) })} className="rounded bg-slate-900 p-2 text-sm text-white" placeholder="Priority" /><input type="number" min={1} max={10080} value={draft.estimate_minutes ?? ''} onChange={(event) => setDraft({ ...draft, estimate_minutes: event.target.value ? Number(event.target.value) : null })} className="rounded bg-slate-900 p-2 text-sm text-white" placeholder="Minutes" /></div><select value={draft.worker_id || ''} onChange={(event) => setDraft({ ...draft, worker_id: event.target.value || null })} className="w-full rounded bg-slate-900 p-2 text-sm text-white"><option value="">Unassigned worker</option>{intelligenceWorkers.map((worker) => <option key={worker.id} value={worker.id}>{worker.name}</option>)}</select><button disabled={saving} onClick={async () => { setSaving(true); try { const saved = await onUpdate(item.id, sprint.id, draftRevision, { title: draft.title, description: draft.description || '', priority: draft.priority, estimateMinutes: draft.estimate_minutes ?? null, workerId: draft.worker_id || null }); if (saved) { setEditingId(null); setDraft(null); } } finally { setSaving(false); } }} className="mr-3 text-emerald-200">{saving ? 'Saving…' : 'Save proposed item'}</button><button disabled={saving} onClick={() => { setEditingId(null); setDraft(null); }} className="text-slate-400">Cancel</button></div> : item.description && <p className="mt-2 leading-5 text-slate-500">{item.description}</p>}
          <div className="mt-3 flex flex-wrap gap-2"><span className="rounded-full border border-cyan-200/20 bg-cyan-200/5 px-2 py-1 text-[10px] uppercase tracking-widest text-cyan-200">{item.property_id ? `Property · revision ${item.property_revision ?? 'unknown'}` : 'General backlog'}</span><span className={`rounded-full border px-2 py-1 text-[10px] uppercase tracking-widest ${state === 'blocked' ? 'border-rose-200/30 text-rose-200' : state === 'completed' ? 'border-emerald-200/30 text-emerald-200' : 'border-amber-200/30 text-amber-100'}`}>{sprintAssignmentLabel(state)}</span></div>
          <p className="mt-2 text-slate-400">Worker: <span className="text-slate-200">{assignment?.worker_id || 'No worker assigned'}</span>{assignment?.status ? ` · recorded status: ${assignment.status}` : ''}</p>
          {state === 'awaiting_review' && <p className="mt-1 text-amber-100/80">Approval creates an owner-scoped assignment. No agent execution has started.</p>}
          {state === 'unassigned' && sprint.status !== 'proposed' && <p className="mt-1 text-amber-100/80">This approved item is waiting for a worker assignment.</p>}
          {canComplete && <button onClick={() => onComplete(assignment!.id)} className="mt-3 rounded-full border border-emerald-200/30 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-200">Mark assignment complete</button>}
        </div>;
      })}
    </div>
    {sprint.status === 'proposed' && <button onClick={onApprove} className="mt-3 text-emerald-200">Approve sprint</button>}
    <a href="/property-shortlist" className="mt-3 inline-block text-xs text-cyan-300">Review shortlist context</a>
  </article>;
}
