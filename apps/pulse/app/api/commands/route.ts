import { NextResponse } from 'next/server';
import { z } from 'zod';
import { runCommandCenterCommand, type CommandCenterRequest } from '@/lib/command-center/commandRouter';
import { listTahRelayFormats, listTahRelayTemplates } from '@/lib/command-center/relayTemplates';
import { classifyCommandIntent } from '@/lib/command-center/intentClassifier';
import { getOperatorAccess } from '@/lib/core/operator_access';
import { getRequestHostFromHeaders } from '@/lib/core/routeAuth';
import { getOrchestratorSnapshot } from '@/lib/core/orchestrator_node';
import { routeOrchestratorCommand } from '@/lib/core/orchestrator_commands';
import { flushLangfuse } from '@/lib/observability/langfuseTracing';
import { runVoltagentCommandAdvisor } from '@/lib/agents/voltagentCommandAdvisor';
import { recordTensorZeroCommandEvaluation } from '@/lib/tensorzero/commandEvaluation';
import { runWorkflowOperation, summarizeWorkflowAttempts } from '@/lib/command-center/workflowReliability';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const COMMAND_MAX_LENGTH = 20000;
type CommandPostTrace = Awaited<ReturnType<typeof buildCommandPostTrace>>;

const CommandRequestSchema = z.object({
  command: z.string().trim().min(1).max(COMMAND_MAX_LENGTH),
  selectedWorkerId: z.string().trim().optional(),
  relayMode: z.enum(['briefing', 'slideshow', 'puppetshow', 'field-board', 'script']).optional(),
  supervisor: z.boolean().optional(),
  context: z.object({
    leadId: z.string().optional(),
    listingId: z.string().optional(),
    neighborhoodId: z.string().optional()
  }).optional()
});

export async function GET() {
  return NextResponse.json({
    templates: listTahRelayTemplates(),
    formats: listTahRelayFormats()
  });
}

export async function POST(request: Request) {
  try {
    const body = await safeJson(request);
    if (body === undefined) {
      return NextResponse.json({
        error: 'Invalid JSON command request.',
      }, { status: 400 });
    }

    const parsed = CommandRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({
        error: `Invalid command request. Commands can be up to ${COMMAND_MAX_LENGTH.toLocaleString()} characters, including pasted listing text.`,
        issues: parsed.error.flatten().fieldErrors
      }, { status: 400 });
    }

    const input = parsed.data as CommandCenterRequest;

    if (wantsCommandStream(request)) {
      return streamCommandResponse(request, input);
    }

    const commandResult = await runCommandCenterCommand(input);
    const responseBody = await attachCommandPostTrace(request, input, commandResult);
    const response = NextResponse.json(responseBody);
    await flushLangfuse();
    return response;
  } catch (error) {
    console.error('[COMMAND_CENTER_API] Command execution failed:', error);
    await flushLangfuse();
    return NextResponse.json({
      error: 'Command execution failed.'
    }, { status: 500 });
  }
}

async function safeJson(request: Request) {
  try {
    return await request.json();
  } catch {
    return undefined;
  }
}

