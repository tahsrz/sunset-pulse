import React from 'react';
import type { HomepageSectionBlock } from './homepageSectionSchema';

export function HomepageSection({ block }: { block: HomepageSectionBlock }) {
  const { props } = block;
  const accent = props.layout === 'hero' || props.layout === 'closing';
  return <section data-homepage-section={props.layout} className={'py-8 sm:py-12 ' + (accent ? 'rounded-2xl bg-[var(--color-surface,#f4f1e9)] p-6 sm:p-10' : '')}>
    {props.eyebrow ? <p className="mb-4 text-sm font-semibold tracking-wide text-[var(--color-primary,#2271b1)]">{props.eyebrow}</p> : null}
    {props.heading ? <h2 className="cms-block-heading max-w-3xl text-balance text-3xl sm:text-4xl">{props.heading}</h2> : null}
    {props.text ? <p className="cms-block-paragraph mt-5 max-w-2xl text-lg">{props.text}</p> : null}
    {props.layout === 'faq' ? <div className="mt-6 divide-y divide-current/15">{props.items.map((item, index) => <details key={index} className="py-4">
      <summary className="cursor-pointer text-lg font-semibold">{item.title}</summary>
      <p className="cms-block-paragraph mt-3">{item.text}</p>
      {item.href && item.linkLabel ? <a className="mt-3 inline-block underline" href={item.href}>{item.linkLabel}</a> : null}
    </details>)}</div> : props.items.length ? <div className="mt-8 grid gap-5 sm:grid-cols-2">{props.items.map((item, index) => <article key={index} className="rounded-xl border border-current/15 p-6">
      <h3 className="cms-block-heading text-xl">{item.title}</h3>
      <p className="cms-block-paragraph mt-3">{item.text}</p>
      {item.href && item.linkLabel ? <a className="mt-5 inline-block font-semibold underline" href={item.href}>{item.linkLabel}</a> : null}
    </article>)}</div> : null}
    {props.actionHref && props.actionLabel ? <a href={props.actionHref} className="cms-block-button cms-block-button--primary mt-6">{props.actionLabel}</a> : null}
  </section>;
}
