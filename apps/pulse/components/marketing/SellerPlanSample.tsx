import Link from 'next/link';
import type { SellerExample } from '@/lib/marketing/sellerExampleSchema';

export function SellerPlanSample({ sampleLabel, tasks }: Pick<SellerExample, 'sampleLabel' | 'tasks'>) {
  return (
    <figure className="rounded-2xl border border-stone-300 bg-stone-100 p-6 text-stone-900 shadow-xl shadow-black/10 sm:p-8">
      <figcaption className="mb-6 border-b border-stone-300 pb-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-stone-600">Example Only</p>
        <h3 className="mt-2 text-2xl font-semibold">{sampleLabel}</h3>
        <p className="mt-2 text-sm leading-6 text-stone-600">An example of a conversation starter, not a plan for a specific property.</p>
      </figcaption>
      <ol className="space-y-5">
        {tasks.map((task, index) => (
          <li key={task.id} className="grid grid-cols-[2rem_1fr] gap-3">
            <span aria-hidden="true" className="text-stone-500">{index + 1}.</span>
            <div><p className="font-semibold">{task.title}</p><p className="mt-1 text-sm leading-6 text-stone-700">{task.detail}</p></div>
          </li>
        ))}
      </ol>
    </figure>
  );
}

export function PricingReviewCard() {
  return (
    <aside className="rounded-2xl border border-teal-100/15 bg-teal-100/[0.05] p-6 sm:p-7">
      <h3 className="text-xl font-bold text-white">What goes into a pricing conversation</h3>
      <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-300">
        <li><span className="font-bold text-white">The home:</span> condition, updates and features, discussed with you.</li>
        <li><span className="font-bold text-white">Relevant sales:</span> recent comparable properties, checked for fit.</li>
        <li><span className="font-bold text-white">Current competition:</span> other homes buyers can consider today.</li>
      </ul>
      <p className="mt-4 text-xs leading-5 text-slate-400">This is a personal review, not an instant estimate or appraisal.</p>
      <Link href="/seller-plan?requestKind=pricing_review#request" className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-teal-300 px-4 text-sm font-black text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">Ask About Pricing</Link>
    </aside>
  );
}