async function attachCommandPostTrace(
  request: Request,
  input: CommandCenterRequest,
  commandResult: Awaited<ReturnType<typeof runCommandCenterCommand>>
) {
  const [commandPost, voltagent, tensorzero] = await Promise.all([
    runWorkflowOperation<CommandPostTrace>({
        node: 'api-post',
        operation: 'command-post-trace',
        maxAttempts: 2,
        delayMs: 25,
        fallback: () => ({
          status: 'unavailable' as const,
          endpoint: '/api/admin/orchestrator/command',
          consoleHref: '/admin/orchestrator'
        }),
        fallbackLabel: 'command post unavailable',
        fallbackResult: (trace) => trace.status === 'unavailable' ? 'command post unavailable' : false
    }, () => buildCommandPostTrace(request)),
    runWorkflowOperation({
        node: 'api-post',
        operation: 'voltagent-advisor',
        maxAttempts: 2,
        delayMs: 25,
        fallback: (error) => ({
          status: 'error' as const,
          framework: 'ai-sdk' as const,
          agentId: 'sunset-command-advisor' as const,
          model: 'unavailable',
          provider: 'unavailable',
          reason: error instanceof Error ? error.message : 'Voltagent advisor failed',
          text: '',
          tools: [],
          route: {
            workerId: '',
            workerName: '',
            routeMode: 'auto' as const,
            tahFiles: []
          }
        }),
        fallbackLabel: 'advisor unavailable',
        fallbackResult: (trace) => trace.status === 'error'
          ? 'advisor unavailable'
          : false
    }, () => runVoltagentCommandAdvisor({
      request: input,
      commandResult
    })),
    runWorkflowOperation({
        node: 'api-post',
        operation: 'tensorzero-evaluation',
        maxAttempts: 2,
        delayMs: 25,
        fallback: (error) => ({
          status: 'unavailable' as const,
          framework: 'tensorzero' as const,
          path: '',
          projectName: process.env.TENSORZERO_PROJECT_NAME || 'sunset-pulse',
          functionName: 'sunset_command_center' as const,
          variantName: `langgraph__${commandResult.trace?.routeMode || 'auto'}__${commandResult.result?.relayPlan?.mode || 'briefing'}__${commandResult.worker?.id || 'unknown-worker'}`,
          saved: false,
          reason: error instanceof Error ? error.message : 'TensorZero evaluation failed'
        }),
        fallbackLabel: 'evaluation unavailable',
        fallbackResult: (trace) => trace.status === 'unavailable' ? 'evaluation unavailable' : false
    }, () => Promise.resolve(recordTensorZeroCommandEvaluation({
      request: input,
      response: commandResult
    })))
  ]);
  const postWorkflow = summarizeWorkflowAttempts([
    commandPost.trace,
    voltagent.trace,
    tensorzero.trace
  ]);

  return {
    ...commandResult,
    trace: {
      ...commandResult.trace,
      progress: [
        ...(commandResult.trace.progress || []),
        {
          id: 'post',
          label: 'Post checks',
          status: 'complete' as const,
          detail: 'Trace, advisor, and evaluation linked.',
        },
      ],
      commandPost: commandPost.value,
      voltagent: voltagent.value,
      tensorzero: tensorzero.value,
      postWorkflow
    }
  };
}

function wantsCommandStream(request: Request) {
  const accept = request.headers.get('accept') || '';
  return accept.includes('text/event-stream');
}

function streamCommandResponse(request: Request, input: CommandCenterRequest) {
  const encoder = new TextEncoder();

  return new Response(new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      try {
        const classification = classifyCommandIntent(input.command, input.selectedWorkerId);
        send('progress', {
          id: 'classified',
          label: 'Classified',
          status: 'complete',
          detail: `${classification.intent} (${classification.confidence}%)`,
          classification,
        });
        send('progress', {
          id: 'worker',
          label: 'Worker selected',
          status: 'complete',
          detail: classification.workerId,
        });
        send('progress', {
          id: 'context',
          label: 'Context retrieval',
          status: 'queued',
          detail: 'Retrieving and budgeting command context.',
        });

        const result = await runCommandCenterCommand(input);
        send('progress', {
          id: 'post',
          label: 'Post checks',
          status: 'queued',
          detail: 'Linking trace, advisor, and evaluation.',
        });
        const finalResult = await attachCommandPostTrace(request, input, result);
        send('result', finalResult);
      } catch (error) {
        send('error', {
          error: error instanceof Error ? error.message : 'Command failed.',
        });
      } finally {
        await flushLangfuse();
        controller.close();
      }
    },
  }), {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}

async function buildCommandPostTrace(request: Request) {
  try {
    const access = await getOperatorAccess(getRequestHostFromHeaders(request.headers));

    if (!access.allowed) {
      return {
        status: 'access_denied' as const,
        endpoint: '/api/admin/orchestrator/command',
        consoleHref: '/admin/orchestrator',
        accessMode: access.mode,
        reason: access.reason
      };
    }

    const snapshot = getOrchestratorSnapshot(access);
    const statusProbe = routeOrchestratorCommand({
      text: '/status',
      source: 'console',
      access
    });

    return {
      status: 'linked' as const,
      endpoint: '/api/admin/orchestrator/command',
      consoleHref: '/admin/orchestrator',
      accessMode: access.mode,
      masterArchive: {
        status: snapshot.masterArchive.status,
        sourceCount: snapshot.masterArchive.sourceCount,
        shardCount: snapshot.masterArchive.shardCount
      },
      pendingTerminalIntentCount: snapshot.commandQueue.pendingTerminalIntentCount,
      commandRouterModes: snapshot.commandRouter.modes.map((mode) => mode.mode),
      statusProbe: {
        ok: statusProbe.ok,
        action: statusProbe.action,
        reply: statusProbe.reply
      }
    };
  } catch (error) {
    console.error('[COMMAND_CENTER_API] Command post trace failed:', error);
    return {
      status: 'unavailable' as const,
      endpoint: '/api/admin/orchestrator/command',
      consoleHref: '/admin/orchestrator'
    };
  }
}
