import { NextResponse } from 'next/server';
import { z } from 'zod';
import { runCommandCenterCommand, type CommandCenterRequest } from '@/lib/command-center/commandRouter';
import { listTahRelayFormats, listTahRelayTemplates } from '@/lib/command-center/relayTemplates';
import { getOperatorAccess } from '@/lib/core/operator_access';
import { getOrchestratorSnapshot } from '@/lib/core/orchestrator_node';
import { routeOrchestratorCommand } from '@/lib/core/orchestrator_commands';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const CommandRequestSchema = z.object({
  command: z.string().trim().min(1).max(600),
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
    const body = await request.json();
    const parsed = CommandRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({
        error: 'Invalid command request.',
        issues: parsed.error.flatten().fieldErrors
      }, { status: 400 });
    }

    const commandResult = runCommandCenterCommand(parsed.data as CommandCenterRequest);
    const commandPost = await buildCommandPostTrace(request);

    return NextResponse.json({
      ...commandResult,
      trace: {
        ...commandResult.trace,
        commandPost
      }
    });
  } catch (error) {
    console.error('[COMMAND_CENTER_API] Command execution failed:', error);
    return NextResponse.json({
      error: 'Command execution failed.'
    }, { status: 500 });
  }
}

async function buildCommandPostTrace(request: Request) {
  try {
    const access = await getOperatorAccess(request.headers.get('host'));

    if (!access.allowed) {
      return {
        status: 'access_denied',
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
      status: 'linked',
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
      status: 'unavailable',
      endpoint: '/api/admin/orchestrator/command',
      consoleHref: '/admin/orchestrator'
    };
  }
}
