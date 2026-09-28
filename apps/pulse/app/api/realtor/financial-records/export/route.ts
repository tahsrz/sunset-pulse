import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requirePersonalRealtorWorkspace } from '@/lib/realtor-workspace/access.server';
import { realtorApi } from '@/lib/realtor-workspace/http.server';
import { listFinancialRecordsForExport } from '@/lib/realtor-workspace/store.server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function csvCell(value: string | number | null, untrustedText = false) {
  let text = value === null ? '' : String(value);
  if (untrustedText && /^[\s\u0000-\u001f]*[=+@-]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

function toCsv(rows: Array<Record<string, any>>) {
  const header = ['currency', 'date', 'record_kind', 'status', 'gross_known', 'gross_cents', 'withheld_cents', 'received_or_paid_cents', 'expected_cents', 'category', 'record_id'];
  const lines = rows.map((row) => {
    const details = row.data && typeof row.data === 'object' ? row.data as Record<string, unknown> : {};
    const kind = String(row.kind);
    const category = kind === 'expense' ? String(details.category || 'other') : kind === 'expected_commission' ? 'expected_income' : 'commission';
    const grossKnown = kind !== 'commission' ? 'not_applicable' : details.mode === 'gross' ? 'true' : 'false';
    const receivedOrPaid = kind === 'commission' ? details.receivedCents : kind === 'expense' ? details.amountCents : null;
    const expected = kind === 'expected_commission' ? details.estimatedTakeHomeCents : null;
    return [
      'USD', row.effective_date, kind, String(row.status), grossKnown,
      kind === 'commission' && details.mode === 'gross' ? details.grossCents : null,
      kind === 'commission' && details.mode === 'gross' ? details.withheldCents : null,
      receivedOrPaid, expected, category, row.id,
    ].map((value, index) => csvCell(value as string | number | null, index === 2 || index === 3 || index === 9 || index === 10)).join(',');
  });
  return '\uFEFF' + [header.map((value) => csvCell(value)).join(','), ...lines].join('\r\n') + '\r\n';
}

export async function GET(request: NextRequest) {
  return realtorApi(request, async (actorId) => {
    const year = z.coerce.number().int().min(2000).max(2200).parse(request.nextUrl.searchParams.get('year') || new Date().getFullYear());
    const { workspaceId } = await requirePersonalRealtorWorkspace(actorId);
    const result = await listFinancialRecordsForExport(actorId, workspaceId, year);
    if (result.tooMany) return new Response('This year has more than 10,000 records; narrow the export range or request a filtered export.', {
      status: 413,
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'private, no-store' },
    });
    return new Response(toCsv(result.rows), {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="sunset-pulse-ledger-${year}.csv"`,
      },
    });
  });
}
