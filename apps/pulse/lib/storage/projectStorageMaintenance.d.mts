import type { SupabaseClient } from '@supabase/supabase-js';
export type ProjectStorageInspection = {
  status: 'healthy' | 'warning' | 'blocked' | 'unavailable';
  backgroundUploadsAllowed: boolean;
  reasons: string[];
  metrics: null | {
    limitBytes: number; liveBytes: number; reservedBytes: number; retiredBytes: number;
    chargedBytes: number; availableBytes: number; observedBytes: number; databaseBytes: number; pendingUploads: number;
  };
};
export function inspectProjectStorage(client: SupabaseClient): Promise<ProjectStorageInspection>;
export function publishBackgroundCartridge(client: SupabaseClient, name: string, loadBody: () => Promise<ArrayBuffer | ArrayBufferView | Blob> | ArrayBuffer | ArrayBufferView | Blob): Promise<{
  state: 'uploaded' | 'existing' | 'skipped' | 'paused'; error: null | { message: string };
}>;
