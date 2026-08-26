import { NextRequest, NextResponse } from 'next/server';
import { isAuthResponse, requireOperatorRouteAccess } from '@/lib/core/routeAuth';
import { loadShadowInvoice } from '@/lib/profit/shadowInvoice';
import { evaluateBillingControls } from '@/lib/profit/billingControls';

export async function GET(request: NextRequest) {
  const access = await requireOperatorRouteAccess(request);
  if (isAuthResponse(access)) return access;
  const site = request.nextUrl.searchParams.get('site');
  if (!site) return NextResponse.json({ ok: false, error: 'A tenant site is required.' }, { status: 400 });
  const end = new Date().toISOString();
  const start = new Date(Date.now() - 30 * 86400000).toISOString();
  try {
    const invoice = await loadShadowInvoice({ tenantSite: site, periodStart: start, periodEnd: end, accountMinimumUsd: Number(process.env.BILLING_ACTIVE_SITE_MINIMUM_USD || 0), includedCreditUsd: Number(process.env.BILLING_INCLUDED_CREDIT_USD || 0), entries: [] });
    const controls = evaluateBillingControls({ spendingLimitUsd: Number(process.env.BILLING_SPENDING_LIMIT_USD || 1), estimatedInvoiceUsd: invoice.estimatedTotalUsd });
    return NextResponse.json({ ok: true, invoice, controls });
  } catch (cause) {
    return NextResponse.json({ ok: false, error: cause instanceof Error ? cause.message : 'Unable to load shadow invoice.' }, { status: 500 });
  }
}
