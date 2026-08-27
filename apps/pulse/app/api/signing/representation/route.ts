import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/core/database';
import { getSessionUser } from '@/lib/core/getSessionUser';
import { buildRepresentationAgreement, representationAgreementSchema } from '@/lib/contracts/representationAgreement';
import { createSignerToken, hashPayload } from '@/lib/signing/signingHash';
import SigningPacket from '@/models/SigningPacket';
import { supabaseAdmin } from '@/lib/supabase';
import { persistProviderCost } from '@/lib/profit/internalCostEvents';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const session = await getSessionUser();
  if (!session?.userId) return NextResponse.json({ ok: false, error: 'Authentication required.' }, { status: 401 });
  if (!['realtor', 'admin', 'operator'].includes(session.role || session.user?.role || '')) {
    return NextResponse.json({ ok: false, error: 'Realtor or operator access is required.' }, { status: 403 });
  }

  const parsed = representationAgreementSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: 'Invalid representation agreement.', details: parsed.error.flatten().fieldErrors }, { status: 400 });

  const draftPayload = buildRepresentationAgreement(parsed.data);
  const commercialContext = parsed.data.commercialContext;
  if (commercialContext) {
    const lineageError = await validateCommercialContext(commercialContext);
    if (lineageError) return NextResponse.json({ ok: false, error: lineageError }, { status: 400 });
  }
  const token = createSignerToken();
  const payloadHash = hashPayload(draftPayload);
  await connectDB();
  const packet = await SigningPacket.create({
    title: draftPayload.agreementTitle,
    status: 'sent',
    createdBy: session.userId,
    commercialContext: commercialContext || undefined,
    draftPayload,
    payloadHash,
    signerLinks: [{ role: draftPayload.signerRoles[0].role, name: parsed.data.clientName, email: parsed.data.clientEmail, routingOrder: 1, token, status: 'pending' }],
    auditTrail: [{ type: 'packet_created', actorName: parsed.data.agentName, actorRole: 'realtor', actorEmail: session.email, ipAddress: clientIp(request), userAgent: request.headers.get('user-agent') || '', payloadHash, metadata: { agreementKind: draftPayload.kind, reviewStatus: draftPayload.reviewStatus } }],
  });

  const signingUrl = `${publicBaseUrl()}/sign/${token}`;
  const email = await sendAgreementEmail({ to: parsed.data.clientEmail, clientName: parsed.data.clientName, agentName: parsed.data.agentName, signingUrl, idempotencyKey: `representation:${packet._id}` });
  packet.auditTrail.push({ type: email.ok ? 'signing_email_sent' : 'signing_email_failed', actorRole: 'system', actorEmail: parsed.data.clientEmail, payloadHash, metadata: email });
  await packet.save();

  if (email.ok && commercialContext) {
    await recordSigningEmailCost(commercialContext, String(packet._id), email.id);
  }

  if (!email.ok) return NextResponse.json({ ok: false, error: email.error, packetId: packet._id, signingUrl }, { status: 502 });
  return NextResponse.json({ ok: true, packetId: packet._id, signingUrl, emailId: email.id });
}

async function recordSigningEmailCost(
  context: NonNullable<ReturnType<typeof representationAgreementSchema.parse>['commercialContext']>,
  packetId: string,
  providerMessageId: string,
) {
  const configured = Number(process.env.PROFIT_RESEND_COST_PER_DELIVERY);
  try {
    await persistProviderCost({
      tenantSite: context.site,
      funnelId: context.funnelId,
      leadId: context.leadId,
      provider: 'resend',
      providerEventId: providerMessageId || packetId,
      costType: 'email_sms',
      amountUsd: Number.isFinite(configured) && configured >= 0 ? configured : null,
      occurredAt: new Date().toISOString(),
      evidence: { packetId, purpose: 'representation_agreement_email' },
    });
  } catch (error) {
    console.warn('[SIGNING_COST_LEDGER]', error);
  }
}

async function validateCommercialContext(context: NonNullable<ReturnType<typeof representationAgreementSchema.parse>['commercialContext']>) {
  const { data: lead, error: leadError } = await supabaseAdmin
    .from('agent_site_leads')
    .select('id, funnel_id, agent_id, site')
    .eq('id', context.leadId)
    .eq('funnel_id', context.funnelId)
    .eq('agent_id', context.agentId)
    .eq('site', context.site)
    .maybeSingle();
  if (leadError) return 'Unable to verify representation packet lineage.';
  if (!lead) return 'Representation packet lineage does not match the selected lead.';

  if (context.bookingId) {
    const { data: booking, error: bookingError } = await supabaseAdmin
      .from('scheduling_bookings')
      .select('id, funnel_id, lead_id, agent_id, site, status')
      .eq('id', context.bookingId)
      .eq('funnel_id', context.funnelId)
      .eq('lead_id', context.leadId)
      .eq('agent_id', context.agentId)
      .eq('site', context.site)
      .maybeSingle();
    if (bookingError) return 'Unable to verify representation booking lineage.';
    if (!booking || ['cancelled', 'rejected'].includes(booking.status)) return 'Representation packet booking lineage is invalid.';
  }
  return null;
}

async function sendAgreementEmail(input: { to: string; clientName: string; agentName: string; signingUrl: string; idempotencyKey: string }) {
  if (!process.env.RESEND_API_KEY) return { ok: false as const, error: 'Email provider is not configured.' };
  try {
    const response = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json', 'Idempotency-Key': input.idempotencyKey }, body: JSON.stringify({ from: process.env.RESEND_FROM_EMAIL || 'Sunset Pulse <no-reply@sunsetpulse.app>', to: [input.to], subject: `Representation agreement from ${input.agentName}`, text: `Hello ${input.clientName},\n\n${input.agentName} sent you a buyer/tenant representation agreement for review and electronic signature.\n\nReview and sign securely: ${input.signingUrl}\n\nThis draft requires responsible-broker and legal review before production use. It does not replace the TREC Information About Brokerage Services notice.` }) });
    const payload = await response.json().catch(() => null);
    return response.ok ? { ok: true as const, id: String(payload?.id || '') } : { ok: false as const, error: String(payload?.message || 'Email delivery failed.') };
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : 'Email delivery failed.' };
  }
}

function publicBaseUrl() { return (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_DOMAIN || 'https://sunsetpulse.app').replace(/\/$/, ''); }
function clientIp(request: NextRequest) { return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || ''; }
