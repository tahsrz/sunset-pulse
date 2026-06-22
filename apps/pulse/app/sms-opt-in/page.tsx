import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { SMS_OPT_IN_USE_CASES } from '@/lib/sms/consent';

export const metadata = {
  title: 'Business SMS Opt-In',
  description: 'Choose separate SMS opt-ins by end business and message type.',
};

export default function SmsOptInPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-4 py-24 text-white">
      <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
        <section className="pt-2">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-300">Business Text Updates</p>
          <h1 className="mt-4 text-4xl font-black uppercase tracking-tight text-white sm:text-5xl">
            Opt In For SMS Alerts
          </h1>
          <p className="mt-5 text-base leading-7 text-slate-300">
            Choose the exact business and message type the contact wants to receive. Each link opens a dedicated opt-in page with one consent checkbox.
          </p>

          <div className="mt-8 grid gap-3 text-sm leading-6 text-slate-300">
            <div className="border-l-2 border-cyan-300 bg-white/[0.04] px-4 py-3">
              Reviewers can inspect each opt-in workflow independently.
            </div>
            <div className="border-l-2 border-emerald-300 bg-white/[0.04] px-4 py-3">
              Every submission stores the selected message types, exact consent language, timestamp, source page, IP address, and browser user agent.
            </div>
            <div className="border-l-2 border-amber-300 bg-white/[0.04] px-4 py-3">
              Contacts can unsubscribe anytime by replying STOP to a text message.
            </div>
          </div>
        </section>

        <section className="grid gap-3">
          {SMS_OPT_IN_USE_CASES.map((useCase) => (
            <Link
              key={useCase.id}
              href={`/sms-opt-in/${useCase.slug}`}
              className="group rounded-md border border-white/10 bg-slate-950/80 p-5 shadow-2xl transition hover:border-cyan-300/60 hover:bg-cyan-950/30"
            >
              <span className="block text-xs font-black uppercase tracking-[0.14em] text-emerald-200">{useCase.endBusiness}</span>
              <span className="mt-2 flex items-center justify-between gap-4">
                <span>
                  <span className="block text-xl font-black uppercase tracking-tight text-white">{useCase.label}</span>
                  <span className="mt-1 block text-xs font-bold uppercase tracking-[0.12em] text-slate-400">{useCase.category}</span>
                </span>
                <ArrowRight className="h-5 w-5 shrink-0 text-cyan-300 transition group-hover:translate-x-1" />
              </span>
              <span className="mt-3 block text-sm leading-6 text-slate-300">{useCase.description}</span>
            </Link>
          ))}
        </section>
      </div>
    </main>
  );
}
