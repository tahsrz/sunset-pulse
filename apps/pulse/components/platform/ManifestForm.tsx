'use client';

import React, { FormEvent, useState } from 'react';
import type { AppManifest } from '@/lib/platform/contracts/appManifest';

type ManifestSchema = AppManifest['inputSchema'];
type FormValue = string | number | boolean;

export type ManifestFormProps = {
  schema: ManifestSchema;
  value: Record<string, unknown>;
  onChange: (value: Record<string, unknown>) => void;
  onSubmit: (value: Record<string, unknown>) => Promise<void> | void;
  submitLabel?: string;
  disabled?: boolean;
};

function displayName(name: string, title?: string) {
  return title || name.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function ManifestForm({ schema, value, onChange, onSubmit, submitLabel = 'Continue', disabled = false }: ManifestFormProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  function update(name: string, next: FormValue) {
    onChange({ ...value, [name]: next });
    setErrors((current) => ({ ...current, [name]: '' }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors: Record<string, string> = {};
    for (const name of schema.required) {
      if (value[name] === undefined || value[name] === '' || value[name] === null) nextErrors[name] = 'Required.';
    }
    for (const [name, field] of Object.entries(schema.properties)) {
      const current = value[name];
      if (current === undefined) continue;
      if (field.type === 'string' && typeof current === 'string') {
        if (current.length < (field.minLength ?? 0) || current.length > field.maxLength) nextErrors[name] = 'Enter a value within the allowed length.';
        if (field.enum && !field.enum.includes(current)) nextErrors[name] = 'Choose a listed option.';
      }
      if (field.type === 'number' && typeof current === 'number' && ((field.minimum !== undefined && current < field.minimum) || (field.maximum !== undefined && current > field.maximum))) {
        nextErrors[name] = 'Enter a value within the allowed range.';
      }
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    setSubmitting(true);
    try { await onSubmit(value); } finally { setSubmitting(false); }
  }

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      {Object.entries(schema.properties).map(([name, field]) => {
        const label = displayName(name, field.title);
        const error = errors[name];
        return (
          <div key={name} className="space-y-2">
            <label htmlFor={`manifest-${name}`} className="block text-sm font-semibold text-white">
              {label}{schema.required.includes(name) ? <span aria-hidden="true"> *</span> : null}
            </label>
            {field.description ? <p className="text-xs text-slate-400">{field.description}</p> : null}
            {field.type === 'boolean' ? (
              <input id={`manifest-${name}`} type="checkbox" checked={value[name] === true} disabled={disabled || submitting}
                onChange={(event) => update(name, event.target.checked)} className="h-4 w-4 accent-cyan-300" />
            ) : field.type === 'string' && field.enum ? (
              <select id={`manifest-${name}`} value={typeof value[name] === 'string' ? value[name] as string : ''} disabled={disabled || submitting}
                onChange={(event) => update(name, event.target.value)} className="w-full rounded-md border border-white/15 bg-slate-950 px-3 py-2 text-sm text-white">
                <option value="">Select…</option>
                {field.enum.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            ) : (
              <input id={`manifest-${name}`} type={field.type === 'number' ? 'number' : 'text'} value={value[name] == null ? '' : String(value[name])}
                min={field.type === 'number' ? field.minimum : undefined} max={field.type === 'number' ? field.maximum : undefined}
                maxLength={field.type === 'string' ? field.maxLength : undefined} disabled={disabled || submitting}
                onChange={(event) => update(name, field.type === 'number' ? Number(event.target.value) : event.target.value)}
                className="w-full rounded-md border border-white/15 bg-slate-950 px-3 py-2 text-sm text-white" />
            )}
            {error ? <p role="alert" className="text-xs text-rose-300">{error}</p> : null}
          </div>
        );
      })}
      <button type="submit" disabled={disabled || submitting} className="rounded-md bg-cyan-300 px-4 py-2 text-sm font-bold text-slate-950 disabled:opacity-50">
        {submitting ? 'Saving…' : submitLabel}
      </button>
    </form>
  );
}
