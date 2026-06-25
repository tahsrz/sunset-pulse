import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  getTensorZeroFeedbackSnapshot,
  recordTensorZeroFeedback,
  type TensorZeroFeedbackInput
} from '@/lib/tensorzero/feedback';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const FeedbackSchema = z.object({
  metricName: z.enum([
    'command_center_usefulness',
    'command_center_actionability',
    'command_center_routing_correction',
    'command_center_needs_improvement'
  ]),
  value: z.union([z.boolean(), z.number(), z.string()]),
  source: z.enum([
    'copy_answer',
    'action_click',
    'manual_helper_override',
    'rerun_command'
  ]),
  commandId: z.string().max(160).optional(),
  evaluationId: z.string().max(160).optional(),
  episodeId: z.string().max(160).optional(),
  workerId: z.string().max(160).optional(),
  variantName: z.string().max(220).optional(),
  context: z.record(z.union([z.string(), z.number(), z.boolean(), z.null()])).optional()
});

export async function GET() {
  return NextResponse.json({
    data: {
      framework: 'tensorzero',
      purpose: 'Command Center feedback ledger for TensorZero optimization and experimentation.',
      metrics: [
        'command_center_usefulness',
        'command_center_actionability',
        'command_center_routing_correction',
        'command_center_needs_improvement'
      ],
      snapshot: getTensorZeroFeedbackSnapshot()
    }
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = FeedbackSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({
        ok: false,
        error: 'Invalid TensorZero feedback request.',
        issues: parsed.error.flatten().fieldErrors
      }, { status: 400 });
    }

    const trace = recordTensorZeroFeedback(parsed.data as TensorZeroFeedbackInput);
    return NextResponse.json({ ok: trace.saved, trace });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : 'Unable to record TensorZero feedback.'
    }, { status: 500 });
  }
}
