import Link from 'next/link';

const GlobalMarketPulse = () => (
  <div className="w-full border-b border-cyan-100/10 bg-[#06131d]/92 text-white backdrop-blur-xl">
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="flex min-h-10 items-center gap-3 py-2 text-[11px] font-semibold uppercase">
        <span className="text-slate-400">Explore North Texas</span>
        <Link
          href="/explorer"
          className="text-cyan-200 transition-colors hover:text-cyan-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
        >
          Open Explorer
        </Link>
      </div>
    </div>
  </div>
);

export default GlobalMarketPulse;
