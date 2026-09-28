import { NextRequest } from 'next/server';
import { z } from 'zod';
import { commissionInputSchema, expenseInputSchema, expectedIncomeInputSchema, financialMutationSchema, financialRecordCursorSchema } from '@/lib/realtor-workspace/contracts';
import { requirePersonalRealtorWorkspace } from '@/lib/realtor-workspace/access.server';
import { listFinancialRecords, recordCommission, recordExpense, recordExpectedIncome, realizeExpectedIncome, voidFinancialRecord } from '@/lib/realtor-workspace/store.server';
import { realtorApi, readRealtorBody } from '@/lib/realtor-workspace/http.server';
import { RealtorWorkspaceError } from '@/lib/realtor-workspace/access.server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  return realtorApi(request, async (actorId) => {
    const year = z.coerce.number().int().min(2000).max(2200).parse(request.nextUrl.searchParams.get('year') || new Date().getFullYear());
    const { workspaceId } = await requirePersonalRealtorWorkspace(actorId);
    const limit = z.coerce.number().int().min(1).max(100).default(50).parse(request.nextUrl.searchParams.get('limit') || undefined);
    const rawCursor = request.nextUrl.searchParams.get('cursor');
    let cursor: z.infer<typeof financialRecordCursorSchema> | undefined;
    if (rawCursor) {
      try {
        if (rawCursor.length > 512 || !/^[A-Za-z0-9_-]+$/.test(rawCursor)) throw new Error('Invalid cursor.');
        cursor = financialRecordCursorSchema.parse(JSON.parse(Buffer.from(rawCursor, 'base64url').toString('utf8')));
        if (cursor.workspaceId !== workspaceId || cursor.year !== year || cursor.limit !== limit) throw new Error('Cursor scope mismatch.');
      } catch {
        throw new RealtorWorkspaceError('INVALID');
      }
    }
    const page = await listFinancialRecords(actorId, workspaceId, year, limit, cursor);
    return {
      year,
      entries: page.entries,
      nextCursor: page.nextCursor ? Buffer.from(JSON.stringify(page.nextCursor)).toString('base64url') : null,
    };
  });
}

export async function POST(request: NextRequest) {
  return realtorApi(request, async (actorId) => {
    const raw = await readRealtorBody(request);
    const { workspaceId } = await requirePersonalRealtorWorkspace(actorId);
    const commission = commissionInputSchema.safeParse(raw);
    if (commission.success) return recordCommission(actorId, workspaceId, commission.data);
    const expense = expenseInputSchema.safeParse(raw);
    if (expense.success) {
      if (expense.data.occurrenceId) throw new RealtorWorkspaceError('INVALID');
      return recordExpense(actorId, workspaceId, expense.data);
    }
    const expected = expectedIncomeInputSchema.parse(raw);
    return recordExpectedIncome(actorId, workspaceId, expected);
  }, true);
}

export async function PATCH(request: NextRequest) {
  return realtorApi(request, async (actorId) => {
    const mutation = financialMutationSchema.parse(await readRealtorBody(request));
    const { workspaceId } = await requirePersonalRealtorWorkspace(actorId);
    if (mutation.action === 'void') {
      return voidFinancialRecord(actorId, workspaceId, mutation);
    }
    if (mutation.action === 'realize_expected') {
      return realizeExpectedIncome(actorId, workspaceId, {
        recordId: mutation.recordId,
        expectedRevision: mutation.expectedRevision,
        commission: mutation.commission,
      });
    }
    if (mutation.action === 'correct_commission') {
      return recordCommission(actorId, workspaceId, mutation.entry, {
        recordId: mutation.recordId, expectedRevision: mutation.expectedRevision,
      });
    }
    if (mutation.action === 'correct_expense') {
      if (mutation.entry.occurrenceId) throw new RealtorWorkspaceError('INVALID');
      return recordExpense(actorId, workspaceId, mutation.entry, {
        recordId: mutation.recordId, expectedRevision: mutation.expectedRevision,
      });
    }
    return recordExpectedIncome(actorId, workspaceId, mutation.entry, {
      recordId: mutation.recordId, expectedRevision: mutation.expectedRevision,
    });
  }, true);
}
