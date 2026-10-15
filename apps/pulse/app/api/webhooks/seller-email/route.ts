import { NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase';
import { verifySellerEmailSignature } from '@/lib/realtor-workspace/sellerEmailSignature.server';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export async function POST(request: Request) {
  const secret = process.env.RESEND_SELLER_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ ok: false }, { status: 503 });
  // Bound actual streamed bytes, including requests with no Content-Length.
  const reader = request.body?.getReader();
  if (!reader) return NextResponse.json({ ok: false }, { status: 400 });
  let bytes = 0; const chunks: Uint8Array[] = [];
  try {
    while (true) { const part = await reader.read(); if (part.done) break; bytes += part.value.byteLength;
      if (bytes > 65536) { await reader.cancel(); return NextResponse.json({ ok: false }, { status: 413 }); } chunks.push(part.value); }
  } finally { reader.releaseLock(); }
  const body = Buffer.concat(chunks).toString('utf8');
  if (!verifySellerEmailSignature(body, request.headers, secret)) return NextResponse.json({ ok: false }, { status: 401 });
  let raw: unknown; try { raw = JSON.parse(body); } catch { return NextResponse.json({ ok: false }, { status: 400 }); }
  const event = z.object({ type: z.string(), created_at: z.string().datetime({ offset: true }), data: z.object({ email_id: z.string().min(1).max(200) }) }).safeParse(raw);
  if (!event.success) return NextResponse.json({ ok: false }, { status: 400 });
  if (event.data.type !== 'email.delivered' && event.data.type !== 'email.bounced') return NextResponse.json({ ok: true });
  const { error } = await supabaseAdmin.rpc('seller_email_delivery', { p_receipt_id: request.headers.get('svix-id'), p_provider_id: event.data.data.email_id,
    p_status: event.data.type === 'email.delivered' ? 'delivered' : 'bounced', p_occurred_at: event.data.created_at });
  return NextResponse.json({ ok: !error }, { status: error ? 503 : 200 });
}
