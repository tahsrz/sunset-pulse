'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ClipboardCopy, FileSearch, Upload } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import type { TrecTemplateRegistryRow } from '@/lib/contracts/trecTemplateRegistry';

type InspectResult = {
  fileName: string;
  fileSize: number;
  pageCount: number;
  formId: string | null;
  formName: string | null;
  fieldCount: number;
  fields: Array<{
    name: string;
    type: string;
    mappedKey: string;
    options?: string[];
  }>;
  starterMapping: Record<string, string>;
};

export default function TemplateInspectorClient({ registry }: { registry: TrecTemplateRegistryRow[] }) {
  const { user, loading } = useAuth();
  const role = user?.profile?.role || user?.user_metadata?.role;
  const localOperator =
    typeof window !== 'undefined' &&
    ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);
  const allowed = localOperator || role === 'realtor' || role === 'operator' || role === 'admin';
  const [currentOnly, setCurrentOnly] = useState(true);
  const [selectedFormId, setSelectedFormId] = useState(registry[0]?.formId || '');
  const [inspecting, setInspecting] = useState(false);
  const [message, setMessage] = useState('');
  const [result, setResult] = useState<InspectResult | null>(null);

  const rows = useMemo(() => {
    if (!currentOnly) return registry;
    const latest = new Map<string, TrecTemplateRegistryRow>();
    for (const row of registry) {
      const key = `${row.category}:${row.formName}`;
      const existing = latest.get(key);
      if (!existing || row.effectiveDate > existing.effectiveDate) latest.set(key, row);
    }
    return Array.from(latest.values());
  }, [currentOnly, registry]);

  const selectedRow = rows.find((row) => row.formId === selectedFormId) || rows[0];
  const starterMappingJson = result ? JSON.stringify(result.starterMapping, null, 2) : '';

  const inspectPdf = async (file?: File) => {
    if (!file) return;
    setInspecting(true);
    setMessage('Inspecting PDF fields...');
    setResult(null);
    try {
      const formData = new FormData();
      formData.set('file', file);
      formData.set('formId', selectedFormId);
      const res = await fetch('/api/contracts/templates/inspect', {
        method: 'POST',
        body: formData,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Unable to inspect template.');
      setResult(json.data);
      setMessage(`Found ${json.data.fieldCount} fillable fields.`);
    } catch (error: any) {
      setMessage(error.message || 'Unable to inspect PDF.');
    } finally {
      setInspecting(false);
    }
  };

  if (loading) {
    return (
      <div className="mt-8 rounded-lg border border-cyan-300/20 bg-cyan-200/10 p-4 text-sm text-cyan-100">
        Checking template inspection access...
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="mt-8 rounded-lg border border-amber-300/20 bg-amber-200/10 p-4 text-sm text-amber-100">
        Realtor, operator, or admin access is required for template inspection.
      </div>
    );
  }

  return (
    <div className="mt-8 grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
      <section className="rounded-lg border border-cyan-300/20 bg-[#0b1d2a]/70 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-cyan-200">
              <FileSearch size={14} />
              Template Registry
            </p>
            <h2 className="mt-2 text-xl font-black text-white">Official PDF Intake</h2>
          </div>
          <button
            type="button"
            onClick={() => setCurrentOnly((prev) => !prev)}
            className="rounded-md border border-white/15 bg-white/5 px-3 py-2 text-[10px] font-black uppercase tracking-[0.1em] text-slate-200"
          >
            {currentOnly ? 'Current Only' : 'All Versions'}
          </button>
        </div>

        <label className="mt-5 grid gap-1 text-xs font-bold uppercase tracking-[0.12em] text-slate-300">
          Template target
          <select
            value={selectedFormId}
            onChange={(event) => setSelectedFormId(event.target.value)}
            className="rounded-md border border-white/20 bg-[#051521] px-3 py-2 text-sm normal-case tracking-normal text-white outline-none"
          >
            {rows.map((row) => (
              <option key={`${row.formId}-${row.formName}`} value={row.formId}>
                {row.formName} ({row.formId})
              </option>
            ))}
          </select>
        </label>

        {selectedRow && (
          <div className="mt-4 rounded-md border border-white/10 bg-black/20 p-3 text-xs leading-6 text-slate-300">
            <p><span className="font-black text-white">Category:</span> {selectedRow.category}</p>
            <p><span className="font-black text-white">Effective:</span> {selectedRow.effectiveDate}</p>
            <p><span className="font-black text-white">Status:</span> {selectedRow.status.replace(/_/g, ' ')}</p>
            <p><span className="font-black text-white">Template:</span> {selectedRow.templatePath || 'Not uploaded'}</p>
          </div>
        )}

        <label className="mt-5 flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-cyan-300/30 bg-cyan-300/10 px-4 py-8 text-center transition hover:bg-cyan-300/15">
          <Upload className="mb-3 text-cyan-100" />
          <span className="text-sm font-black text-white">{inspecting ? 'Inspecting...' : 'Upload PDF To Inspect'}</span>
          <span className="mt-1 text-xs text-slate-300">The file is read for field names and is not stored yet.</span>
          <input
            type="file"
            accept="application/pdf"
            disabled={inspecting}
            onChange={(event) => inspectPdf(event.target.files?.[0])}
            className="hidden"
          />
        </label>

        {message && (
          <p className="mt-4 rounded-md border border-white/10 bg-white/5 p-3 text-xs font-bold text-slate-100">
            {message}
          </p>
        )}

        <Link href="/contracts/promulgated/setup" className="mt-4 inline-flex text-xs font-black uppercase tracking-[0.12em] text-emerald-200 underline">
          Back to offer builder
        </Link>
      </section>

      <section className="rounded-lg border border-cyan-300/20 bg-[#0b1d2a]/70 p-5">
        <h2 className="text-xl font-black text-white">Field Inspector</h2>
        {!result ? (
          <p className="mt-4 text-sm leading-7 text-slate-300">
            Upload an official fillable PDF template to reveal its AcroForm fields. The starter mapping can then be reviewed and promoted into a permanent template map.
          </p>
        ) : (
          <div className="mt-4 space-y-4">
            <div className="grid gap-3 md:grid-cols-4">
              <Metric label="File" value={result.fileName} />
              <Metric label="Pages" value={String(result.pageCount)} />
              <Metric label="Fields" value={String(result.fieldCount)} />
              <Metric label="Size" value={`${Math.round(result.fileSize / 1024)} KB`} />
            </div>

            <div className="max-h-96 overflow-auto rounded-md border border-white/10">
              <table className="w-full border-collapse text-left text-xs">
                <thead className="sticky top-0 bg-[#06131d] text-slate-200">
                  <tr>
                    <th className="p-3 font-black uppercase tracking-[0.12em]">PDF Field</th>
                    <th className="p-3 font-black uppercase tracking-[0.12em]">Type</th>
                    <th className="p-3 font-black uppercase tracking-[0.12em]">Suggested Key</th>
                  </tr>
                </thead>
                <tbody>
                  {result.fields.map((field) => (
                    <tr key={field.name} className="border-t border-white/10 text-slate-300">
                      <td className="p-3 font-mono">{field.name}</td>
                      <td className="p-3">{field.type}</td>
                      <td className="p-3 font-mono text-cyan-100">{field.mappedKey}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between gap-3">
                <h3 className="text-sm font-black uppercase tracking-[0.12em] text-white">Starter Mapping JSON</h3>
                <button
                  type="button"
                  onClick={() => navigator.clipboard.writeText(starterMappingJson)}
                  className="inline-flex items-center gap-2 rounded-md border border-cyan-300/30 bg-cyan-300/15 px-3 py-2 text-xs font-black uppercase tracking-[0.1em] text-cyan-100"
                >
                  <ClipboardCopy size={14} />
                  Copy
                </button>
              </div>
              <textarea
                value={starterMappingJson}
                readOnly
                className="h-72 w-full rounded-md border border-white/20 bg-[#04121d] p-3 font-mono text-xs text-emerald-100 outline-none"
              />
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-white/10 bg-black/20 p-3">
      <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">{label}</p>
      <p className="mt-1 truncate text-sm font-bold text-white" title={value}>{value}</p>
    </div>
  );
}
