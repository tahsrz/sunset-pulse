'use client';

import React, { useEffect, useId, useState } from 'react';
import { marketingCopySchema, serializeMarketingCopyDraft, type MarketingCopy } from '@/lib/marketing/marketingCopySchema';

const sectionLabels = { value_prop: 'Seller Section', featured: 'Featured Properties' } as const;
const featureLabels = { mls_efficiency: 'Property Search', spatial_search: 'Spatial Search', backend_integrity: 'Jamie' } as const;
const fieldClass = 'mt-2 w-full rounded-lg border border-white/20 bg-slate-900 p-3 text-base text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300';

function Field({ label, value, onChange, maxLength, multiline = false }: {
  label: string; value: string; onChange: (value: string) => void; maxLength: number; multiline?: boolean;
}) {
  const id = useId();
  return <label htmlFor={id} className="block text-sm text-slate-200">
    {label}
    {multiline
      ? <textarea id={id} className={fieldClass} rows={3} value={value} maxLength={maxLength} onChange={event => onChange(event.target.value)} />
      : <input id={id} className={fieldClass} value={value} maxLength={maxLength} onChange={event => onChange(event.target.value)} />}
  </label>;
}

export default function MarketingConfigPage() {
  const [config, setConfig] = useState<MarketingCopy | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [draftError, setDraftError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setLoadError('');
      try {
        const response = await fetch('/api/admin/marketing', { signal: controller.signal, cache: 'no-store' });
        if (!response.ok) throw new Error(response.status === 403 || response.status === 401
          ? 'Site administrator access is required to view this content.'
          : 'Marketing content could not be loaded. Try again.');
        const parsed = marketingCopySchema.safeParse(await response.json());
        if (!parsed.success) throw new Error('Marketing content is invalid. Ask the site administrator to review the content file.');
        if (!controller.signal.aborted) setConfig(parsed.data);
      } catch (error) {
        if (!controller.signal.aborted) setLoadError(error instanceof Error ? error.message : 'Marketing content could not be loaded. Try again.');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [attempt]);

  function update(next: MarketingCopy) {
    setConfig(next);
    setNotice('');
    setDraftError('');
  }

  function downloadDraft() {
    setNotice('');
    setDraftError('');
    const parsed = marketingCopySchema.safeParse(config);
    if (!parsed.success) {
      setDraftError(parsed.error.issues.slice(0, 5).map(issue => `${issue.path.join('.')}: ${issue.message}`).join(' '));
      return;
    }
    let url: string | undefined;
    let link: HTMLAnchorElement | undefined;
    try {
      url = URL.createObjectURL(new Blob([serializeMarketingCopyDraft(parsed.data)], { type: 'application/json' }));
      link = document.createElement('a');
      link.href = url;
      link.download = 'marketing-copy.draft.json';
      document.body.appendChild(link);
      link.click();
      setNotice('Draft download started. The live site has not changed.');
    } catch {
      setDraftError('The draft could not be downloaded. Your edits are still here. Try again.');
    } finally {
      link?.remove();
      if (url) { const objectUrl = url; window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000); }
    }
  }

  if (loading) return <main className="p-8" aria-busy="true"><p role="status">Loading marketing content…</p></main>;
  if (loadError || !config) return <main className="mx-auto max-w-3xl p-8">
    <h1 className="text-3xl">Marketing Content</h1>
    <p role="alert" className="my-6">{loadError || 'Marketing content is unavailable.'}</p>
    <button className="rounded-lg border px-4 py-2" onClick={() => setAttempt(value => value + 1)}>Try Again</button>
  </main>;

  return <main className="min-h-screen bg-slate-950 px-4 py-10 text-slate-100 sm:px-8">
    <div className="mx-auto max-w-4xl space-y-8">
      <header className="space-y-4">
        <h1 className="text-3xl uppercase sm:text-4xl">Marketing Content</h1>
        <p className="max-w-2xl text-slate-300">Edit a draft and download it for review. Your edits stay in this page until you download them. Leaving or reloading this page discards them.</p>
        <p className="text-sm text-slate-400">To publish, review the downloaded file, replace <code>apps/pulse/config/marketing_copy.json</code> in the repository, and deploy the reviewed change.</p>
        <button onClick={downloadDraft} className="rounded-lg bg-cyan-300 px-5 py-3 font-semibold text-slate-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-300">Download Draft</button>
        {notice && <p role="status">{notice}</p>}
        {draftError && <p role="alert" className="text-rose-300">{draftError}</p>}
      </header>

      <section className="space-y-5 border-t border-white/15 pt-6" aria-labelledby="hero-heading">
        <h2 id="hero-heading" className="text-xl uppercase">Hero</h2>
        <Field label="Hero Title" value={config.hero.title} maxLength={200} onChange={title => update({ ...config, hero: { ...config.hero, title } })} />
        <Field label="Hero Subtitle" value={config.hero.subtitle} maxLength={400} onChange={subtitle => update({ ...config, hero: { ...config.hero, subtitle } })} />
        <Field label="Hero Description" value={config.hero.description} maxLength={2000} multiline onChange={description => update({ ...config, hero: { ...config.hero, description } })} />
      </section>

      {(Object.keys(sectionLabels) as Array<keyof typeof sectionLabels>).map(key => <section key={key} aria-labelledby={`section-${key}`} className="space-y-5 border-t border-white/15 pt-6">
        <h2 id={`section-${key}`} className="text-xl uppercase">{sectionLabels[key]}</h2>
        <Field label={`${sectionLabels[key]} Title`} value={config.section_headers[key].title} maxLength={200} onChange={title => update({ ...config, section_headers: { ...config.section_headers, [key]: { ...config.section_headers[key], title } } })} />
        <Field label={`${sectionLabels[key]} Tagline`} value={config.section_headers[key].tagline} maxLength={400} onChange={tagline => update({ ...config, section_headers: { ...config.section_headers, [key]: { ...config.section_headers[key], tagline } } })} />
      </section>)}

      {(Object.keys(featureLabels) as Array<keyof typeof featureLabels>).map(key => <section key={key} aria-labelledby={`feature-${key}`} className="space-y-5 border-t border-white/15 pt-6">
        <h2 id={`feature-${key}`} className="text-xl uppercase">{featureLabels[key]}</h2>
        <Field label={`${featureLabels[key]} Title`} value={config.features[key].title} maxLength={200} onChange={title => update({ ...config, features: { ...config.features, [key]: { ...config.features[key], title } } })} />
        <Field label={`${featureLabels[key]} Tagline`} value={config.features[key].tagline} maxLength={400} onChange={tagline => update({ ...config, features: { ...config.features, [key]: { ...config.features[key], tagline } } })} />
        <Field label={`${featureLabels[key]} Description`} value={config.features[key].description} maxLength={2000} multiline onChange={description => update({ ...config, features: { ...config.features, [key]: { ...config.features[key], description } } })} />
      </section>)}

      <section className="space-y-5 border-t border-white/15 pt-6" aria-labelledby="cta-heading">
        <h2 id="cta-heading" className="text-xl uppercase">Calls to Action</h2>
        <Field label="Button Text" value={config.cta.button_text} maxLength={100} onChange={button_text => update({ ...config, cta: { ...config.cta, button_text } })} />
        <Field label="Footer Note" value={config.cta.footer_note} maxLength={400} onChange={footer_note => update({ ...config, cta: { ...config.cta, footer_note } })} />
      </section>

      <section className="space-y-5 border-t border-white/15 pt-6" aria-labelledby="faq-heading">
        <h2 id="faq-heading" className="text-xl uppercase">Questions &amp; Answers</h2>
        <Field label="FAQ Title" value={config.faq.title} maxLength={200} onChange={title => update({ ...config, faq: { ...config.faq, title } })} />
        {config.faq.items.map((item, index) => <fieldset key={index} className="space-y-4 rounded-lg border border-white/15 p-4">
          <legend className="px-2">Question {index + 1}</legend>
          <Field label={`Question ${index + 1}`} value={item.question} maxLength={400} onChange={question => update({ ...config, faq: { ...config.faq, items: config.faq.items.map((entry, i) => i === index ? { ...entry, question } : entry) } })} />
          <Field label={`Answer ${index + 1}`} value={item.answer} maxLength={4000} multiline onChange={answer => update({ ...config, faq: { ...config.faq, items: config.faq.items.map((entry, i) => i === index ? { ...entry, answer } : entry) } })} />
        </fieldset>)}
      </section>
    </div>
  </main>;
}
