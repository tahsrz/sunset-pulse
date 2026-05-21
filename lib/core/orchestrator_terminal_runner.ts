import { exec } from 'child_process';
import { promisify } from 'util';
import { getTerminalIntent, updateTerminalIntent, type TerminalIntent } from './orchestrator_command_queue';
import { sendTelegramMessage } from '@/lib/communication/telegram';

export type TerminalIntentAction = 'approve' | 'reject' | 'run';

export type TerminalIntentActionResult = {
  ok: boolean;
  action: TerminalIntentAction;
  message: string;
  intent: TerminalIntent | null;
};

const execAsync = promisify(exec);
const COMMAND_TIMEOUT_MS = 30_000;
const MAX_OUTPUT_CHARS = 12_000;

export async function handleTerminalIntentAction(input: {
  id: string;
  action: TerminalIntentAction;
  operator: string;
}): Promise<TerminalIntentActionResult> {
  const intent = getTerminalIntent(input.id);

  if (!intent) {
    return {
      ok: false,
      action: input.action,
      message: 'Terminal intent was not found.',
      intent: null
    };
  }

  if (input.action === 'reject') {
    return rejectTerminalIntent(intent, input.operator);
  }

  if (input.action === 'approve') {
    return approveTerminalIntent(intent, input.operator);
  }

  return runTerminalIntent(intent, input.operator);
}

async function rejectTerminalIntent(intent: TerminalIntent, operator: string): Promise<TerminalIntentActionResult> {
  if (intent.status === 'running') {
    return {
      ok: false,
      action: 'reject',
      message: 'This command is already running.',
      intent
    };
  }

  const updated = updateTerminalIntent(intent.id, {
    status: 'rejected',
    rejectedAt: new Date().toISOString(),
    rejectedBy: operator
  });

  await notifyTelegramSource(updated, `Rejected terminal intent ${intent.id}: ${intent.command}`);

  return {
    ok: true,
    action: 'reject',
    message: 'Terminal intent rejected.',
    intent: updated
  };
}

async function approveTerminalIntent(intent: TerminalIntent, operator: string): Promise<TerminalIntentActionResult> {
  if (intent.status !== 'pending') {
    return {
      ok: false,
      action: 'approve',
      message: `Only pending commands can be approved. Current status: ${intent.status}.`,
      intent
    };
  }

  if (intent.riskLevel === 'high') {
    return {
      ok: false,
      action: 'approve',
      message: 'High-risk commands are manual-only and cannot be approved for web execution.',
      intent
    };
  }

  const updated = updateTerminalIntent(intent.id, {
    status: 'approved',
    approvedAt: new Date().toISOString(),
    approvedBy: operator
  });

  await notifyTelegramSource(updated, `Approved terminal intent ${intent.id}. It has not run yet.`);

  return {
    ok: true,
    action: 'approve',
    message: 'Terminal intent approved and ready to run.',
    intent: updated
  };
}

async function runTerminalIntent(intent: TerminalIntent, operator: string): Promise<TerminalIntentActionResult> {
  const runnable = canRun(intent);
  if (!runnable.ok) {
    return {
      ok: false,
      action: 'run',
      message: runnable.message,
      intent
    };
  }

  const startedAt = new Date().toISOString();
  updateTerminalIntent(intent.id, {
    status: 'running',
    approvedAt: intent.approvedAt || startedAt,
    approvedBy: intent.approvedBy || operator,
    startedAt,
    cwd: process.cwd()
  });

  try {
    const result = await execAsync(intent.command, {
      cwd: process.cwd(),
      timeout: COMMAND_TIMEOUT_MS,
      windowsHide: true,
      maxBuffer: MAX_OUTPUT_CHARS * 2
    });
    const updated = updateTerminalIntent(intent.id, {
      status: 'completed',
      completedAt: new Date().toISOString(),
      exitCode: 0,
      stdout: trimOutput(result.stdout),
      stderr: trimOutput(result.stderr),
      executionError: ''
    });
    await notifyTelegramSource(updated, formatTelegramCompletion(updated));

    return {
      ok: true,
      action: 'run',
      message: 'Terminal intent completed.',
      intent: updated
    };
  } catch (error: any) {
    const updated = updateTerminalIntent(intent.id, {
      status: 'failed',
      completedAt: new Date().toISOString(),
      exitCode: typeof error.code === 'number' ? error.code : null,
      stdout: trimOutput(error.stdout || ''),
      stderr: trimOutput(error.stderr || ''),
      executionError: String(error.message || error)
    });
    await notifyTelegramSource(updated, formatTelegramCompletion(updated));

    return {
      ok: false,
      action: 'run',
      message: 'Terminal intent failed.',
      intent: updated
    };
  }
}

function canRun(intent: TerminalIntent) {
  if (intent.riskLevel === 'high') {
    return {
      ok: false,
      message: 'High-risk commands are manual-only. Copy and run locally only after separate review.'
    };
  }

  if (intent.status === 'running') {
    return { ok: false, message: 'This command is already running.' };
  }

  if (intent.status === 'completed' || intent.status === 'failed') {
    return { ok: false, message: `This command already finished with status ${intent.status}.` };
  }

  if (intent.status === 'rejected' || intent.status === 'cancelled') {
    return { ok: false, message: `This command cannot run because it is ${intent.status}.` };
  }

  if (intent.riskLevel === 'medium' && intent.status !== 'approved') {
    return { ok: false, message: 'Medium-risk commands must be approved before running.' };
  }

  if (intent.status !== 'pending' && intent.status !== 'approved') {
    return { ok: false, message: `This command cannot run from status ${intent.status}.` };
  }

  return { ok: true, message: 'Runnable.' };
}

function formatTelegramCompletion(intent: TerminalIntent | null) {
  if (!intent) return 'Terminal intent finished, but the final record could not be loaded.';
  const output = trimOutput([intent.stdout, intent.stderr, intent.executionError].filter(Boolean).join('\n'), 800);

  return [
    `Terminal intent ${intent.status}: ${intent.id}`,
    `Command: ${intent.command}`,
    output ? `Output:\n${output}` : 'No output captured.'
  ].join('\n');
}

async function notifyTelegramSource(intent: TerminalIntent | null, message: string) {
  if (!intent || intent.source !== 'telegram' || !intent.chatId) return;
  if (!process.env.TELEGRAM_BOT_TOKEN) return;
  await sendTelegramMessage(intent.chatId, message);
}

function trimOutput(output: string, maxLength = MAX_OUTPUT_CHARS) {
  const normalized = String(output || '').trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength)}\n[output truncated]`;
}
