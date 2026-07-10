import Link from 'next/link';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import {
  ArrowRight,
  ArrowLeft,
  BedDouble,
  Bot,
  Building2,
  Home,
  Mail,
  MapPin,
  Phone,
  Ruler,
  Search,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { hasUsableRemoteListingImage, type Listing } from '@/lib/data/listingContract';
import { getListingById } from '@/lib/data/listingRepository';
import { getAgentTenantSite } from '@/lib/sites/siteData';

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
      description: 'A living atlas for real estate intelligence, place memory, and market context.',
    };
  }

  const tenantSite = await getAgentTenantSite(params.site, { limit: 3 });
  const pathSegments = params.path || [];

  if (pathSegments[0] === 'properties' && pathSegments[1]) {
    const listing = await getListingById(decodeURIComponent(pathSegments[1]));

    if (listing && hasUsableRemoteListingImage(listing)) {
      const location = [listing.location.city, listing.location.state].filter(Boolean).join(', ');

      return {
        title: `${listing.name} | ${tenantSite.siteName}`,
        description: listing.description || `${formatPrice(listing.price || listing.list_price)} listing in ${location || 'Texas'}.`,
        openGraph: {
          title: `${listing.name} | ${tenantSite.siteName}`,
          description: listing.description || tenantSite.subtitle,
          images: listing.image_url ? [listing.image_url] : listing.images.slice(0, 1),
          type: 'website',
        },
      };
    }
  }

  return {
    title: `${tenantSite.siteName} | Powered by Sunset Pulse`,
    description: tenantSite.subtitle,
    openGraph: {
      title: tenantSite.siteName,
      description: tenantSite.subtitle,
      type: 'website',
    },
  };
}

export default async function TenantSitePage({ params }: TenantPageProps) {
  const headerStore = await headers();
  const routedTenant = headerStore.get('x-sunset-tenant');

  if (routedTenant !== params.site) {
    notFound();
  }

  const tenantSite = await getAgentTenantSite(params.site, { limit: 6 });
  const pathSegments = params.path || [];
  const sections = new Set(
    tenantSite.sections
      .filter((section) => section.visible !== false)
      .map((section) => section.type),
  );

  if (pathSegments.length > 0) {
    if (pathSegments[0] === 'properties' && pathSegments[1]) {
      const listing = await getListingById(decodeURIComponent(pathSegments[1]));

      if (!listing || !hasUsableRemoteListingImage(listing)) {
        notFound();
      }

      return (
        <main className="min-h-screen bg-[#061017] text-white" style={{ fontFamily: tenantSite.fontFamily }}>
          <AgentSiteHeader site={tenantSite} />
          <AgentListingDetail site={tenantSite} listing={listing} />
          <AgentSiteFooter site={tenantSite} />
        </main>
      );
    }

    notFound();
  }

  return (
    <main className="min-h-screen bg-[#061017] text-white" style={{ fontFamily: tenantSite.fontFamily }}>
      <AgentSiteHeader site={tenantSite} />

      {sections.has('hero') && (
        <AgentHero site={tenantSite} />
      )}

      {sections.has('featured_listings') && (
        <FeaturedListings site={tenantSite} />
      )}

      {sections.has('about_agent') && (
        <AboutAgent site={tenantSite} />
      )}

      {sections.has('contact') && (
        <ContactAgent site={tenantSite} />
      )}

      <AgentSiteFooter site={tenantSite} />
    </main>
  );
}

function AgentSiteHeader({ site }: { site: Awaited<ReturnType<typeof getAgentTenantSite>> }) {
  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-[#061017]/88 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex min-w-0 items-center gap-3">
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/10"
            style={{ color: site.primaryColor }}
            aria-hidden="true"
          >
            <Home size={20} />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-black tracking-tight sm:text-base">{site.siteName}</span>
            <span className="block text-[10px] font-black uppercase tracking-[0.22em] text-cyan-100/55">Powered by Sunset Pulse</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-cyan-50/70 md:flex">
          <a href="#featured" className="rounded-full px-3 py-2 transition hover:bg-white/10 hover:text-white">Homes</a>
          <a href="#about" className="rounded-full px-3 py-2 transition hover:bg-white/10 hover:text-white">Agent</a>
          <a href="#contact" className="rounded-full px-3 py-2 transition hover:bg-white/10 hover:text-white">Contact</a>
        </nav>
      </div>
    </header>
  );
}

