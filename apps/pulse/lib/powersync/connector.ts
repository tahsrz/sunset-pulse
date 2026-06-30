import {
  type AbstractPowerSyncDatabase,
  type CrudEntry,
  type PowerSyncBackendConnector,
  UpdateType,
} from '@powersync/web';
import { supabase } from '@/lib/supabase';
import { withRetry } from '@/lib/core/withRetry';

const WRITABLE_TABLES = new Set(['collections', 'recent_property_views', 'saved_searches']);
const FATAL_POSTGRES_CODES = [/^22...$/, /^23...$/, /^42501$/];

export class SunsetPowerSyncConnector implements PowerSyncBackendConnector {
  async fetchCredentials() {
    const endpoint = process.env.NEXT_PUBLIC_POWERSYNC_URL;
    if (!endpoint) return null;

    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    if (!data.session?.access_token) return null;

    return { endpoint, token: data.session.access_token };
  }

  async uploadData(database: AbstractPowerSyncDatabase): Promise<void> {
    // Upload one entry at a time so a fatal validation/RLS failure cannot
    // discard unrelated valid mutations from the local queue.
    const batch = await database.getCrudBatch(1);
    if (!batch) return;

    let activeEntry: CrudEntry | null = null;
    try {
      for (const entry of batch.crud) {
        activeEntry = entry;
        if (!WRITABLE_TABLES.has(entry.table)) {
          throw Object.assign(new Error(`PowerSync writes are not allowed for ${entry.table}.`), { code: '42501' });
        }

        const table = supabase.from(entry.table);
        const result: any = await withRetry(() => applyEntry(table, entry), {
          onRetry: ({ attempt, delayMs, error }) => {
            console.warn('[POWERSYNC_UPLOAD_RETRY]', { table: entry.table, id: entry.id, attempt, delayMs, error });
          },
        });
        if (result.error) throw result.error;
      }
      await batch.complete();
    } catch (error: any) {
      if (typeof error?.code === 'string' && FATAL_POSTGRES_CODES.some((pattern) => pattern.test(error.code))) {
        console.error('[POWERSYNC_UPLOAD_DISCARDED]', { entry: activeEntry, error });
        recordDiscardedMutation(activeEntry, error.code);
        await batch.complete();
        return;
      }
      throw error;
    }
  }
}

function recordDiscardedMutation(entry: CrudEntry | null, code: string) {
  if (typeof window === 'undefined' || !entry) return;
  const storageKey = 'sunset_powersync_dead_letters';
  try {
    const existing = JSON.parse(localStorage.getItem(storageKey) || '[]');
    const deadLetters = Array.isArray(existing) ? existing : [];
    deadLetters.unshift({ table: entry.table, id: entry.id, operation: entry.op, code, at: new Date().toISOString() });
    localStorage.setItem(storageKey, JSON.stringify(deadLetters.slice(0, 20)));
    window.dispatchEvent(new CustomEvent('sunset:powersync-dead-letter'));
  } catch {
    // Upload failure is already logged; diagnostics must not block queue progress.
  }
}

function applyEntry(table: any, entry: CrudEntry) {
  switch (entry.op) {
    case UpdateType.PUT:
      return table.upsert({ ...entry.opData, id: entry.id });
    case UpdateType.PATCH:
      return table.update(entry.opData || {}).eq('id', entry.id);
    case UpdateType.DELETE:
      return table.delete().eq('id', entry.id);
    default:
      throw new Error(`Unsupported PowerSync operation: ${entry.op}`);
  }
}
