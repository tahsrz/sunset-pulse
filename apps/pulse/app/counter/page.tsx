import Link from 'next/link';
import { Coffee, Fuel, MapPin, MessageSquare, QrCode, ReceiptText, ShoppingBasket, Sparkles, Utensils } from 'lucide-react';

const counterActions = [
  {
    label: 'Order Grill',
    href: '/grill',
    eyebrow: 'Hot food',
    detail: 'Burgers, baskets, pickup timing',
    accent: 'from-orange-300 to-red-500',
    icon: Utensils,
  },
  {
    label: 'Today Specials',
    href: '/grill#menu',
    eyebrow: 'Daily deal',
    detail: 'What is moving at the counter',
    accent: 'from-yellow-200 to-amber-500',
    icon: Sparkles,
  },
  {
    label: 'Receipt Help',
    href: '/cart',
    eyebrow: 'Checkout',
    detail: 'Review cart and pickup options',
    accent: 'from-cyan-200 to-blue-500',
    icon: ReceiptText,
  },
  {
    label: 'Local Pulse',
    href: '/sunset-chat',
    eyebrow: 'Community',
    detail: 'Post a note or see what is happening',
    accent: 'from-emerald-200 to-lime-500',
    icon: MessageSquare,
  },
  {
    label: 'Local Stories',
    href: '/news/tah',
    eyebrow: 'Pulse',
    detail: 'Local story and market signal',
    accent: 'from-teal-200 to-cyan-500',
    icon: MapPin,
  },
];

