import { NextResponse } from 'next/server';
import { getTensorZeroCommandEvaluationSnapshot } from '@/lib/tensorzero/commandEvaluation';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  return NextResponse.json({
    data: {
      framework: 'tensorzero',
      purpose: 'Command Center workflow evaluation ledger for TensorZero gateway, feedback, and optimization passes.',
      functionName: 'sunset_command_center',
      metrics: [
        'command_center_quality',
        'command_center_grounded',
        'command_center_actionable',
        'command_center_safety'
      ],
      snapshot: getTensorZeroCommandEvaluationSnapshot()
    }
  });
}