function AgentHero({ site }: { site: Awaited<ReturnType<typeof getAgentTenantSite>> }) {
  const marketLabel = site.agentProfile.markets.join(' • ') || 'Local market';

  return (
    <section className="relative overflow-hidden border-b border-white/10">
      <div
        className="absolute inset-0 opacity-25"
        style={{
          background: `radial-gradient(circle at 20% 10%, ${site.primaryColor}66, transparent 32%), radial-gradient(circle at 80% 0%, rgba(45,212,191,0.26), transparent 30%)`,
        }}
      />
      <div className="relative mx-auto grid min-h-[680px] max-w-7xl items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[minmax(0,1fr)_420px] lg:px-8">
        <div>
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-2 text-[11px] font-black uppercase tracking-[0.2em] text-cyan-50">
            <MapPin size={14} style={{ color: site.primaryColor }} />
            {marketLabel}
          </div>

          <h1 className="max-w-4xl text-balance text-5xl font-black leading-[0.92] tracking-tight sm:text-7xl lg:text-8xl">
            {site.title}
          </h1>

          <p className="mt-7 max-w-2xl text-lg leading-8 text-cyan-50/78 sm:text-xl">
            {site.subtitle}
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <a
              href="#featured"
              className="inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-4 text-sm font-black uppercase tracking-[0.16em] text-slate-950 transition hover:-translate-y-0.5"
              style={{ backgroundColor: site.primaryColor }}
            >
              View Featured Homes
              <ArrowRight size={17} />
            </a>
            <a
              href="#contact"
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-5 py-4 text-sm font-black uppercase tracking-[0.16em] text-white transition hover:bg-white/15"
            >
              Ask {site.assistantProfile.displayName}
              <Bot size={17} />
            </a>
          </div>
        </div>

        <aside className="rounded-[2rem] border border-white/10 bg-slate-950/72 p-5 shadow-2xl shadow-black/30 backdrop-blur-2xl">
          <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5">
            <div className="flex items-start gap-4">
              <AgentAvatar site={site} size="lg" />
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-100/50">Your local agent</p>
                <h2 className="mt-2 text-2xl font-black">{site.agentProfile.displayName}</h2>
                <p className="mt-1 text-sm font-bold text-cyan-50/65">{site.agentProfile.brokerageName}</p>
              </div>
            </div>

            <div className="mt-6 grid gap-3">
              <SignalRow icon={<Building2 size={18} />} label="Brokerage" value={site.agentProfile.brokerageName} color={site.primaryColor} />
              <SignalRow icon={<Sparkles size={18} />} label="Assistant" value={site.assistantProfile.displayName} color={site.primaryColor} />
              <SignalRow icon={<Search size={18} />} label="Featured homes" value={`${site.featuredListings.length} image-backed MLS picks`} color={site.primaryColor} />
              <SignalRow icon={<ShieldCheck size={18} />} label="MLS provider" value={site.integrationProfile.mlsProvider || 'MLS'} color={site.primaryColor} />
            </div>

            <div className="mt-6 rounded-2xl border border-white/10 bg-slate-900/80 p-4">
              <p className="text-xs leading-6 text-slate-300">
                This is a focused public agent site. No internal lab tools, no dev controls — just listings, local trust, and a clean lead path.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}

function FeaturedListings({ site }: { site: Awaited<ReturnType<typeof getAgentTenantSite>> }) {
  return (
    <section id="featured" className="border-b border-white/10 px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-cyan-100/50">Featured MLS picks</p>
            <h2 className="mt-3 text-4xl font-black tracking-tight text-white">Homes worth touring</h2>
          </div>
          <p className="max-w-xl text-sm leading-6 text-slate-400">
            Listings here are filtered to active MLS records with usable remote images so the agent site never opens with empty dummy cards.
          </p>
        </div>

        {site.featuredListings.length > 0 ? (
          <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {site.featuredListings.map((listing) => (
              <AgentListingCard key={listing.id} listing={listing} color={site.primaryColor} />
            ))}
          </div>
        ) : (
          <div className="mt-8 rounded-[2rem] border border-dashed border-white/15 bg-white/[0.04] p-8 text-center">
            <p className="text-lg font-black text-white">Featured homes are being prepared.</p>
            <p className="mt-2 text-sm text-slate-400">Add MLS IDs to this agent profile to publish image-backed listings here.</p>
          </div>
        )}
      </div>
    </section>
  );
}

function AgentListingCard({ listing, color }: { listing: Listing; color: string }) {
  const image = listing.image_url || listing.images[0];
  const location = [listing.location.city, listing.location.state].filter(Boolean).join(', ');
  const detailHref = `/properties/${encodeURIComponent(listing.mls_id || listing.id)}`;

  return (
    <article className="overflow-hidden rounded-[1.75rem] border border-white/10 bg-slate-950/72 shadow-2xl shadow-black/20">
      <a href={detailHref} className="group block">
        <div className="aspect-[4/3] overflow-hidden bg-slate-900">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={image}
            alt={listing.name}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
            loading="lazy"
          />
        </div>
        <div className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h3 className="truncate text-lg font-black text-white">{listing.name}</h3>
              <p className="mt-1 flex items-center gap-1 text-xs font-bold uppercase tracking-[0.12em] text-cyan-100/55">
                <MapPin size={13} /> {location || 'Texas'}
              </p>
            </div>
            <span className="shrink-0 rounded-full px-3 py-1 text-xs font-black text-slate-950" style={{ backgroundColor: color }}>
              MLS
            </span>
          </div>

          <p className="mt-4 text-2xl font-black text-white">{formatPrice(listing.price || listing.list_price)}</p>

          <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold text-slate-300">
            {listing.beds ? <ListingPill icon={<BedDouble size={14} />} value={`${listing.beds} beds`} /> : null}
            {listing.baths ? <ListingPill icon={<Home size={14} />} value={`${listing.baths} baths`} /> : null}
            {listing.square_feet ? <ListingPill icon={<Ruler size={14} />} value={`${listing.square_feet.toLocaleString()} sqft`} /> : null}
          </div>
        </div>
      </a>
    </article>
  );
}

function AgentListingDetail({ site, listing }: { site: Awaited<ReturnType<typeof getAgentTenantSite>>; listing: Listing }) {
  const images = listing.images.length ? listing.images : [listing.image_url].filter(Boolean) as string[];
  const heroImage = images[0];
  const location = [
    listing.location.street,
    listing.location.city,
    listing.location.state,
    listing.location.zipcode,
  ].filter(Boolean).join(', ');
  const email = site.integrationProfile.leadEmail || site.agentProfile.email;
  const subject = encodeURIComponent(`Question about ${listing.name}`);
  const body = encodeURIComponent(`Hi ${site.agentProfile.displayName},\n\nI would like more information about ${listing.name}${listing.mls_id ? ` (MLS ${listing.mls_id})` : ''}.\n\n`);

  return (
    <article>
      <section className="border-b border-white/10 px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <Link href="/" className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-cyan-50/75 transition hover:bg-white/10 hover:text-white">
            <ArrowLeft size={14} />
            Back to {site.siteName}
          </Link>

          <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_390px]">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-cyan-100/50">
                {listing.source} listing {listing.mls_id ? `• MLS ${listing.mls_id}` : ''}
              </p>
              <h1 className="mt-3 text-balance text-4xl font-black leading-[0.95] tracking-tight text-white sm:text-6xl">
                {listing.name}
              </h1>
              <p className="mt-4 flex items-center gap-2 text-sm font-bold uppercase tracking-[0.12em] text-cyan-50/60">
                <MapPin size={16} style={{ color: site.primaryColor }} />
                {location || 'Texas'}
              </p>
            </div>

            <aside className="rounded-[2rem] border border-white/10 bg-white/[0.045] p-5">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-100/50">Listing price</p>
              <p className="mt-2 text-4xl font-black text-white">{formatPrice(listing.price || listing.list_price)}</p>
              <div className="mt-5 grid grid-cols-3 gap-2">
                <StatBox label="Beds" value={listing.beds || '—'} />
                <StatBox label="Baths" value={listing.baths || '—'} />
                <StatBox label="Sqft" value={listing.square_feet ? listing.square_feet.toLocaleString() : '—'} />
              </div>
              <div className="mt-5 grid gap-2">
                {email ? (
                  <a
                    href={`mailto:${email}?subject=${subject}&body=${body}`}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-4 text-sm font-black uppercase tracking-[0.14em] text-slate-950 transition hover:-translate-y-0.5"
                    style={{ backgroundColor: site.primaryColor }}
                  >
                    <Mail size={17} />
                    Ask {site.agentProfile.displayName}
                  </a>
                ) : null}
                {site.agentProfile.phone ? (
                  <a
                    href={`tel:${site.agentProfile.phone}`}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-5 py-4 text-sm font-black uppercase tracking-[0.14em] text-white transition hover:bg-white/15"
                  >
                    <Phone size={17} />
                    Call Agent
                  </a>
                ) : null}
              </div>
            </aside>
          </div>
        </div>
      </section>

      <section className="border-b border-white/10 px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
            <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-slate-900">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={heroImage} alt={listing.name} className="h-full max-h-[680px] w-full object-cover" />
            </div>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-1">
              {images.slice(1, 5).map((image, index) => (
                <div key={image} className="overflow-hidden rounded-3xl border border-white/10 bg-slate-900">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={image} alt={`${listing.name} photo ${index + 2}`} className="h-full min-h-32 w-full object-cover" loading="lazy" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 md:p-8">
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-cyan-100/50">Property notes</p>
            <p className="mt-4 whitespace-pre-line text-base leading-8 text-slate-300">
              {listing.description || 'Property details are available through the listing agent.'}
            </p>

            {listing.amenities.length > 0 ? (
              <div className="mt-8">
                <h2 className="text-xl font-black text-white">Highlights</h2>
                <div className="mt-4 flex flex-wrap gap-2">
                  {listing.amenities.slice(0, 18).map((amenity) => (
                    <span key={amenity} className="rounded-full border border-white/10 bg-white/[0.055] px-3 py-1.5 text-xs font-bold text-cyan-50/80">
                      {amenity}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <aside className="rounded-[2rem] border border-white/10 bg-slate-950/65 p-6">
            <div className="flex items-start gap-4">
              <AgentAvatar site={site} size="lg" />
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-100/50">Represented by</p>
                <h2 className="mt-2 text-2xl font-black text-white">{site.agentProfile.displayName}</h2>
                <p className="mt-1 text-sm font-bold text-cyan-50/60">{site.agentProfile.brokerageName}</p>
              </div>
            </div>
            <p className="mt-5 text-sm leading-7 text-slate-300">
              Ask {site.assistantProfile.displayName} for context, then connect directly with {site.agentProfile.displayName} for showing details, offer strategy, and local guidance.
            </p>
            <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-xs leading-6 text-slate-400">
              {site.complianceProfile.mlsDisclaimer}
            </div>
          </aside>
        </div>
      </section>
    </article>
  );
}

function AboutAgent({ site }: { site: Awaited<ReturnType<typeof getAgentTenantSite>> }) {
  return (
    <section id="about" className="border-b border-white/10 px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[380px_minmax(0,1fr)]">
        <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
          <AgentAvatar site={site} size="xl" />
          <h2 className="mt-5 text-3xl font-black">{site.agentProfile.displayName}</h2>
          <p className="mt-2 text-sm font-bold text-cyan-50/65">{site.agentProfile.brokerageName}</p>
          {site.agentProfile.licenseNumber ? (
            <p className="mt-2 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">License {site.agentProfile.licenseNumber}</p>
          ) : null}
        </div>

        <div className="flex flex-col justify-center rounded-[2rem] border border-white/10 bg-slate-950/55 p-8">
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-cyan-100/50">Local representation</p>
          <h2 className="mt-3 text-4xl font-black tracking-tight text-white">A simpler path from search to showing.</h2>
          <p className="mt-5 max-w-3xl text-base leading-8 text-slate-300">
            {site.agentProfile.displayName} helps buyers and sellers move from online discovery to real decisions with focused listing picks,
            fast follow-up, and local market context across {site.agentProfile.markets.join(', ') || 'the local market'}.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            {site.agentProfile.markets.map((market) => (
              <span key={market} className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-xs font-black uppercase tracking-[0.12em] text-cyan-50/75">
                {market}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function ContactAgent({ site }: { site: Awaited<ReturnType<typeof getAgentTenantSite>> }) {
  const email = site.integrationProfile.leadEmail || site.agentProfile.email;
  const subject = encodeURIComponent(`Question from ${site.siteName}`);
  const body = encodeURIComponent(`Hi ${site.agentProfile.displayName},\n\nI would like help with a property search.\n\n`);

  return (
    <section id="contact" className="px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-8 rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 md:grid-cols-[minmax(0,1fr)_360px] md:p-8">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-cyan-100/50">Ready when you are</p>
          <h2 className="mt-3 text-4xl font-black tracking-tight text-white">Ask {site.assistantProfile.displayName}, then talk to {site.agentProfile.displayName}.</h2>
          <p className="mt-4 max-w-2xl text-base leading-8 text-slate-300">
            Start with a quick message and the lead path routes back to the right agent profile — no Taz-specific inboxes or brokerage copy required.
          </p>
        </div>

        <div className="grid gap-3">
          {email ? (
            <a
              href={`mailto:${email}?subject=${subject}&body=${body}`}
              className="inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-4 text-sm font-black uppercase tracking-[0.14em] text-slate-950 transition hover:-translate-y-0.5"
              style={{ backgroundColor: site.primaryColor }}
            >
              <Mail size={17} />
              Email Agent
            </a>
          ) : null}
          {site.agentProfile.phone ? (
            <a
              href={`tel:${site.agentProfile.phone}`}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-5 py-4 text-sm font-black uppercase tracking-[0.14em] text-white transition hover:bg-white/15"
            >
              <Phone size={17} />
              Call Agent
            </a>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function AgentSiteFooter({ site }: { site: Awaited<ReturnType<typeof getAgentTenantSite>> }) {
  return (
    <footer className="border-t border-white/10 px-4 py-8 text-xs text-slate-500 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="font-black text-slate-300">{site.siteName}</p>
          <p className="mt-1">{site.agentProfile.brokerageName} · {site.complianceProfile.jurisdiction}</p>
        </div>
        <div className="max-w-2xl md:text-right">
          <p>{site.complianceProfile.footerDisclaimer}</p>
          <p className="mt-1 font-bold text-cyan-100/50">Powered by Sunset Pulse</p>
        </div>
      </div>
    </footer>
  );
}

function AgentAvatar({ site, size }: { site: Awaited<ReturnType<typeof getAgentTenantSite>>; size: 'lg' | 'xl' }) {
  const dimensionClass = size === 'xl' ? 'h-28 w-28 text-4xl' : 'h-16 w-16 text-2xl';
  const initials = site.agentProfile.displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'A';

  if (site.agentProfile.headshotUrl) {
    return (
      <div className={`${dimensionClass} overflow-hidden rounded-3xl border border-white/15 bg-white/10`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={site.agentProfile.headshotUrl} alt={site.agentProfile.displayName} className="h-full w-full object-cover" />
      </div>
    );
  }

  return (
    <div
      className={`${dimensionClass} flex items-center justify-center rounded-3xl border border-white/15 font-black text-slate-950`}
      style={{ backgroundColor: site.primaryColor }}
    >
      {initials}
    </div>
  );
}

function SignalRow({ icon, label, value, color }: { icon: ReactNode; label: string; value: string; color: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.055] p-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10" style={{ color }}>
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-[10px] font-black uppercase tracking-[0.2em] text-cyan-100/50">{label}</span>
        <span className="block truncate text-sm font-bold text-cyan-50">{value}</span>
      </span>
    </div>
  );
}

function ListingPill({ icon, value }: { icon: ReactNode; value: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.055] px-3 py-1.5">
      {icon}
      {value}
    </span>
  );
}

function StatBox({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/55 p-3 text-center">
      <p className="text-lg font-black text-white">{value}</p>
      <p className="mt-1 text-[9px] font-black uppercase tracking-[0.16em] text-cyan-100/45">{label}</p>
    </div>
  );
}

function formatPrice(price?: number | null) {
  if (!price) return 'Price on request';
  return `$${price.toLocaleString()}`;
}
