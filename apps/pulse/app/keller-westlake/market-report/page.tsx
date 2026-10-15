import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { listPublishedMarketReports } from '@/lib/marketing/marketReports.server';

export function generateMetadata(): Metadata {
  const hasReport = listPublishedMarketReports().length > 0;
  return {
    title: 'Keller and Westlake Market Report | Sunset Pulse',
    description: 'Dated, source-backed Keller and Westlake market information, when reviewed and authorized data is available.',
    alternates: { canonical: '/keller-westlake/market-report' },
    robots: { index: hasReport, follow: true },
  };
}

export default function KellerWestlakeMarketReportPage() {
  const reports = listPublishedMarketReports();
  return (
    <main className="min-h-screen bg-[#061017] px-4 py-14 text-white sm:px-6 sm:py-20">
      <div className="mx-auto max-w-5xl">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-teal-200">Keller · Westlake · market context</p>
        <h1 className="mt-4 text-4xl font-black leading-tight sm:text-5xl">Market information with its source and scope attached.</h1>
        <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-300">Every published figure needs a stated period, geographic scope, sample size, method and documented permission to share. An asking price, assessed value and closed sale are different measures.</p>

        {reports.length === 0 ? (
          <section aria-labelledby="report-unavailable-title" className="mt-10 rounded-3xl border border-amber-200/20 bg-amber-200/[0.05] p-6 sm:p-8">
            <h2 id="report-unavailable-title" className="text-2xl font-bold">No reviewed public market report is available yet.</h2>
            <p className="mt-3 max-w-3xl leading-7 text-slate-300">We do not have a current, publication-authorized local sales dataset in this report library, so there are no market totals or trends to display. We will not fill that gap with sample or invented figures.</p>
          </section>
        ) : (
          <div className="mt-10 space-y-8">
            {reports.map((report) => (
              <article key={`${report.reportId}:${report.revision}`} className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 sm:p-8">
                <p className="text-xs font-bold uppercase tracking-widest text-teal-200">{report.geographicScope.label} · {report.period.from}–{report.period.through} · reviewed {report.reviewedAt}</p>
                <h2 className="mt-3 text-2xl font-bold">{report.title}</h2>
                <p className="mt-3 leading-7 text-slate-300">{report.summary}</p>
                <p className="mt-3 text-sm text-slate-400">Sample: {report.sampleCount} records. Source: {report.source.publisher}, {report.source.title}. Retrieved {report.source.retrievedAt}; data effective {report.source.effectiveDate}.</p>
                <div className="mt-6 overflow-x-auto rounded-2xl border border-white/10">
                  <table className="w-full min-w-[38rem] text-left text-sm">
                    <caption className="sr-only">{report.title} reported metrics and definitions</caption>
                    <thead className="bg-white/[0.06] text-xs uppercase tracking-wide text-slate-300"><tr><th className="p-3">Measure</th><th className="p-3">Value</th><th className="p-3">Method and sample</th><th className="p-3">Definition</th></tr></thead>
                    <tbody>{report.metrics.map((metric) => (
                      <tr key={metric.key} className="border-t border-white/10 align-top"><th scope="row" className="p-3 font-semibold">{metric.label}</th><td className="p-3">{metric.unit === 'usd' ? `$${metric.value.toLocaleString('en-US')}` : metric.unit === 'percent' ? `${metric.value}%` : `${metric.value.toLocaleString('en-US')} ${metric.unit.replace('-', ' ')}`}</td><td className="p-3">{metric.method} · n={metric.sampleCount}</td><td className="p-3 text-slate-300">{metric.definition}</td></tr>
                    ))}</tbody>
                  </table>
                </div>
                <p className="mt-4 text-xs text-slate-400">Revision {report.revision}. <a className="font-semibold text-teal-200 underline underline-offset-4" href={report.source.sourceUrl} target="_blank" rel="noreferrer">Open source and permission reference</a></p>
              </article>
            ))}
          </div>
        )}

        <div className="mt-10 flex flex-wrap gap-4 text-sm font-semibold">
          <Link className="rounded-full bg-teal-500 px-5 py-3 text-slate-950 hover:bg-teal-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white" href="/seller-plan">Request a personally reviewed pricing conversation</Link>
          <Link className="rounded-full border border-white/15 px-5 py-3 text-teal-100 hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-200" href="/neighborhoods">Read neighborhood guides</Link>
        </div>
      </div>
    </main>
  );
}
