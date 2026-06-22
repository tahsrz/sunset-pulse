import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import SmsOptInForm from '@/components/SmsOptInForm';
import {
  SMS_OPT_IN_USE_CASES,
  getSmsOptInUseCaseBySlug,
} from '@/lib/sms/consent';

type SmsOptInUseCasePageProps = {
  params: {
    slug: string;
  };
};

export function generateStaticParams() {
  return SMS_OPT_IN_USE_CASES.map((useCase) => ({ slug: useCase.slug }));
}

export function generateMetadata({ params }: SmsOptInUseCasePageProps) {
  const useCase = getSmsOptInUseCaseBySlug(params.slug);

  if (!useCase) {
    return {
      title: 'SMS Opt-In Not Found',
    };
  }

  return {
    title: `${useCase.endBusiness} ${useCase.label} SMS Opt-In`,
    description: `Opt in to ${useCase.label.toLowerCase()} text messages from ${useCase.endBusiness}.`,
  };
}

export default function SmsOptInUseCasePage({ params }: SmsOptInUseCasePageProps) {
  const useCase = getSmsOptInUseCaseBySlug(params.slug);

  if (!useCase) notFound();

  const pagePath = `/sms-opt-in/${useCase.slug}`;

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-24 text-white">
      <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
        <section className="pt-2">
          <Link
            href="/sms-opt-in"
            className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-cyan-300 transition hover:text-cyan-100"
          >
            <ArrowLeft className="h-4 w-4" />
            All SMS Opt-Ins
          </Link>
          <p className="mt-6 text-xs font-black uppercase tracking-[0.22em] text-emerald-200">{useCase.endBusiness}</p>
          <h1 className="mt-4 text-4xl font-black uppercase tracking-tight text-white sm:text-5xl">
            {useCase.label} SMS Opt-In
          </h1>
          <p className="mt-5 text-base leading-7 text-slate-300">
            This page records consent only for {useCase.label.toLowerCase()} text messages from {useCase.endBusiness}.
          </p>

          <div className="mt-8 grid gap-3 text-sm leading-6 text-slate-300">
            <div className="border-l-2 border-cyan-300 bg-white/[0.04] px-4 py-3">
              Message type: {useCase.category}
            </div>
            <div className="border-l-2 border-emerald-300 bg-white/[0.04] px-4 py-3">
              {useCase.description}
            </div>
            <div className="border-l-2 border-amber-300 bg-white/[0.04] px-4 py-3">
              Contacts can unsubscribe anytime by replying STOP to a text message.
            </div>
          </div>
        </section>

        <SmsOptInForm
          useCaseId={useCase.id}
          pagePath={pagePath}
          source={`sms-opt-in-${useCase.slug}-webform`}
        />
      </div>
    </main>
  );
}
