import fs from 'node:fs';
import path from 'node:path';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTrecTemplateRegistry, getTemplateRow } from '@/lib/contracts/trecTemplateRegistry';

type Props = { params: Promise<{ formId: string }> };

export function generateStaticParams() {
  return getTrecTemplateRegistry(false).map((row) => ({ formId: row.formId }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const row = getTemplateRow(decodeFormId((await params).formId));
  return row
    ? { title: `${row.formName} Preview | Sunset Pulse`, description: `Read-only preview for TREC Form ${row.formId}.` }
    : { title: 'Contract Preview | Sunset Pulse' };
}

export default async function PromulgatedContractPreviewPage({ params }: Props) {
  const row = getTemplateRow(decodeFormId((await params).formId));
  if (!row) notFound();

  const previewPath = `/api/contracts/templates/${encodeURIComponent(row.formId)}/preview`;
  const templateAvailable = Boolean(row.templatePath && fs.existsSync(path.resolve(process.cwd(), row.templatePath)));

  return (
    <main className="min-h-screen bg-[#071013] px-6 py-12 text-slate-100">
      <section className="mx-auto max-w-6xl">
        <Link href="/contracts/promulgated" className="text-xs font-black uppercase tracking-[0.14em] text-cyan-200 underline">
          ← Back to promulgated contracts
        </Link>
        <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-cyan-200">Read-only form preview</p>
            <h1 className="mt-3 text-3xl font-black leading-tight text-white md:text-5xl">{row.formName}</h1>
            <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold text-slate-300">
              <span className="rounded-full border border-cyan-200/30 bg-cyan-300/10 px-3 py-1">Form {row.formId}</span>
              <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1">{row.category}</span>
              <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1">Effective {row.effectiveDate}</span>
            </div>
          </div>
          <Link href="/contracts/promulgated/setup" className="rounded-md border border-emerald-300/30 bg-emerald-300/15 px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-emerald-100">
            Open setup workspace
          </Link>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[0.75fr_1.25fr]">
          <aside className="rounded-xl border border-cyan-300/20 bg-[#0b1d2a]/70 p-5">
            <h2 className="text-lg font-black text-white">Form details</h2>
            {row.summary && <p className="mt-4 text-sm leading-7 text-slate-300">{row.summary}</p>}
            {row.useCase && <p className="mt-3 text-sm leading-7 text-slate-400"><span className="font-black text-slate-200">Use case:</span> {row.useCase}</p>}
            <div className="mt-5 rounded-lg border border-amber-300/20 bg-amber-200/10 p-3 text-xs leading-6 text-amber-100">
              Verify the live version directly with TREC before transaction use. This page is an informational preview, not legal advice.
            </div>
            <Link href="https://www.trec.texas.gov/agency-information/contracts" target="_blank" rel="noreferrer" className="mt-4 inline-flex text-xs font-black uppercase tracking-[0.12em] text-cyan-200 underline">
              Verify with TREC ↗
            </Link>
          </aside>

          <section className="overflow-hidden rounded-xl border border-cyan-300/20 bg-[#0b1d2a]/70 p-3">
            {templateAvailable ? (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3 px-2 pb-3">
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-300">Official PDF preview</p>
                  <a href={previewPath} target="_blank" rel="noreferrer" className="text-xs font-black uppercase tracking-[0.12em] text-cyan-200 underline">
                    Open browser preview ↗
                  </a>
                </div>
                <div className="flex min-h-[420px] flex-col items-center justify-center rounded-lg border border-dashed border-cyan-200/25 bg-cyan-300/5 p-8 text-center">
                  <p className="text-lg font-black text-white">Official PDF ready</p>
                  <p className="mt-3 max-w-md text-sm leading-7 text-slate-300">Open the read-only document in the browser’s native PDF viewer to zoom, search, print, or download it.</p>
                  <a href={previewPath} target="_blank" rel="noreferrer" className="mt-5 rounded-md bg-cyan-300 px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-slate-950">
                    View Form {row.formId} ↗
                  </a>
                </div>
              </>
            ) : (
              <div className="flex min-h-[420px] flex-col items-center justify-center rounded-lg border border-dashed border-cyan-200/25 bg-cyan-300/5 p-8 text-center">
                <p className="text-lg font-black text-white">Preview record available</p>
                <p className="mt-3 max-w-md text-sm leading-7 text-slate-300">The form is indexed and openable here, but its official PDF is not bundled in this deployment yet. Use the TREC link to inspect the current document.</p>
                <Link href="https://www.trec.texas.gov/agency-information/contracts" target="_blank" rel="noreferrer" className="mt-5 rounded-md bg-cyan-300 px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-slate-950">
                  Open TREC contracts ↗
                </Link>
              </div>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}

function decodeFormId(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
