import { NextResponse } from 'next/server';
import { saveCommandActionMemory } from '@/lib/command-center/queryMemory';
import type { CommandActionKind, SaveCommandActionInput } from '@/lib/command-center/actionTypes';

const validActionKinds = new Set<CommandActionKind>(['external-link', 'copy', 'command', 'saved']);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const input = normalizeActionInput(body);

    if (!input.commandId || !input.command || !input.action.id || !input.action.label || !validActionKinds.has(input.action.kind)) {
      return NextResponse.json({ ok: false, error: 'Missing action memory fields.' }, { status: 400 });
    }

    const trace = saveCommandActionMemory(input);
    return NextResponse.json({ ok: trace.saved, trace });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : 'Unable to save command action.'
    }, { status: 500 });
  }
}

function normalizeActionInput(body: any): SaveCommandActionInput {
  return {
    commandId: String(body?.commandId || '').slice(0, 120),
    command: String(body?.command || '').slice(0, 900),
    workerId: body?.workerId ? String(body.workerId).slice(0, 120) : undefined,
    action: {
      id: String(body?.action?.id || '').slice(0, 120),
      label: String(body?.action?.label || '').slice(0, 160),
      description: String(body?.action?.description || '').slice(0, 500),
      kind: String(body?.action?.kind || '') as CommandActionKind,
      href: body?.action?.href ? String(body.action.href).slice(0, 600) : undefined,
      copyText: body?.action?.copyText ? String(body.action.copyText).slice(0, 500) : undefined,
      command: body?.action?.command ? String(body.action.command).slice(0, 900) : undefined
    }
  };
}
