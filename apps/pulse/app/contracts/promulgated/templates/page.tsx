import Link from 'next/link';
import TemplateInspectorClient from '@/app/contracts/promulgated/templates/TemplateInspectorClient';
import { getTrecTemplateRegistry } from '@/lib/contracts/trecTemplateRegistry';

export const metadata = {
  title: 'Contract Template Inspector | Sunset Pulse',
  description: 'Inspect official TREC PDF template fields and prepare Sunset Pulse contract field mappings.'
};

export default function ContractTemplateInspectorPage() {
  const registry = getTrecTemplateRegistry(false);

  return (
    <main className="min-h-screen bg-[#071013] px-6 py-12 text-slate-100">
      <section className="mx-auto max-w-7xl">
        <p className="text-xs font-black uppercase tracking-[0.24em] text-cyan-200">Contract Ops</p>
        <div className="mt-3 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-4xl font-black leading-tight text-white md:text-5xl">Template Inspector</h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300">
              Upload official fillable PDF forms, inspect their field names, and generate starter mappings for the native offer packet filler.
            </p>
          </div>
          <Link href="/contracts/promulgated" className="text-xs font-black uppercase tracking-[0.12em] text-cyan-200 underline">
            Contract library
          </Link>
        </div>

        <TemplateInspectorClient registry={registry} />
      </section>
    </main>
  );
}
