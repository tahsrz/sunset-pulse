import type { SupabaseClient } from '@supabase/supabase-js';
import type { FileOptions } from '@supabase/storage-js';
type BudgetError = { code: string; statusCode: string; message: string };
type Failure = { data: null; error: BudgetError };
export function uploadWithStorageBudget(client: SupabaseClient, bucket: string, name: string, body: ArrayBuffer | ArrayBufferView | Blob, options?: FileOptions): Promise<Failure | { data: { id: string; path: string; fullPath: string } | null; error: { message: string; statusCode?: string; code?: string } | null }>;
export function createBudgetedSignedUploadUrl(client: SupabaseClient, bucket: string, name: string, declaredBytes: number): Promise<Failure | { data: { path: string; signedUrl: string; token: string } | null; error: { message: string; statusCode?: string; code?: string } | null }>;
