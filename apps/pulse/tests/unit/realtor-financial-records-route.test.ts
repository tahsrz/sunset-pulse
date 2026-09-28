import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const { listFinancialRecords } = vi.hoisted(() => ({ listFinancialRecords: vi.fn() }));
const workspaceId = '00000000-0000-4000-8000-000000000010';
const rowId = '00000000-0000-4000-8000-000000000011';

vi.mock('@/lib/realtor-workspace/access.server', () => ({
  RealtorWorkspaceError: class RealtorWorkspaceError extends Error { constructor(public code: string) { super(code); } },
  requirePersonalRealtorWorkspace: vi.fn(async () => ({ workspaceId })),
}));
vi.mock('@/lib/realtor-workspace/store.server', () => ({
  listFinancialRecords,
  recordCommission: vi.fn(), recordExpense: vi.fn(), recordExpectedIncome: vi.fn(),
  realizeExpectedIncome: vi.fn(), voidFinancialRecord: vi.fn(),
}));
vi.mock('@/lib/realtor-workspace/http.server', () => ({
  realtorApi: async (_request: NextRequest, work: (actorId: string) => Promise<unknown>) => {
    try { return Response.json({ ok: true, result: await work('actor-1') }); }
    catch (error) {
      const invalid = (error as { code?: string })?.code === 'INVALID' || error instanceof SyntaxError;
      return Response.json({ ok: false }, { status: invalid ? 400 : 500 });
    }
  },
  readRealtorBody: vi.fn(),
}));

import { GET } from '@/app/api/realtor/financial-records/route';

describe('realtor financial-records cursor', () => {
  beforeEach(() => vi.clearAllMocks());

  it('uses a bounded first page and returns a workspace/year/limit-bound cursor', async () => {
    listFinancialRecords.mockResolvedValue({
      entries: [{ id: rowId, effective_date: '2026-03-10' }],
      nextCursor: { workspaceId, year: 2026, limit: 50, effectiveDate: '2026-03-10', id: rowId },
    });

    const response = await GET(new NextRequest('http://localhost/api/realtor/financial-records?year=2026'));
    const body = await response.json();
    const decodedCursor = JSON.parse(Buffer.from(body.result.nextCursor, 'base64url').toString('utf8'));

    expect(listFinancialRecords).toHaveBeenCalledWith('actor-1', workspaceId, 2026, 50, undefined);
    expect(body.result.entries).toHaveLength(1);
    expect(decodedCursor).toEqual({ workspaceId, year: 2026, limit: 50, effectiveDate: '2026-03-10', id: rowId });
  });

  it('passes a valid cursor to the store and rejects year, limit, workspace, and malformed reuse', async () => {
    const cursor = { workspaceId, year: 2026, limit: 2, effectiveDate: '2026-03-10', id: rowId };
    const encoded = Buffer.from(JSON.stringify(cursor)).toString('base64url');
    listFinancialRecords.mockResolvedValue({ entries: [], nextCursor: null });

    const valid = await GET(new NextRequest(`http://localhost/api/realtor/financial-records?year=2026&limit=2&cursor=${encoded}`));
    expect(valid.status).toBe(200);
    expect(listFinancialRecords).toHaveBeenCalledWith('actor-1', workspaceId, 2026, 2, cursor);

    for (const query of [
      `year=2025&limit=2&cursor=${encoded}`,
      `year=2026&limit=3&cursor=${encoded}`,
      'year=2026&limit=2&cursor=not-a-cursor',
      `year=2026&limit=2&cursor=${Buffer.from(JSON.stringify({ ...cursor, workspaceId: '00000000-0000-4000-8000-000000000099' })).toString('base64url')}`,
    ]) {
      listFinancialRecords.mockClear();
      const response = await GET(new NextRequest(`http://localhost/api/realtor/financial-records?${query}`));
      expect(response.status).toBe(400);
      expect(listFinancialRecords).not.toHaveBeenCalled();
    }
  });
});
