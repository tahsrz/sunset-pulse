'use client';

import React from 'react';
import type { CmsPageDraft } from '@/lib/cms/pages/pageSchema';

export function PagePresentationFields({
  draft,
  change,
}: {
  draft: CmsPageDraft;
  change: (update: (value: CmsPageDraft) => CmsPageDraft) => void;
}) {
  const presentation = draft.presentation;
  return (
    <div className="space-y-4 border-t p-5 text-sm">
      <h2 className="font-semibold">Header and footer</h2>
      <p className="text-xs text-slate-600">
        Overrides apply to this page only. Other pages keep their site defaults.
      </p>
      <label className="flex gap-2">
        <input
          type="checkbox"
          checked={!!presentation}
          onChange={(event) =>
            change((value) => ({
              ...value,
              presentation: event.target.checked
                ? {
                    siteName: value.title,
                    homeLabel: 'Home',
                    navigationLabel: 'Site navigation',
                    footerText: value.title,
                  }
                : undefined,
            }))
          }
        />
        Customize this page
      </label>
      {presentation
        ? (
            ['siteName', 'homeLabel', 'navigationLabel', 'footerText'] as const
          ).map((key) => (
            <label key={key} className="block">
              {
                {
                  siteName: 'Site title',
                  homeLabel: 'Home link text',
                  navigationLabel: 'Navigation accessible label',
                  footerText: 'Footer text',
                }[key]
              }
              <textarea
                rows={key === 'footerText' ? 3 : 1}
                maxLength={
                  key === 'footerText' ? 2000 : key === 'siteName' ? 200 : 100
                }
                value={presentation[key]}
                className="mt-1 w-full border p-2"
                onChange={(event) =>
                  change((value) => ({
                    ...value,
                    presentation: {
                      ...presentation,
                      [key]: event.target.value,
                    },
                  }))
                }
              />
            </label>
          ))
        : null}
      {presentation
        ? (['navigationLinks', 'footerLinks'] as const).map((key) => (
            <fieldset key={key} className="space-y-3 border-t pt-3">
              <legend className="font-semibold">
                {key === 'navigationLinks'
                  ? 'Navigation links'
                  : 'Footer links'}
              </legend>
              {(presentation[key] || []).map((link, index) => (
                <div key={index} className="space-y-2 rounded border p-2">
                  <label className="block">
                    Link {index + 1} text
                    <input
                      className="w-full border p-2"
                      maxLength={100}
                      value={link.label}
                      onChange={(event) => {
                        const label = event.target.value;
                        change((value) => ({
                          ...value,
                          presentation: {
                            ...value.presentation!,
                            [key]: value.presentation![key]?.map((item, i) =>
                              i === index ? { ...item, label } : item,
                            ),
                          },
                        }));
                      }}
                    />
                  </label>
                  <label className="block">
                    Link {index + 1} destination
                    <input
                      className="w-full border p-2"
                      maxLength={2048}
                      value={link.href}
                      onChange={(event) => {
                        const href = event.target.value;
                        change((value) => ({
                          ...value,
                          presentation: {
                            ...value.presentation!,
                            [key]: value.presentation![key]?.map((item, i) =>
                              i === index ? { ...item, href } : item,
                            ),
                          },
                        }));
                      }}
                    />
                  </label>
                  <button
                    type="button"
                    className="underline"
                    onClick={() =>
                      change((value) => ({
                        ...value,
                        presentation: {
                          ...value.presentation!,
                          [key]: value.presentation![key]?.filter(
                            (_, i) => i !== index,
                          ),
                        },
                      }))
                    }
                  >
                    Remove link {index + 1}
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="underline"
                disabled={(presentation[key]?.length || 0) >= 8}
                onClick={() =>
                  change((value) => ({
                    ...value,
                    presentation: {
                      ...value.presentation!,
                      [key]: [
                        ...(value.presentation![key] || []),
                        { label: 'New link', href: '/' },
                      ],
                    },
                  }))
                }
              >
                Add {key === 'navigationLinks' ? 'navigation' : 'footer'} link
              </button>
            </fieldset>
          ))
        : null}
      <h2 className="font-semibold">Search appearance</h2>
      <p className="text-xs text-slate-600">
        Leave blank to use the page title and excerpt. Search metadata is not
        visible page text.
      </p>
      <label className="block">
        SEO title
        <input
          maxLength={200}
          value={draft.seo?.title || ''}
          className="mt-1 w-full border p-2"
          onChange={(event) =>
            change((value) => ({
              ...value,
              seo: {
                title: event.target.value,
                description: value.seo?.description || '',
              },
            }))
          }
        />
      </label>
      <label className="block">
        SEO description
        <textarea
          maxLength={500}
          value={draft.seo?.description || ''}
          className="mt-1 w-full border p-2"
          onChange={(event) =>
            change((value) => ({
              ...value,
              seo: {
                title: value.seo?.title || '',
                description: event.target.value,
              },
            }))
          }
        />
      </label>
    </div>
  );
}
