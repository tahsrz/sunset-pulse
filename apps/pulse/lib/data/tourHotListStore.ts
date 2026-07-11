import 'server-only';

import { supabaseAdmin } from '@/lib/supabase';
import type { TourHotListTarget } from '@/lib/data/tourHotList';

export type StoredTourHotList = {
  id: 'default';
  targets: TourHotListTarget[];
  rawMlsIds: string;
  rawAddresses: string;
  limit: number;
  updatedAt?: string;
  updatedBy: Record<string, unknown>;
};

export type SaveTourHotListInput = {
  targets: TourHotListTarget[];
  rawMlsIds: string;
  rawAddresses: string;
  limit: number;
  updatedBy?: Record<string, unknown>;
};

const HOT_LIST_ID = 'default';

export async function getStoredTourHotList(): Promise<StoredTourHotList | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('tour_hot_lists')
      .select('id, targets, raw_mls_ids, raw_addresses, limit_count, updated_at, updated_by')
      .eq('id', HOT_LIST_ID)
      .maybeSingle();

    if (error) {
      if (!isMissingHotListTableError(error)) {
        console.warn('[TOUR_HOT_LIST_STORE_READ]', error.message);
      }
      return null;
    }
    if (!data) return null;

    return rowToStoredHotList(data);
  } catch (error) {
    if (!isMissingHotListTableError(error)) {
      console.warn('[TOUR_HOT_LIST_STORE_READ]', formatError(error));
    }
    return null;
  }
}

export async function saveStoredTourHotList(input: SaveTourHotListInput): Promise<StoredTourHotList> {
  const row = {
    id: HOT_LIST_ID,
    targets: normalizeStoredTargets(input.targets),
    raw_mls_ids: input.rawMlsIds || '',
    raw_addresses: input.rawAddresses || '',
    limit_count: clamp(input.limit, 1, 24),
    updated_by: input.updatedBy || {},
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabaseAdmin
    .from('tour_hot_lists')
    .upsert(row, { onConflict: 'id' })
    .select('id, targets, raw_mls_ids, raw_addresses, limit_count, updated_at, updated_by')
    .single();

  if (error) {
    throw Object.assign(new Error(`Tour hot-list save failed: ${error.message}`), error);
  }

  return rowToStoredHotList(data);
}

function rowToStoredHotList(row: Record<string, any>): StoredTourHotList {
  return {
    id: 'default',
    targets: normalizeStoredTargets(row.targets),
    rawMlsIds: String(row.raw_mls_ids || ''),
    rawAddresses: String(row.raw_addresses || ''),
    limit: clamp(Number(row.limit_count || 10), 1, 24),
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : undefined,
    updatedBy: isRecord(row.updated_by) ? row.updated_by : {},
  };
}

function normalizeStoredTargets(value: unknown): TourHotListTarget[] {
  const rows = Array.isArray(value) ? value : [];
  const seen = new Set<string>();
  const targets: TourHotListTarget[] = [];

  for (const row of rows) {
    if (!isRecord(row)) continue;
    const kind = row.kind === 'mlsId' || row.kind === 'address' ? row.kind : null;
    const targetValue = typeof row.value === 'string' ? row.value.trim() : '';
    if (!kind || !targetValue) continue;

    const key = `${kind}:${targetValue.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    targets.push({ kind, value: targetValue });
  }

  return targets.slice(0, 50);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Math.round(value)));
}

function isRecord(value: unknown): value is Record<string, any> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isMissingHotListTableError(error: unknown) {
  const code = isRecord(error) ? String(error.code || '') : '';
  const message = error instanceof Error
    ? error.message
    : isRecord(error)
      ? String(error.message || '')
      : String(error);

  return (
    code === '42P01' ||
    code === 'PGRST205' ||
    (message.includes('tour_hot_lists') && message.includes('schema cache'))
  );
}

function formatError(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
