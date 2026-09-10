'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { z } from 'zod';
import { cmsPageDraftSchema } from '@/lib/cms/pages/pageSchema';
import { CmsPageEditor } from '../pages/[pageId]/edit/CmsPageEditor';

const resultSchema = z.object({
  binding: z
    .object({
      tenantId: z.string(),
      siteId: z.string(),
      pageId: z.string(),
      enabled: z.boolean(),
      version: z.number(),
    })
    .nullable(),
  page: z
    .object({
      tenantId: z.string().optional(),
      siteId: z.string(),
      pageId: z.string(),
      routePath: z.string().optional(),
      status: z.enum(['draft', 'published']),
      currentDraftVersion: z.number(),
      draftPayload: cmsPageDraftSchema,
    })
    .nullable(),
});
type Result = z.infer<typeof resultSchema>;

export function PlatformHomepageEditor() {
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [disableArmed, setDisableArmed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setError('');
    fetch('/api/platform-homepage', { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error('Homepage could not be loaded.');
        const body = resultSchema.parse(await response.json());
        if (!controller.signal.aborted) setResult(body);
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted)
          setError(
            error instanceof Error
              ? error.message
              : 'Homepage could not be loaded.',
          );
      });
    return () => controller.abort();
  }, [attempt]);

  async function action(body: Record<string, unknown>) {
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/platform-homepage', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!response.ok)
        throw new Error(
          response.status === 409
            ? 'Homepage changed elsewhere. Reload the workspace.'
            : 'Homepage action failed.',
        );
      setResult(resultSchema.parse(await response.json()));
      setDisableArmed(false);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : 'Homepage action failed.',
      );
    } finally {
      setBusy(false);
    }
  }
  async function publish(expectedVersion: number) {
    const response = await fetch('/api/platform-homepage', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        action: 'publish',
        expectedVersion,
        expectedBindingVersion: result?.binding?.version,
      }),
    });
    if (response.ok) {
      setResult(resultSchema.parse(await response.clone().json()));
    }
    return response;
  }
  const binding = result?.binding;
  const scope = binding
    ? new URLSearchParams({
        siteId: binding.siteId,
        tenantId: binding.tenantId,
      }).toString()
    : '';
  return (
    <section>
      <div className="space-y-3 border-b bg-white p-6">
        <h1 className="text-2xl font-semibold">Platform homepage</h1>
        <p>
          Edit the homepage visitors see at Sunset Pulse. Preview is immediate;
          Save draft keeps edits off the live homepage until Publish.
        </p>
        {error ? (
          <p role="alert">
            {error}{' '}
            <button
              onClick={() => setAttempt(attempt + 1)}
              className="underline"
            >
              Reload workspace
            </button>
          </p>
        ) : null}
        {!result && !error ? <p role="status">Loading homepage…</p> : null}
        {result && !result.page ? (
          <>
            <p>
              Create a dedicated homepage draft with starter sections. This does
              not replace the live homepage.
            </p>
            <button
              disabled={busy}
              onClick={() => void action({ action: 'initialize' })}
              className="rounded bg-[#2271b1] px-4 py-2 text-white"
            >
              {busy
                ? 'Preparing…'
                : binding
                  ? 'Resume draft setup'
                  : 'Create homepage draft'}
            </button>
          </>
        ) : null}
        {binding && result?.page ? (
          <div className="flex flex-wrap items-center gap-4">
            <span role="status">
              {binding.enabled
                ? 'CMS homepage is live'
                : 'Original homepage is live'}
            </span>
            <Link href={'/vibes/appearance?' + scope} className="underline">
              Choose homepage theme
            </Link>
            <Link
              href="/"
              target="_blank"
              rel="noreferrer"
              className="underline"
            >
              View live homepage
            </Link>
            {binding.enabled ? (
              <button
                disabled={busy}
                className="underline"
                onClick={() =>
                  disableArmed
                    ? void action({
                        action: 'disable',
                        expectedBindingVersion: binding.version,
                      })
                    : setDisableArmed(true)
                }
              >
                {disableArmed
                  ? 'Confirm: restore original homepage'
                  : 'Restore original homepage'}
              </button>
            ) : null}
            {disableArmed ? (
              <button onClick={() => setDisableArmed(false)}>Cancel</button>
            ) : null}
          </div>
        ) : null}
      </div>
      {binding && result?.page ? (
        <CmsPageEditor
          key={binding.pageId + ':' + attempt}
          page={{ ...result.page, tenantId: binding.tenantId }}
          pagesHref={'/vibes/pages?' + scope}
          publishRequest={publish}
        />
      ) : null}
    </section>
  );
}
