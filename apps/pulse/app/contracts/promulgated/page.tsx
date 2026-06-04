import Link from 'next/link';
import { TREC_CONTRACT_ADDENDA, TREC_OTHER_FORMS, TREC_PROMULGATED_CONTRACTS } from '@/lib/contracts/trecPromulgatedContracts';
import PromulgatedContractsClient from '@/app/contracts/promulgated/PromulgatedContractsClient';

export const metadata = {
  title: 'Promulgated Contracts | Sunset Pulse',
  description: 'Current Texas Real Estate Commission (TREC) promulgated contract forms surfaced for Sunset Pulse users.'
};

export default function PromulgatedContractsPage() {
  return (
    <main className="min-h-screen bg-[#071013] px-6 py-12 text-slate-100">
      <section className="mx-auto max-w-6xl">
        <p className="text-xs font-black uppercase tracking-[0.24em] text-cyan-200">Legal Library</p>
        <h1 className="mt-3 text-4xl font-black leading-tight text-white md:text-5xl">TREC Promulgated Contracts</h1>
        <p className="mt-5 max-w-4xl text-sm leading-7 text-slate-300">
          Current promulgated contract forms from the Texas Real Estate Commission. This is an informational index only and is not legal advice.
        </p>
        <div className="mt-5">
          <Link
            href="/contracts/promulgated/setup"
            className="mr-3 inline-flex rounded-md border border-emerald-300/30 bg-emerald-300/20 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-emerald-100"
          >
            Realtor Setup Workspace
          </Link>
          <Link
            href="/contracts/promulgated/templates"
            className="inline-flex rounded-md border border-cyan-300/30 bg-cyan-300/15 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-cyan-100"
          >
            Template Inspector
          </Link>
        </div>

        <PromulgatedContractsClient
          contracts={TREC_PROMULGATED_CONTRACTS}
          addenda={TREC_CONTRACT_ADDENDA}
          otherForms={TREC_OTHER_FORMS}
        />

        <div className="mt-8 rounded-lg border border-amber-300/20 bg-amber-200/10 p-4 text-xs leading-6 text-amber-100">
          Verify live versions directly with TREC before transaction use: {' '}
          <Link href="https://www.trec.texas.gov/agency-information/contracts" className="font-black underline" target="_blank" rel="noreferrer">
            trec.texas.gov/agency-information/contracts
          </Link>
        </div>
      </section>
    </main>
  );
}
