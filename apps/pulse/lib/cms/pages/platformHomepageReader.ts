import { cache } from 'react';
import connectDB from '@/lib/core/database';
import { readPlatformHomepageBinding } from './platformHomepageService';
import { buildScopedCmsPageRenderContext } from './renderContext';

/** Request-local deduplication: layout, metadata, and page read the same pinned revision. */
export const readPlatformHomepage = cache(async () => {
  if (process.env.NEXT_PUBLIC_MOCK_MODE === 'true') return null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    // A database outage must not hold the legacy homepage behind an unbounded read.
    // This limits response latency; it does not cancel an already-started driver query.
    return await Promise.race([
      readPublishedHomepage(),
      new Promise<null>((resolve) => {
        timer = setTimeout(() => resolve(null), 2000);
      }),
    ]);
  } catch (error) {
    console.error(
      'Platform homepage unavailable; using the existing homepage.',
      error instanceof Error ? error.message : 'Unknown error',
    );
    return null;
  } finally {
    if (timer) clearTimeout(timer);
  }
});

async function readPublishedHomepage() {
  await connectDB();
  const binding = await readPlatformHomepageBinding();
  if (!binding?.enabled || !binding.publishedRevisionId) return null;
  return buildScopedCmsPageRenderContext({
    tenantId: binding.tenantId,
    siteId: binding.siteId,
    pageId: binding.pageId,
    publishedRevisionId: binding.publishedRevisionId,
    requestId: crypto.randomUUID(),
    hostname: '',
  });
}
