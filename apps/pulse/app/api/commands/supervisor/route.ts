import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  createCommandSupervisorReview,
  getCommandSupervisorReviewSnapshot,
  processQueuedCommandSupervisorReviews,
} from '@/lib/command-center/supervisorReviews';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const SupervisorReviewSchema = z.object({
  commandId: z.string().trim().min(1),
  command: z.string().trim().min(1).max(20000),
  workerId: z.string().trim().min(1),
  workerName: z.string().trim().min(1),
  intent: z.string().trim().min(1),
  summary: z.string().trim().min(1).max(3000),
  selectedShards: z.array(z.object({
    source: z.string().nullable().optional(),
    title: z.string().nullable().optional(),
    score: z.number().nullable().optional(),
  })).optional(),
});

const SupervisorProcessSchema = z.object({
  limit: z.number().int().min(1).max(50).optional(),
}).optional();

export async function GET() {
  return NextResponse.json(getCommandSupervisorReviewSnapshot());
}

export async function POST(request: Request) {
  try {
    const body = await safeJson(request);
    const parsed = SupervisorReviewSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({
        error: 'Invalid supervisor review request.',
        issues: parsed.error.flatten().fieldErrors,
      }, { status: 400 });
    }

    const payload = parsed.data;
    const { review, trace } = createCommandSupervisorReview({
      commandId: payload.commandId,
      command: payload.command,
      workerId: payload.workerId,
      workerName: payload.workerName,
      intent: payload.intent,
      summary: payload.summary,
      selectedShards: payload.selectedShards,
    });
    return NextResponse.json({ ok: trace.status !== 'unavailable', review, trace });
  } catch (error) {
    console.error('[COMMAND_SUPERVISOR_REVIEW] Failed:', error);
    return NextResponse.json({ error: 'Supervisor review failed.' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await safeJson(request);
    const parsed = SupervisorProcessSchema.safeParse(body || undefined);

    if (!parsed.success) {
      return NextResponse.json({
        error: 'Invalid supervisor process request.',
        issues: parsed.error.flatten().fieldErrors,
      }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      result: processQueuedCommandSupervisorReviews({ limit: parsed.data?.limit }),
      snapshot: getCommandSupervisorReviewSnapshot(),
    });
  } catch (error) {
    console.error('[COMMAND_SUPERVISOR_PROCESS] Failed:', error);
    return NextResponse.json({ error: 'Supervisor processing failed.' }, { status: 500 });
  }
}

async function safeJson(request: Request) {
  try {
    return await request.json();
  } catch {
    return undefined;
  }
}