export default function CounterPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#160f0a] text-stone-50">
      <section className="relative isolate px-4 py-8 md:px-8">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_15%,rgba(245,158,11,0.26),transparent_32%),radial-gradient(circle_at_80%_0%,rgba(20,184,166,0.18),transparent_28%),linear-gradient(135deg,#160f0a_0%,#32190e_45%,#07131a_100%)]" />
        <div className="absolute inset-x-0 bottom-0 -z-10 h-48 bg-[linear-gradient(180deg,transparent,rgba(0,0,0,0.42))]" />

        <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="flex flex-col justify-between rounded-[2rem] border border-white/10 bg-black/25 p-6 shadow-2xl shadow-black/40 backdrop-blur">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-amber-200/30 bg-amber-200/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-amber-100">
                <QrCode size={14} />
                Sunset Counter
              </p>
              <h1 className="mt-5 max-w-xl text-4xl font-black uppercase leading-[0.92] tracking-tight text-white md:text-6xl">
                Scan the counter. Skip the friction.
              </h1>
              <p className="mt-5 max-w-lg text-sm leading-7 text-stone-300">
                A digital replica of the front counter for grill orders, specials, pickup help, and local updates. This is the page a printed counter QR should open.
              </p>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              <CounterMetric label="Fastest Path" value="Order" />
              <CounterMetric label="Best Use" value="QR Sign" />
              <CounterMetric label="Location" value="Counter" />
            </div>
          </div>

          <CounterReplica />
        </div>
      </section>

      <section className="px-4 pb-10 md:px-8">
        <div className="mx-auto grid max-w-7xl gap-4 md:grid-cols-5">
          {counterActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.label}
                href={action.href}
                className="group overflow-hidden rounded-3xl border border-white/10 bg-white/[0.06] p-4 shadow-xl shadow-black/20 transition hover:-translate-y-1 hover:bg-white/[0.09]"
              >
                <div className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${action.accent} text-stone-950 shadow-lg`}>
                  <Icon size={24} />
                </div>
                <p className="mt-5 text-[10px] font-black uppercase tracking-[0.2em] text-stone-400">{action.eyebrow}</p>
                <h2 className="mt-1 text-xl font-black text-white">{action.label}</h2>
                <p className="mt-2 text-sm leading-6 text-stone-400">{action.detail}</p>
                <span className="mt-5 inline-flex text-[10px] font-black uppercase tracking-[0.18em] text-amber-100">
                  Open
                </span>
              </Link>
            );
          })}
        </div>
      </section>
    </main>
  );
}

function CounterReplica() {
  return (
    <div className="relative min-h-[620px] overflow-hidden rounded-[2rem] border border-amber-100/15 bg-[#2b170d] p-5 shadow-2xl shadow-black/50">
      <div className="absolute inset-x-0 top-0 h-24 bg-[linear-gradient(180deg,rgba(255,255,255,0.12),transparent)]" />

      <div className="relative grid h-full grid-rows-[auto_1fr_auto] gap-5">
        <div className="grid gap-4 md:grid-cols-[1fr_220px]">
          <div className="rounded-3xl border border-white/10 bg-[#120c08] p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-200">Register Screen</p>
                <h2 className="mt-1 text-2xl font-black text-white">Sunset Gas & Grill</h2>
              </div>
              <Fuel className="text-amber-200" />
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              <MiniScreen label="Coffee" value="$1.99" />
              <MiniScreen label="Burger" value="Ready" />
              <MiniScreen label="Fuel" value="Ask clerk" />
            </div>
          </div>

          <div className="rounded-3xl border border-emerald-200/20 bg-emerald-200/10 p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-100">Main QR</p>
            <div className="mt-3">
              <QrPlaceholder />
            </div>
            <p className="mt-3 text-xs font-bold leading-5 text-emerald-50">Print this block for the counter sign.</p>
          </div>
        </div>

        <div className="relative rounded-[2rem] border border-white/10 bg-[linear-gradient(135deg,#6b3f22,#241109_58%,#0f0704)] p-5">
          <div className="absolute inset-x-8 top-5 h-3 rounded-full bg-white/10" />
          <div className="mt-8 grid h-[340px] gap-4 md:grid-cols-[1.2fr_0.8fr]">
            <div className="grid gap-4">
              <Shelf title="Impulse Rack" items={['Candy', 'Jerky', 'Gum', 'Chips']} />
              <Shelf title="Hot Counter" items={['Burgers', 'Fries', 'Coffee', 'Pickup']} warm />
            </div>
            <div className="grid gap-4">
              <CounterSign title="Scan for grill" href="/grill" />
              <CounterSign title="Scan for chat" href="/sunset-chat" compact />
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <BottomTile icon={Coffee} label="Morning" value="Coffee and biscuit traffic" />
          <BottomTile icon={ShoppingBasket} label="Basket" value="Convenience add-ons" />
          <BottomTile icon={ReceiptText} label="Receipt" value="QR goes home with them" />
        </div>
      </div>
    </div>
  );
}

function QrPlaceholder() {
  const cells = [
    1, 1, 1, 0, 1, 0, 1, 1,
    1, 0, 1, 1, 0, 0, 0, 1,
    1, 1, 1, 0, 1, 1, 0, 1,
    0, 1, 0, 1, 1, 0, 1, 0,
    1, 0, 1, 1, 0, 1, 1, 1,
    0, 0, 1, 0, 1, 0, 0, 1,
    1, 1, 0, 1, 0, 1, 1, 0,
    1, 0, 1, 0, 1, 1, 0, 1,
  ];

  return (
    <div className="grid aspect-square w-full grid-cols-8 gap-1 rounded-2xl bg-white p-3">
      {cells.map((active, index) => (
        <span key={index} className={active ? 'rounded-sm bg-slate-950' : 'rounded-sm bg-white'} />
      ))}
    </div>
  );
}

function Shelf({ title, items, warm = false }: { title: string; items: string[]; warm?: boolean }) {
  return (
    <div className={`rounded-3xl border p-4 ${warm ? 'border-orange-300/20 bg-orange-300/10' : 'border-white/10 bg-black/20'}`}>
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400">{title}</p>
      <div className="mt-4 grid grid-cols-4 gap-2">
        {items.map((item) => (
          <div key={item} className="rounded-xl border border-white/10 bg-white/10 px-2 py-4 text-center text-[10px] font-black uppercase tracking-[0.1em] text-white">
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}

function CounterSign({ title, href, compact = false }: { title: string; href: string; compact?: boolean }) {
  return (
    <Link href={href} className="rounded-3xl border border-cyan-200/20 bg-cyan-200/10 p-4 transition hover:bg-cyan-200/15">
      <div className="flex items-center gap-3">
        <div className={compact ? 'w-16' : 'w-24'}>
          <QrPlaceholder />
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-100">{title}</p>
          <p className="mt-1 text-xs leading-5 text-cyan-50/75">Tap here online, scan on paper.</p>
        </div>
      </div>
    </Link>
  );
}

function CounterMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
      <p className="text-[9px] font-black uppercase tracking-[0.2em] text-stone-400">{label}</p>
      <p className="mt-1 text-lg font-black text-white">{value}</p>
    </div>
  );
}

function MiniScreen({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-lime-200/20 bg-lime-200/10 p-3">
      <p className="text-[9px] font-black uppercase tracking-[0.18em] text-lime-100/70">{label}</p>
      <p className="mt-1 text-sm font-black text-lime-50">{value}</p>
    </div>
  );
}

function BottomTile({ icon: Icon, label, value }: { icon: typeof Coffee; label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-black/20 p-4">
      <Icon className="text-amber-200" size={22} />
      <p className="mt-3 text-[10px] font-black uppercase tracking-[0.18em] text-stone-400">{label}</p>
      <p className="mt-1 text-sm font-bold text-white">{value}</p>
    </div>
  );
}
