'use client';

import { useEffect } from 'react';

const recentViews = new Map<string, number>();
const DUPLICATE_WINDOW_MS = 15_000;

export default function VisitorPropertyViewTracker({ propertyId }: { propertyId: string }) {
  useEffect(() => {
    const now = Date.now();
    const previous = recentViews.get(propertyId) || 0;
    if (now - previous < DUPLICATE_WINDOW_MS) return;
    recentViews.set(propertyId, now);

    void fetch('/api/intelligence/visitor-events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'property_viewed', propertyId }),
      keepalive: true,
    }).catch(() => undefined);
  }, [propertyId]);

  return null;
}

export function trackPropertyComparison(propertyIds: string[]) {
  const uniqueIds = Array.from(new Set(propertyIds.filter(Boolean))).slice(0, 8);
  if (uniqueIds.length < 2) return;
  void fetch('/api/intelligence/visitor-events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event: 'properties_compared', propertyIds: uniqueIds }),
    keepalive: true,
  }).catch(() => undefined);
}
