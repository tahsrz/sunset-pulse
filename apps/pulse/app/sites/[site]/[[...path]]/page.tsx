import Link from 'next/link';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { ArrowRight, Building2, Globe2, MapPin, Radar, ShieldCheck, Sparkles } from 'lucide-react';
import AtlasGlobeBackground from '@/components/atlas/AtlasGlobeBackground';
import { getTenantSite } from '@/lib/sites/siteData';

type TenantPageProps = {
  params: {
    site: string;
    path?: string[];
  };
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function generateMetadata({ params }: TenantPageProps) {
  const headerStore = await headers();
  const routedTenant = headerStore.get('x-sunset-tenant');

  if (routedTenant !== params.site) {
    return {
      title: 'Sunset Pulse',
      description: 'A living atlas for North Texas real estate intelligence, place memory, and market context.',
    };
  }

  const tenantSite = await getTenantSite(params.site);

  return {
    title: `${tenantSite.siteName} | Sunset Pulse`,
    description: tenantSite.subtitle,
  };
}

export default async function TenantSitePage({ params }: TenantPageProps) {
  const headerStore = await headers();
  const routedTenant = headerStore.get('x-sunset-tenant');

  if (routedTenant !== params.site) {
    notFound();
  }

  const tenantSite = await getTenantSite(params.site);
  const routeLabel = params.path?.length ? `/${params.path.join('/')}` : '/';
  const centralDomain = process.env.NEXT_PUBLIC_DOMAIN || 'https://sunsetpulse.app';

  return (
    <main className="min-h-screen bg-[#061017] text-white" style={{ fontFamily: tenantSite.fontFamily }}>
      <section className="relative min-h-screen overflow-hidden">
        <AtlasGlobeBackground />

        <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">
          <header className="flex items-center justify-between gap-4">
            <Link href="/" className="flex min-w-0 items-center gap-3">
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-white/20 bg-white/10 shadow-[0_0_34px_rgba(34,211,238,0.24)] backdrop-blur"
                style={{ color: tenantSite.primaryColor }}
                aria-hidden="true"
              >
                <Globe2 size={20} />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-base font-black tracking-tight sm:text-lg">{tenantSite.siteName}</span>
                <span className="block text-[10px] font-black uppercase tracking-[0.24em] text-cyan-100/60">Powered by Sunset Pulse</span>
              </span>
            </Link>

            <nav className="hidden items-center gap-2 md:flex" aria-label={`${tenantSite.siteName} navigation`}>
              <TenantNavLink href="/" label="Pulse" active={routeLabel === '/'} />
              <TenantNavLink href="/idx" label="IDX" active={routeLabel === '/idx'} />
              <TenantNavLink href="/atlas" label="Atlas" active={routeLabel === '/atlas'} />
            </nav>
          </header>

          <div className="grid flex-1 items-center gap-10 py-16 lg:grid-cols-[minmax(0,1fr)_380px] lg:py-20">
            <div className="max-w-3xl">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-2 text-[11px] font-black uppercase tracking-[0.24em] text-cyan-50 backdrop-blur">
                <Radar size={14} style={{ color: tenantSite.primaryColor }} />
                {tenantSite.site}.sunsetpulse.app
              </div>

              <h1 className="text-balance text-5xl font-black leading-[0.92] tracking-tight sm:text-7xl lg:text-8xl">
                {tenantSite.title}
              </h1>

              <p className="mt-7 max-w-2xl text-lg leading-8 text-cyan-50/80 sm:text-xl">
                {tenantSite.subtitle}
              </p>

              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/idx"
                  className="inline-flex items-center justify-center gap-2 rounded-md px-5 py-3 text-sm font-black uppercase tracking-[0.18em] text-slate-950 transition hover:-translate-y-0.5"
                  style={{ backgroundColor: tenantSite.primaryColor }}
                >
                  Explore IDX
                  <ArrowRight size={17} />
                </Link>
                <Link
                  href={`${centralDomain}/premium`}
                  className="inline-flex items-center justify-center gap-2 rounded-md border border-white/20 bg-white/10 px-5 py-3 text-sm font-black uppercase tracking-[0.18em] text-white backdrop-blur transition hover:bg-white/20"
                >
                  Get Your Site
                </Link>
              </div>
            </div>

            <aside className="rounded-lg border border-white/10 bg-[#061017]/80 p-5 shadow-2xl shadow-black/30 backdrop-blur-2xl">
              <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-100/50">Site Signal</p>
                  <h2 className="mt-1 text-xl font-black">Live agent portal</h2>
                </div>
                <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-black uppercase text-emerald-200">
                  {tenantSite.status}
                </span>
              </div>

              <div className="mt-5 grid gap-3">
                <SignalRow icon={<Building2 size={18} />} label="Brand" value={tenantSite.siteName} color={tenantSite.primaryColor} />
                <SignalRow icon={<MapPin size={18} />} label="Coverage" value="North Texas market memory" color={tenantSite.primaryColor} />
                <SignalRow icon={<Sparkles size={18} />} label="Agent" value="Jamie-assisted intelligence" color={tenantSite.primaryColor} />
                <SignalRow icon={<ShieldCheck size={18} />} label="Route" value={routeLabel} color={tenantSite.primaryColor} />
              </div>
            </aside>
          </div>
        </div>
      </section>
    </main>
  );
}

function TenantNavLink({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={`rounded-full px-4 py-2 text-sm font-black transition ${
        active ? 'bg-white text-slate-950' : 'border border-white/10 bg-white/[0.06] text-cyan-50/80 hover:bg-white/10 hover:text-white'
      }`}
    >
      {label}
    </Link>
  );
}

function SignalRow({ icon, label, value, color }: { icon: ReactNode; label: string; value: string; color: string }) {
  return (
    <div className="flex items-center gap-3 rounded-md border border-white/10 bg-white/[0.055] p-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-white/10" style={{ color }}>
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-[10px] font-black uppercase tracking-[0.2em] text-cyan-100/50">{label}</span>
        <span className="block truncate text-sm font-bold text-cyan-50">{value}</span>
      </span>
    </div>
  );
}
