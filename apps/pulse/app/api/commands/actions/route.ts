import { NextResponse } from 'next/server';
import { saveCommandActionMemory } from '@/lib/command-center/queryMemory';
import type { CommandActionKind, SaveCommandActionInput } from '@/lib/command-center/actionTypes';
import { recordTensorZeroFeedback } from '@/lib/tensorzero/feedback';

const validActionKinds = new Set<CommandActionKind>(['external-link', 'copy', 'command', 'saved']);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const input = normalizeActionInput(body);
    const validationError = validateActionInput(input);

    if (validationError) {
      return NextResponse.json({ ok: false, error: validationError }, { status: 400 });
    }

    const trace = saveCommandActionMemory(input);
    const feedback = recordTensorZeroFeedback({
      metricName: 'command_center_actionability',
      value: 1,
      source: 'action_click',
      commandId: input.commandId,
      episodeId: input.commandId,
      evaluationId: body?.tensorzero?.evaluationId ? String(body.tensorzero.evaluationId).slice(0, 160) : undefined,
      workerId: input.workerId,
      variantName: body?.tensorzero?.variantName ? String(body.tensorzero.variantName).slice(0, 220) : undefined,
      context: {
        actionId: input.action.id,
        actionKind: input.action.kind,
        actionLabel: input.action.label
      }
    });

    return NextResponse.json({ ok: trace.saved, trace, feedback });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : 'Unable to save command action.'
    }, { status: 500 });
  }
}

function normalizeActionInput(body: any): SaveCommandActionInput {
  return {
    commandId: cleanText(body?.commandId, 120),
    command: cleanText(body?.command, 900),
    workerId: body?.workerId ? cleanText(body.workerId, 120) : undefined,
    action: {
      id: cleanText(body?.action?.id, 120),
      label: cleanText(body?.action?.label, 160),
      description: cleanText(body?.action?.description, 500),
      kind: cleanText(body?.action?.kind, 40) as CommandActionKind,
      href: body?.action?.href ? cleanText(body.action.href, 600) : undefined,
      copyText: body?.action?.copyText ? cleanText(body.action.copyText, 500) : undefined,
      command: body?.action?.command ? cleanText(body.action.command, 900) : undefined
    }
  };
}

function validateActionInput(input: SaveCommandActionInput) {
  if (!input.commandId || !input.command || !input.action.id || !input.action.label || !validActionKinds.has(input.action.kind)) {
    return 'Missing action memory fields.';
  }

  if (input.action.kind === 'external-link' && !isSafeActionHref(input.action.href)) {
    return 'External link actions require a safe http(s) href.';
  }

  if (input.action.kind === 'copy' && !input.action.copyText) {
    return 'Copy actions require copy text.';
  }

  if (input.action.kind === 'command' && !input.action.command) {
    return 'Command actions require a follow-up command.';
  }

  return '';
}

function isSafeActionHref(href?: string) {
  if (!href) return false;

  try {
    const parsed = new URL(href);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function cleanText(value: unknown, maxLength: number) {
  return String(value || '').trim().slice(0, maxLength);
}
