'use client';

import { useEffect, useRef, useState, type ClipboardEvent, type DragEvent, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import {
  FilePlus2,
  ImagePlus,
  Loader2,
  Plus,
  UploadCloud,
  X,
} from 'lucide-react';
import {
  INTERNAL_LEAD_SOURCE_LABELS,
  type InternalLeadSource,
  type LeadCollaborator,
} from '@/lib/lead-generation/internalLeadSystem';

type IntakeMode = 'structured' | 'paste';

const sourceOptions = Object.entries(INTERNAL_LEAD_SOURCE_LABELS) as Array<[InternalLeadSource, string]>;

export default function LeadIntakeDrawer() {
  const router = useRouter();
  const firstFieldRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<IntakeMode>('structured');
  const [collaborators, setCollaborators] = useState<LeadCollaborator[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable;
      const shortcut = (event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === 'k';
      const createKey = event.key.toLowerCase() === 'c' && !typing && !event.metaKey && !event.ctrlKey && !event.altKey;
      if (!shortcut && !createKey) return;

      event.preventDefault();
      setIsOpen(true);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const timeout = window.setTimeout(() => firstFieldRef.current?.focus(), 100);
    void loadCollaborators();
    return () => window.clearTimeout(timeout);
  }, [isOpen]);

  const closeDrawer = () => {
    if (isSubmitting) return;
    setIsOpen(false);
    setError('');
  };

  const addFiles = (incoming: FileList | File[]) => {
    const candidates = Array.from(incoming);
    setFiles((current) => {
      const known = new Set(current.map((file) => `${file.name}-${file.size}-${file.lastModified}`));
      return [...current, ...candidates.filter((file) => !known.has(`${file.name}-${file.size}-${file.lastModified}`))].slice(0, 5);
    });
  };

  const handleDrop = (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
    addFiles(event.dataTransfer.files);
  };

  const handlePaste = (event: ClipboardEvent<HTMLDivElement>) => {
    const clipboardFiles = Array.from(event.clipboardData.files);
    if (clipboardFiles.length) {
      event.preventDefault();
      addFiles(clipboardFiles);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError('');
    setSuccess('');

    const formData = new FormData(event.currentTarget);
    files.forEach((file) => formData.append('evidence', file));

    try {
      const response = await fetch('/api/admin/leads', { method: 'POST', body: formData });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'Lead intake failed.');

      event.currentTarget.reset();
      setFiles([]);
      setSuccess('Lead added to the shared operating system.');
      router.refresh();
      window.setTimeout(() => setIsOpen(false), 700);
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : 'Lead intake failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const loadCollaborators = async () => {
    try {
      const response = await fetch('/api/admin/leads?meta=1', { cache: 'no-store' });
      const payload = await response.json();
      if (response.ok) setCollaborators(payload.collaborators || []);
    } catch {
      // Assignment remains optional when directory lookup is unavailable.
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        title="Add a prospect or research record"
        className="inline-flex h-10 items-center gap-2 rounded-md bg-emerald-400 px-3 text-xs font-black uppercase tracking-[0.12em] text-emerald-950 shadow-sm transition hover:bg-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-200"
      >
        <Plus size={16} strokeWidth={3} />
        <span className="hidden xl:inline">Add Lead</span>
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-[120]" onPaste={handlePaste}>
          <button
            type="button"
            aria-label="Close lead intake"
            className="absolute inset-0 cursor-default bg-black/55 backdrop-blur-[2px]"
            onClick={closeDrawer}
          />

          <aside
            className="absolute inset-y-0 right-0 flex w-full max-w-xl flex-col border-l border-white/10 bg-zinc-950 text-zinc-100 shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-label="Add lead"
          >
            <header className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center bg-emerald-400 text-emerald-950">
                  <FilePlus2 size={18} strokeWidth={2.5} />
                </div>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-200/70">Shared Intake</p>
                  <h2 className="mt-0.5 text-lg font-black text-white">Add Lead</h2>
                </div>
              </div>
              <button
                type="button"
                onClick={closeDrawer}
                className="inline-flex h-9 w-9 items-center justify-center border border-white/10 text-zinc-300 transition hover:bg-white/10 hover:text-white"
                aria-label="Close lead intake"
              >
                <X size={18} />
              </button>
            </header>

            <div className="grid grid-cols-2 border-b border-white/10 p-2">
              <DrawerTab active={mode === 'structured'} onClick={() => setMode('structured')} label="Structured Entry" />
              <DrawerTab active={mode === 'paste'} onClick={() => setMode('paste')} label="Paste Dump" />
            </div>

            <form className="flex min-h-0 flex-1 flex-col" onSubmit={handleSubmit}>
              <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5">
                {mode === 'structured' ? (
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="First name">
                      <input ref={firstFieldRef} name="firstName" autoComplete="given-name" className={inputClass} />
                    </Field>
                    <Field label="Last name">
                      <input name="lastName" autoComplete="family-name" className={inputClass} />
                    </Field>
                    <Field label="Phone">
                      <input name="phone" type="tel" autoComplete="tel" className={inputClass} />
                    </Field>
                    <Field label="Email">
                      <input name="email" type="email" autoComplete="email" className={inputClass} />
                    </Field>
                    <Field label="Property address" fullWidth>
                      <input name="propertyAddress" autoComplete="street-address" className={inputClass} />
                    </Field>
                    <Field label="Mailing address" fullWidth>
                      <input name="mailingAddress" className={inputClass} />
                    </Field>
                  </div>
                ) : (
                  <Field label="Raw MLS, tax, call, or referral notes" fullWidth>
                    <textarea
                      ref={firstFieldRef as any}
                      name="rawPasteDump"
                      rows={12}
                      className={`${inputClass} min-h-60 resize-y py-3 leading-6`}
                    />
                  </Field>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Lead source">
                    <select name="source" defaultValue="manual_entry" className={inputClass}>
                      {sourceOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </select>
                  </Field>
                  <Field label="Assignee">
                    <select name="assignedTo" defaultValue="" className={inputClass}>
                      <option value="">Unassigned</option>
                      {collaborators.map((collaborator) => <option key={collaborator.id} value={collaborator.id}>{collaborator.name}</option>)}
                    </select>
                  </Field>
                </div>

                <fieldset>
                  <legend className="mb-2 text-[10px] font-black uppercase tracking-[0.16em] text-zinc-400">Destination</legend>
                  <div className="grid grid-cols-2 gap-2">
                    <DestinationOption value="research" label="Research Queue" defaultChecked />
                    <DestinationOption value="new" label="Main Pipeline" />
                  </div>
                </fieldset>

                <section>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-zinc-400">Evidence</p>
                    <span className="text-[10px] text-zinc-500">{files.length}/5</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={handleDrop}
                    className="flex min-h-24 w-full flex-col items-center justify-center gap-2 border border-dashed border-emerald-300/40 bg-emerald-400/[0.035] px-4 text-center text-emerald-100 transition hover:bg-emerald-400/[0.08]"
                  >
                    <UploadCloud size={20} />
                    <span className="text-xs font-bold">Drop or choose screenshots and PDFs</span>
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    className="sr-only"
                    onChange={(event) => addFiles(event.target.files || [])}
                  />
                  {files.length ? (
                    <div className="mt-2 divide-y divide-white/10 border border-white/10">
                      {files.map((file, index) => (
                        <div key={`${file.name}-${file.lastModified}`} className="flex items-center gap-2 px-3 py-2 text-xs text-zinc-300">
                          <ImagePlus size={14} className="shrink-0 text-emerald-200" />
                          <span className="min-w-0 flex-1 truncate">{file.name}</span>
                          <button type="button" className="text-zinc-500 hover:text-white" onClick={() => setFiles((current) => current.filter((_, currentIndex) => currentIndex !== index))} aria-label={`Remove ${file.name}`}>
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : null}
                  <input name="evidenceContext" className={`${inputClass} mt-3`} placeholder="Evidence context (optional)" />
                </section>

                {error ? <p className="border border-rose-300/30 bg-rose-300/10 px-3 py-2 text-sm text-rose-100">{error}</p> : null}
                {success ? <p className="border border-emerald-300/30 bg-emerald-300/10 px-3 py-2 text-sm text-emerald-100">{success}</p> : null}
              </div>

              <footer className="border-t border-white/10 p-4">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex w-full items-center justify-center gap-2 bg-emerald-400 px-4 py-3 text-xs font-black uppercase tracking-[0.14em] text-emerald-950 transition hover:bg-emerald-300 disabled:cursor-wait disabled:opacity-65"
                >
                  {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} strokeWidth={3} />}
                  Create Lead
                </button>
              </footer>
            </form>
          </aside>
        </div>
      ) : null}
    </>
  );
}

function DrawerTab({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return <button type="button" onClick={onClick} className={`px-3 py-2 text-xs font-black uppercase tracking-[0.12em] transition ${active ? 'bg-white/10 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>{label}</button>;
}

function Field({ label, children, fullWidth = false }: { label: string; children: React.ReactNode; fullWidth?: boolean }) {
  return <label className={fullWidth ? 'col-span-2 block' : 'block'}>
    <span className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.14em] text-zinc-400">{label}</span>
    {children}
  </label>;
}

function DestinationOption({ value, label, defaultChecked = false }: { value: 'research' | 'new'; label: string; defaultChecked?: boolean }) {
  return <label className="cursor-pointer border border-white/10 bg-white/[0.025] px-3 py-3 text-sm font-bold text-zinc-300 transition has-[:checked]:border-emerald-300/60 has-[:checked]:bg-emerald-300/10 has-[:checked]:text-emerald-100">
    <input className="sr-only" type="radio" name="status" value={value} defaultChecked={defaultChecked} />
    {label}
  </label>;
}

const inputClass = 'h-11 w-full border border-white/10 bg-black/25 px-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-emerald-300/70';
