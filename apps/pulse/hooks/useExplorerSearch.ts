'use client';
import { useEffect, useRef, useState } from 'react';
import { readPublicSearch, type ExplorerSearchState, type ExplorerQuery } from '@/lib/explorer/publicSearch';

export function useExplorerSearch(query: ExplorerQuery, attempt: number) {
  const [snapshot, setSnapshot] = useState<{ key: string; state: ExplorerSearchState } | null>(null);
  const generation = useRef(0);
  const url = 'url' in query ? query.url : '';
  const shape = 'shape' in query ? query.shape : 'search';
  const key = `${attempt}:${shape}:${url}`;
  useEffect(() => {
    const controller = new AbortController();
    const current = ++generation.current;
    if (url) {
      void readPublicSearch({ url, shape }, controller.signal).then(state => {
        if (!controller.signal.aborted && generation.current === current) setSnapshot({ key, state });
      }).catch(() => {
        if (!controller.signal.aborted && generation.current === current) setSnapshot({ key, state: { status: 'unavailable' } });
      });
    }
    return () => controller.abort();
  }, [url, shape, key]);
  return snapshot?.key === key ? snapshot.state : { status: 'loading' } as const;
}
