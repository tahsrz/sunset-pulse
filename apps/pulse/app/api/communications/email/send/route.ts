import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/core/getSessionUser';

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionUser();
    if (!session?.user) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const role = session.role;
    if (role !== 'realtor' && role !== 'admin') {
      return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const to = String(body?.to || '').trim();
    const subject = String(body?.subject || '').trim();
    const text = String(body?.text || '').trim();

    if (!to || !subject || !text) {
      return NextResponse.json({ ok: false, error: 'Missing required fields' }, { status: 400 });
    }

    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.RESEND_FROM_EMAIL || 'Sunset Pulse <no-reply@sunsetpulse.ai>';
    if (!apiKey) {
      return NextResponse.json({ ok: false, error: 'Email provider not configured' }, { status: 503 });
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject,
        text
      })
    });

    const payload = await response.json();
    if (!response.ok) {
      return NextResponse.json(
        { ok: false, error: payload?.message || 'Failed to send email' },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true, id: payload?.id || null });
  } catch (error) {
    console.error('[EMAIL_SEND_ROUTE] Failed:', error);
    return NextResponse.json({ ok: false, error: 'Internal server error' }, { status: 500 });
  }
}
