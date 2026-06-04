'use client';

import { useMemo, useState } from 'react';

type FormRow = {
  formName: string;
  formId: string;
  effectiveDate: string;
  summary?: string;
  useCase?: string;
};

type Props = {
  contracts: FormRow[];
  addenda: FormRow[];
  otherForms: FormRow[];
};

export default function PromulgatedContractsClient({ contracts, addenda, otherForms }: Props) {
  const [currentOnly, setCurrentOnly] = useState(true);

  const filteredContracts = useMemo(() => (currentOnly ? latestByName(contracts) : contracts), [contracts, currentOnly]);
  const filteredAddenda = useMemo(() => (currentOnly ? latestByName(addenda) : addenda), [addenda, currentOnly]);
  const filteredOtherForms = useMemo(() => (currentOnly ? latestByName(otherForms) : otherForms), [otherForms, currentOnly]);

  return (
    <>
      <div className="mt-7 flex items-center justify-between gap-3 rounded-lg border border-cyan-300/20 bg-[#0b1d2a]/70 p-4">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-300">Version Filter</p>
        <button
          type="button"
          onClick={() => setCurrentOnly((prev) => !prev)}
          aria-pressed={currentOnly}
          className={`rounded-full border px-3 py-1 text-xs font-black uppercase tracking-[0.08em] transition ${
            currentOnly
              ? 'border-emerald-300/40 bg-emerald-300/20 text-emerald-100'
              : 'border-white/20 bg-white/5 text-slate-200'
          }`}
        >
          {currentOnly ? 'Current Only: On' : 'Current Only: Off'}
        </button>
      </div>

      <Section title="Contracts" items={filteredContracts} showDetails />
      <Section title="Contract Addenda" items={filteredAddenda} />
      <Section title="Other Forms" items={filteredOtherForms} />
    </>
  );
}

function latestByName(items: FormRow[]) {
  const seen = new Map<string, FormRow>();
  for (const item of items) {
    const current = seen.get(item.formName);
    if (!current || item.effectiveDate > current.effectiveDate) {
      seen.set(item.formName, item);
    }
  }
  return Array.from(seen.values()).sort((a, b) => a.formName.localeCompare(b.formName));
}

function Section({ title, items, showDetails }: { title: string; items: FormRow[]; showDetails?: boolean }) {
  return (
    <section className="mt-10">
      <h2 className="text-2xl font-black text-white">{title}</h2>
      <div className="mt-4 grid gap-4">
        {items.map((item) => (
          <article key={`${item.formId}-${item.formName}`} className="rounded-xl border border-cyan-300/20 bg-[#0b1d2a]/70 p-5">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-black text-white">{item.formName}</h3>
              <span className="rounded-full border border-cyan-200/30 bg-cyan-300/10 px-2 py-0.5 text-[11px] font-bold text-cyan-100">
                Form {item.formId}
              </span>
              <span className="rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-[11px] font-bold text-slate-200">
                Effective {item.effectiveDate}
              </span>
            </div>
            {showDetails && item.summary && <p className="mt-3 text-sm text-slate-300">{item.summary}</p>}
            {showDetails && item.useCase && <p className="mt-2 text-sm text-slate-400">Use case: {item.useCase}</p>}
          </article>
        ))}
      </div>
    </section>
  );
}
