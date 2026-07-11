import Link from 'next/link';
import {
  FaArrowRight,
  FaClipboardList,
  FaMapMarkedAlt,
  FaMapMarkerAlt,
  FaRoute,
} from 'react-icons/fa';
import SafePropertyImage from '@/components/SafePropertyImage';
import { getTourHotList } from '@/lib/data/tourHotList';
import { buildGoogleMapsRouteUrl, buildTourStudioStops } from '@/lib/tourStudio';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Tour Studio | Sunset Pulse',
  description: 'A buyer-facing route plan built from the saved Sunset Pulse MLS hot list.',
};

export default async function TourStudioPage() {
  const hotList = await getTourHotList({ limit: 10 });
  const stops = buildTourStudioStops(hotList.listings);
  const routeUrl = buildGoogleMapsRouteUrl(stops);

  return (
    <main className="min-h-screen bg-[#07131f] text-white">
      <section className="border-b border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(20,184,166,0.18),transparent_35%),linear-gradient(180deg,#0a1c2d_0%,#07131f_100%)]">
        <div className="container-xl mx-auto px-4 py-14">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-teal-300/20 bg-teal-300/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.35em] text-teal-100">
            <FaRoute className="text-teal-300" />
            Tour Studio
          </div>

          <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
            <div>
              <h1 className="waterlily-heading max-w-4xl text-4xl font-black uppercase italic tracking-tighter text-white md:text-6xl">
                MLS hot list, ready to tour.
              </h1>
              <p className="mt-5 max-w-2xl text-sm leading-7 text-slate-300 md:text-base">
                This page turns the saved operator hot list into a buyer-facing route plan. It only uses listings
                that already passed the MLS, active-status, and remote-image filters.
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-2xl">
              <div className="grid grid-cols-3 gap-3 text-center">
                <Metric label="Stops" value={String(stops.length)} />
                <Metric label="Unresolved" value={String(hotList.unresolved.length)} />
                <Metric label="Skipped" value={String(hotList.skipped.length)} />
              </div>
              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                {routeUrl && (
                  <a
                    href={routeUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="waterlily-button flex flex-1 items-center justify-center gap-2 rounded-full px-5 py-3 text-[10px] font-black uppercase tracking-widest text-white"
                  >
                    <FaMapMarkedAlt />
                    Open Route
                  </a>
                )}
                <Link
                  href="/admin/hot-list"
                  className="flex flex-1 items-center justify-center gap-2 rounded-full border border-white/15 px-5 py-3 text-[10px] font-black uppercase tracking-widest text-slate-200 transition hover:border-teal-300/50 hover:bg-teal-300/10"
                >
                  <FaClipboardList />
                  Edit Source
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="container-xl mx-auto px-4 py-12">
        {stops.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid gap-5">
            {stops.map((stop) => (
              <article
                key={stop.listingId}
                className="waterlily-card grid overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] md:grid-cols-[280px_1fr]"
              >
                <div className="relative min-h-[220px] overflow-hidden">
                  <SafePropertyImage
                    src={stop.imageUrl}
                    alt={`${stop.title} MLS listing photo`}
                    fill
                    sizes="(min-width: 768px) 280px, 100vw"
                    className="object-cover transition duration-700 hover:scale-105"
                  />
                  <div className="absolute left-4 top-4 rounded-full bg-[#07131f]/90 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-teal-100">
                    Stop {stop.stopNumber}
                  </div>
                </div>

                <div className="flex flex-col gap-5 p-6">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="mb-2 text-[9px] font-black uppercase tracking-[0.3em] text-teal-200/70">
                        {stop.mlsId ? `MLS ${stop.mlsId}` : 'MLS listing'}
                      </div>
                      <h2 className="text-2xl font-black uppercase tracking-tight text-white">{stop.title}</h2>
                      <div className="mt-3 flex items-start gap-2 text-sm font-bold uppercase tracking-wide text-slate-300">
                        <FaMapMarkerAlt className="mt-1 shrink-0 text-rose-300" />
                        <span>
                          {stop.addressLine}
                          {stop.cityLine && <span className="block text-slate-400">{stop.cityLine}</span>}
                        </span>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-amber-200/15 bg-amber-200/10 px-5 py-3 text-right">
                      <div className="text-[8px] font-black uppercase tracking-[0.3em] text-amber-100/60">
                        List Price
                      </div>
                      <div className="text-2xl font-black text-amber-100">{stop.priceLabel}</div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {stop.specs.map((spec) => (
                      <span
                        key={spec}
                        className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-bold uppercase tracking-widest text-slate-200"
                      >
                        {spec}
                      </span>
                    ))}
                  </div>

                  <div className="mt-auto flex flex-col gap-3 sm:flex-row">
                    <Link
                      href={stop.propertyHref}
                      className="waterlily-button inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-[10px] font-black uppercase tracking-widest text-white"
                    >
                      View Dossier
                      <FaArrowRight />
                    </Link>
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(stop.mapQuery)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 px-5 py-3 text-[10px] font-black uppercase tracking-widest text-slate-200 transition hover:border-teal-300/50 hover:bg-teal-300/10"
                    >
                      Open Map
                    </a>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <div className="text-2xl font-black text-white">{value}</div>
      <div className="mt-1 text-[8px] font-black uppercase tracking-[0.3em] text-slate-400">{label}</div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-3xl border border-dashed border-white/15 bg-white/[0.03] p-10 text-center">
      <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-teal-300/10 text-teal-200">
        <FaClipboardList />
      </div>
      <h2 className="text-2xl font-black uppercase tracking-tight text-white">No tour stops yet</h2>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-slate-300">
        Save at least one image-qualified MLS listing in the admin hot list, then this page becomes the buyer-facing
        route plan.
      </p>
      <Link
        href="/admin/hot-list"
        className="waterlily-button mt-6 inline-flex rounded-full px-6 py-3 text-[10px] font-black uppercase tracking-widest text-white"
      >
        Open Hot List Manager
      </Link>
    </div>
  );
}
