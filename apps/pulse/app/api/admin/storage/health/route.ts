import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { inspectProjectStorage } from '@/lib/storage/projectStorageMaintenance.mjs';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 10;

// A manual, read-only probe. It is deliberately not a cron entry and never
// invokes cleanup, a seller worker, or a provider notification.
export async function GET(request: NextRequest) {
  const reply = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
  const secret = process.env.CRON_SECRET;
  if (!secret) return reply({ ok: false, error: 'Storage health access is not configured.' }, 503);
  if (request.headers.get('authorization') !== `Bearer ${secret}`) return reply({ ok: false, error: 'Unauthorized.' }, 401);
  const expected = request.nextUrl.searchParams.get('expectedProjectRef');
  if (!expected || !/^[a-z0-9]{20}$/.test(expected)) return reply({ ok: false, error: 'Supply the selected expectedProjectRef.' }, 400);

  const configured = [process.env.SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_URL].filter(Boolean) as string[];
  let origins: URL[];
  try {
    if (!configured.length) throw new Error('Missing origin');
    origins = configured.map((value) => new URL(value));
    if (origins.some((url) => url.protocol !== 'https:' || url.username || url.password || url.port || url.search || url.hash || url.pathname !== '/'
      || !/^[a-z0-9]{20}\.supabase\.co$/.test(url.hostname))) throw new Error('Invalid origin');
  } catch { return reply({ ok: false, error: 'A valid hosted Supabase origin is required.' }, 503); }

  const projectRef = origins[0].hostname.split('.')[0];
  if (origins.some((url) => url.origin !== origins[0].origin)) return reply({ ok: false, error: 'Server and browser database targets differ.' }, 409);
  if (projectRef !== expected) return reply({ ok: false, error: 'The deployed database target differs from the selected project.', target: { projectRef } }, 409);
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return reply({ ok: false, error: 'Server storage inspection is not configured.' }, 503);

  const storage = await inspectProjectStorage(supabaseAdmin);
  if (storage.status === 'unavailable') console.warn('[STORAGE_HEALTH_UNAVAILABLE]', { projectRef });
  return reply({ ok: storage.status === 'healthy', target: { projectRef }, storage }, storage.status === 'unavailable' ? 503 : 200);
}
