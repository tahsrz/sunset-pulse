const MATRIX_IDX_URL = 'https://ntrdd.mlsmatrix.com/Matrix/public/IDX.aspx?idx=22f244f9';

export default function IDXSearchPage() {
  return (
    <main className="min-h-screen bg-[#071b24] text-white">
      <section className="border-b border-white/10 bg-[#0c2130]/95">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-teal-200">
              NTREIS Matrix IDX
            </p>
            <h1 className="mt-2 text-3xl font-black uppercase tracking-tight md:text-4xl">
              Public Listing Search
            </h1>
          </div>
          <p className="max-w-xl text-sm leading-6 text-slate-300">
            Listings in this view are served directly through the authorized Matrix IDX frame.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-3 py-3 sm:px-6 sm:py-6">
        <div className="h-[calc(100vh-210px)] min-h-[720px] overflow-hidden border border-white/10 bg-white shadow-2xl">
          <iframe
            src={MATRIX_IDX_URL}
            title="NTREIS Matrix IDX listing search"
            className="h-full w-full"
            frameBorder="0"
            marginWidth={0}
            marginHeight={0}
          />
        </div>
      </section>
    </main>
  );
}
