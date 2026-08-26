import 'server-only';

import { createHash } from 'node:crypto';
import { applyApiRateLimit } from '@/lib/core/apiRateLimit';
import { supabaseAdmin } from '@/lib/supabase';

type DistributedRateLimitRow = {
  is_limited: boolean;
  remaining: number;
  reset_at: string;
};

export async function applyPublicApiRateLimit(
  request: Request,
  scope: string,
  limit: number,
  windowSeconds = 60,
) {
  const identityHash = hashIdentity(`${scope}:${getClientIp(request)}`);

  try {
    const { data, error } = await supabaseAdmin.rpc('consume_public_rate_limit', {
      p_key_hash: identityHash,
      p_limit: limit,
      p_window_seconds: windowSeconds,
    });
    if (error) throw error;

    const row = (Array.isArray(data) ? data[0] : data) as DistributedRateLimitRow | null;
    if (!row || typeof row.is_limited !== 'boolean') {
      throw new Error('The distributed rate limiter returned no decision.');
    }

    const resetAtMs = Date.parse(row.reset_at);
    if (!Number.isFinite(resetAtMs) || !Number.isFinite(row.remaining)) {
      throw new Error('The distributed rate limiter returned an invalid decision.');
    }

    if (!row.is_limited) return null;

    const resetSeconds = Math.max(1, Math.ceil((resetAtMs - Date.now()) / 1000));
    return new Response(JSON.stringify({
      success: false,
      message: `Too many requests. Please try again in ${resetSeconds} seconds.`,
    }), {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(resetSeconds),
        'X-RateLimit-Limit': String(limit),
        'X-RateLimit-Remaining': String(Math.max(0, row.remaining)),
        'X-RateLimit-Reset': String(Math.ceil(resetAtMs / 1000)),
      },
    });
  } catch (error) {
    console.error('[PUBLIC_RATE_LIMIT_ERROR]', error);

    if (process.env.NODE_ENV !== 'production') {
      return applyApiRateLimit(`public-dev:${identityHash}`, limit);
    }

    return new Response(JSON.stringify({
      success: false,
      message: 'The public service is temporarily unavailable. Please try again shortly.',
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json', 'Retry-After': '5' },
    });
  }
}

function getClientIp(request: Request) {
  const value = request.headers.get('x-vercel-forwarded-for')
    || request.headers.get('x-real-ip')
    || request.headers.get('x-forwarded-for')
    || 'unknown';
  return value.split(',')[0].trim() || 'unknown';
}

function hashIdentity(value: string) {
  return createHash('sha256').update(value).digest('hex');
}
