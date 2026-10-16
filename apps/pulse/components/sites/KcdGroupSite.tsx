import Image from 'next/image';
import Link from 'next/link';
import KcdGroupAreaMap from '@/components/sites/KcdGroupAreaMap';

const businessAreas = ['Real estate', 'Development', 'Retail', 'Commercial', 'Gas stations'];

const projectFocus = [
  {
    number: '01',
    title: 'Mixed-use projects',
    detail: 'Neighborhood retail alongside residential and rental spaces.',
  },
  {
    number: '02',
    title: 'Commercial and retail',
    detail: 'Commercial spaces and retail properties across North Texas.',
  },
  {
    number: '03',
    title: 'Community investment',
    detail: 'Long-term property projects rooted in the places they serve.',
  },
];

export default function KcdGroupSite({ isDraft }: { isDraft: boolean }) {
  return (
    <main className="min-h-screen overflow-hidden bg-[#f5f1e8] text-[#241d15]">
      {isDraft ? (
        <div className="border-b border-[#decfae] bg-[#ede5d5] px-5 py-2 text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-[#725a2a]">
          Draft preview · Arlington Plaza details and property photos need confirmation
        </div>
      ) : null}

      <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-5 sm:px-8 lg:px-12">
        <Link href="#top" className="text-sm font-bold uppercase tracking-[0.12em] text-[#302519]" aria-label="KCD Group home">
          KCD Group <span className="font-normal text-[#8b713c]">of Companies</span>
        </Link>
        <nav aria-label="Main navigation" className="hidden items-center gap-8 text-sm text-[#574a38] md:flex">
          <Link className="transition hover:text-[#9b7628]" href="#project">Arlington Plaza</Link>
          <Link className="transition hover:text-[#9b7628]" href="#focus">Our focus</Link>
          <Link className="transition hover:text-[#9b7628]" href="#contact">Contact</Link>
        </nav>
        <Link href="#contact" className="rounded-full border border-[#b49456] px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-[#5e471d] transition hover:bg-[#e8dcc2]">
          Get in touch
        </Link>
      </header>

      <section id="top" className="mx-auto grid w-full max-w-7xl items-center gap-10 px-5 pb-16 pt-7 sm:px-8 md:pb-24 lg:grid-cols-[1fr_0.9fr] lg:gap-16 lg:px-12 lg:pt-12">
        <div className="max-w-2xl">
          <p className="mb-5 flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.22em] text-[#8d6b2b]">
            <span className="h-px w-8 bg-[#c9ab6d]" /> North Texas · Property and development
          </p>
          <h1 className="font-serif text-5xl leading-[1.03] tracking-[-0.04em] text-[#261e14] sm:text-6xl lg:text-7xl">
            Building today for a stronger tomorrow.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-[#625747]">
            KCD Group of Companies works across real estate, development, retail, commercial property, and gas stations.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="#project" className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#372b1b] px-6 text-sm font-semibold text-[#fffaf1] transition hover:bg-[#5b4728]">
              See Arlington Plaza <span aria-hidden="true" className="ml-3">↘</span>
            </Link>
            <Link href="#contact" className="inline-flex min-h-12 items-center justify-center rounded-full border border-[#c7b58e] px-6 text-sm font-semibold text-[#443722] transition hover:bg-white/60">
              Contact KCD Group
            </Link>
          </div>
          <ul className="mt-10 flex flex-wrap gap-x-5 gap-y-2 border-t border-[#dfd4c1] pt-5 text-[11px] font-semibold uppercase tracking-[0.13em] text-[#78694f]" aria-label="KCD Group business areas">
            {businessAreas.map((area) => <li key={area}>{area}</li>)}
          </ul>
        </div>

        <div className="relative mx-auto w-full max-w-[510px]">
          <div className="absolute -right-5 -top-5 h-28 w-28 rounded-full border border-[#d8c79f]" aria-hidden="true" />
          <div className="relative overflow-hidden rounded-[2rem] border border-[#e5d7bb] bg-[#fffaf1] p-3 shadow-[0_28px_70px_-44px_rgba(53,39,17,0.55)] sm:p-5">
            <Image
              src="/images/kcd-group-brand.png"
              alt="KCD Group of Companies brand artwork with its business areas and tagline"
              width={354}
              height={252}
              priority
              className="h-auto w-full rounded-[1.35rem]"
            />
            <div className="flex items-center justify-between gap-4 px-3 pb-2 pt-4 sm:px-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6e5a34]">A North Texas company</p>
              <span className="h-px flex-1 bg-[#ded1b9]" aria-hidden="true" />
              <span className="font-serif text-sm italic text-[#75633e]">KCD Group</span>
            </div>
          </div>
        </div>
      </section>

      <section id="project" className="border-y border-[#e4dac8] bg-[#fcfaf5]">
        <div className="mx-auto grid w-full max-w-7xl gap-10 px-5 py-16 sm:px-8 md:py-24 lg:grid-cols-[0.95fr_1.05fr] lg:gap-16 lg:px-12">
          <div className="flex min-h-[360px] flex-col justify-between overflow-hidden rounded-[1.75rem] border border-[#ded2ba] bg-[radial-gradient(circle_at_20%_18%,rgba(199,163,94,0.2),transparent_36%),linear-gradient(145deg,#e9e1d2,#f7f4ed_55%,#ded4c2)] p-7 sm:min-h-[460px] sm:p-10">
            <div className="flex items-center justify-between">
              <span className="rounded-full border border-[#b89a62]/50 bg-white/40 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-[#70582a]">Featured property</span>
              <span className="font-serif text-sm italic text-[#857452]">Arlington, Texas</span>
            </div>
            <div className="my-12 flex flex-1 flex-col items-center justify-center text-center">
              <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full border border-[#b59a68]/50 bg-white/40 text-3xl text-[#8c6d32]" aria-hidden="true">⌂</div>
              <p className="font-serif text-3xl text-[#4b3d25]">Arlington Plaza</p>
              <p className="mt-2 max-w-xs text-sm leading-6 text-[#776d5b]">Property photography will be added after KCD supplies approved images.</p>
            </div>
            <div className="flex items-end justify-between border-t border-[#cfc2a9] pt-5 text-xs text-[#67583c]">
              <span>808 W Abram St<br />Arlington, TX 76013</span>
              <span className="text-right uppercase tracking-[0.14em]">Property<br />showcase</span>
            </div>
          </div>

          <div className="flex flex-col justify-center py-2">
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#94702f]">The Arlington project</p>
            <h2 className="mt-4 max-w-xl font-serif text-4xl leading-tight tracking-[-0.035em] text-[#2a2116] sm:text-5xl">Arlington Plaza</h2>
            <p className="mt-5 max-w-xl text-base leading-8 text-[#615747]">
              A mixed-use property in the heart of Arlington, with a focus on spaces for neighborhood businesses and residents.
            </p>
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-[#e3dac9] bg-[#f8f5ee] p-5">
                <p className="text-[10px] font-bold uppercase tracking-[0.17em] text-[#987431]">Location</p>
                <p className="mt-2 text-sm font-semibold leading-6 text-[#3d3324]">808 W Abram St<br />Arlington, TX 76013</p>
              </div>
              <div className="rounded-2xl border border-[#e3dac9] bg-[#f8f5ee] p-5">
                <p className="text-[10px] font-bold uppercase tracking-[0.17em] text-[#987431]">Property type</p>
                <p className="mt-2 text-sm font-semibold leading-6 text-[#3d3324]">Mixed-use commercial<br />and residential</p>
              </div>
            </div>
            <p className="mt-5 text-xs leading-5 text-[#897e6b]">Address and property description are draft details taken from the material supplied. Confirm before publishing.</p>
          </div>
        </div>
      </section>

      <KcdGroupAreaMap />

      <section id="focus" className="mx-auto w-full max-w-7xl px-5 py-16 sm:px-8 md:py-24 lg:px-12">
        <div className="flex flex-col justify-between gap-5 border-b border-[#ddd1bb] pb-8 md:flex-row md:items-end">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#94702f]">What KCD works on</p>
            <h2 className="mt-3 font-serif text-3xl tracking-[-0.025em] sm:text-4xl">A portfolio with room to grow.</h2>
          </div>
          <p className="max-w-md text-sm leading-6 text-[#706553]">The company artwork points to several areas of work. This page can grow with the properties KCD chooses to feature.</p>
        </div>
        <div className="grid gap-0 md:grid-cols-3">
          {projectFocus.map((item) => (
            <article key={item.number} className="border-b border-[#ddd1bb] py-7 md:border-b-0 md:border-r md:px-7 md:first:pl-0 md:last:border-r-0 md:last:pr-0">
              <p className="font-serif text-sm italic text-[#a28141]">{item.number}</p>
              <h3 className="mt-4 text-lg font-semibold text-[#312719]">{item.title}</h3>
              <p className="mt-3 text-sm leading-6 text-[#706553]">{item.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="contact" className="bg-[#30261a] text-[#fffaf1]">
        <div className="mx-auto grid w-full max-w-7xl gap-10 px-5 py-14 sm:px-8 md:py-20 lg:grid-cols-[1fr_auto] lg:items-end lg:px-12">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#d8bd7d]">Contact</p>
            <h2 className="mt-3 max-w-xl font-serif text-3xl leading-tight sm:text-4xl">Talk with KCD Group about Arlington Plaza.</h2>
            <p className="mt-4 max-w-xl text-sm leading-6 text-[#d4c8b4]">Reach KCD Group about Arlington Plaza by phone or email.</p>
          </div>
          <div className="grid min-w-64 gap-3 rounded-2xl border border-white/15 bg-white/[0.04] p-5 text-sm">
            <p><span className="mr-3 text-[#d8bd7d]">Phone</span><a className="text-[#d4c8b4] underline-offset-4 hover:underline" href="tel:+18174668007">817-466-8007</a></p>
            <p><span className="mr-3 text-[#d8bd7d]">Email</span><a className="text-[#d4c8b4] underline-offset-4 hover:underline" href="mailto:wahidmc6@gmail.com">wahidmc6@gmail.com</a></p>
          </div>
        </div>
      </section>

      <footer className="flex flex-col justify-between gap-3 bg-[#241c13] px-5 py-5 text-[11px] text-[#bcaf98] sm:flex-row sm:px-8 lg:px-12">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <p>© {new Date().getFullYear()} KCD Group of Companies</p>
          <Link className="transition hover:text-[#fffaf1]" href="https://www.sunsetpulse.app">
            Visit Sunset Pulse <span aria-hidden="true">↗</span>
          </Link>
        </div>
        <p>Building today for a stronger tomorrow.</p>
      </footer>
    </main>
  );
}
