const MATRIX_IDX_URL = 'https://ntrdd.mlsmatrix.com/Matrix/public/IDX.aspx?idx=22f244f9';

export default function IDXSearchPage() {
  return (
    <main className="min-h-screen bg-[#071b24] text-white">
      <section className="border-b border-white/10 bg-[radial-gradient(circle_at_20%_0%,rgba(56,189,248,0.18),transparent_32%),linear-gradient(135deg,#0c2130_0%,#11384a_48%,#122d34_100%)]">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-6 py-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-teal-200">
              NTREIS Matrix IDX
            </p>
            <h1 className="mt-2 text-3xl font-black uppercase tracking-tight md:text-4xl">
              Public Listing Search
            </h1>
            <div className="mt-4 flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-[0.22em]">
              <span className="rounded-md border border-teal-200/30 bg-teal-200/10 px-3 py-1 text-teal-100">
                Matrix-hosted
              </span>
              <span className="rounded-md border border-rose-200/30 bg-rose-200/10 px-3 py-1 text-rose-100">
                No local ingest
              </span>
            </div>
          </div>
          <div className="max-w-xl text-sm leading-6 text-slate-200">
            <p>
              Search runs inside the authorized NTREIS Matrix IDX frame. Sunset Pulse is
              not scraping or storing these listing results.
            </p>
            <a
              href={MATRIX_IDX_URL}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex rounded-md border border-teal-200/25 bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-teal-100 transition hover:bg-white/15"
            >
              Open in Matrix
            </a>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-3 py-3 sm:px-6 sm:py-6">
        <div className="h-[calc(100dvh-220px)] min-h-[680px] overflow-hidden rounded-lg border border-teal-100/20 bg-white shadow-2xl shadow-cyan-950/40">
          <iframe
            src={MATRIX_IDX_URL}
            title="NTREIS Matrix IDX listing search"
            className="h-full w-full"
            frameBorder="0"
            marginWidth={0}
            marginHeight={0}
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      </section>
    </main>
  );
}
