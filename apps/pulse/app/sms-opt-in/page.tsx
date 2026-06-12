import SmsOptInForm from '@/components/SmsOptInForm';

export const metadata = {
  title: 'SMS Opt-In | Sunset Pulse',
  description: 'Opt in to Sunset Pulse SMS alerts for property updates, scheduling, order notices, and local offers.',
};

export default function SmsOptInPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-4 py-24 text-white">
      <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
        <section className="pt-2">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-300">Sunset Pulse Text Updates</p>
          <h1 className="mt-4 text-4xl font-black uppercase tracking-tight text-white sm:text-5xl">
            Opt In For SMS Alerts
          </h1>
          <p className="mt-5 text-base leading-7 text-slate-300">
            Use this form when someone wants to receive Sunset Pulse text messages. It records clear consent before any automated SMS outreach is sent through Twilio.
          </p>

          <div className="mt-8 grid gap-3 text-sm leading-6 text-slate-300">
            <div className="border-l-2 border-cyan-300 bg-white/[0.04] px-4 py-3">
              Property alerts, showing reminders, order updates, and local offers can be sent from the same consent record.
            </div>
            <div className="border-l-2 border-emerald-300 bg-white/[0.04] px-4 py-3">
              Every submission stores the exact consent language, timestamp, source page, IP address, and browser user agent.
            </div>
            <div className="border-l-2 border-amber-300 bg-white/[0.04] px-4 py-3">
              Contacts can unsubscribe anytime by replying STOP to a text message.
            </div>
          </div>
        </section>

        <SmsOptInForm />
      </div>
    </main>
  );
}
