import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  runVoltagentCommandAdvisor,
  type VoltAgentCommandAdvisorResult
} from '@/lib/agents/voltagentCommandAdvisor';
import type { CommandCenterRequest } from '@/lib/command-center/commandRouter';
import { flushLangfuse } from '@/lib/observability/langfuseTracing';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const AdvisorRequestSchema = z.object({
  command: z.string().trim().min(1).max(600),
  selectedWorkerId: z.string().trim().optional(),
  relayMode: z.enum(['briefing', 'slideshow', 'puppetshow', 'field-board', 'script']).optional(),
  supervisor: z.boolean().optional()
});

export async function GET() {
  return NextResponse.json({
    data: {
      agentId: 'sunset-command-advisor',
      framework: 'voltagent',
      model: process.env.VOLTAGENT_COMMAND_MODEL || 'groq/llama-3.1-8b-instant',
      enabled: process.env.VOLTAGENT_COMMAND_ADVISOR_ENABLED !== 'false',
      endpoint: '/api/agents/voltagent/command-advisor',
      tools: [
        'route_command',
        'list_worker_loadout',
        'summarize_command_center'
      ]
    }
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = AdvisorRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({
        error: 'Invalid VoltAgent advisor request.',
        issues: parsed.error.flatten().fieldErrors
      }, { status: 400 });
    }

    const result: VoltAgentCommandAdvisorResult = await runVoltagentCommandAdvisor({
      request: parsed.data as CommandCenterRequest
    });

    const response = NextResponse.json({ data: result });
    await flushLangfuse();
    return response;
  } catch (error) {
    console.error('[VOLTAGENT_ADVISOR_API] Advisor execution failed:', error);
    await flushLangfuse();
    return NextResponse.json({
      error: 'VoltAgent advisor execution failed.'
    }, { status: 500 });
  }
}
