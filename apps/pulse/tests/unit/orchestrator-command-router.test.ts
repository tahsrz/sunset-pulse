import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { extractTelegramMessage, routeOrchestratorCommand } from '@/lib/core/orchestrator_commands';
import { listTerminalIntents, reloadOrchestratorCommandQueueForTests, resetOrchestratorCommandQueueForTests } from '@/lib/core/orchestrator_command_queue';
import { handleTerminalIntentAction } from '@/lib/core/orchestrator_terminal_runner';

const previousAuthorizedUserId = process.env.AUTHORIZED_USER_ID;
const previousTelegramChatId = process.env.TELEGRAM_OPERATOR_CHAT_ID;
const previousQueuePath = process.env.ORCHESTRATOR_COMMAND_QUEUE_PATH;
let tempQueueDir = '';

beforeEach(() => {
  tempQueueDir = fs.mkdtempSync(path.join(os.tmpdir(), 'orchestrator-queue-test-'));
  process.env.ORCHESTRATOR_COMMAND_QUEUE_PATH = path.join(tempQueueDir, 'terminal-intents.json');
  process.env.AUTHORIZED_USER_ID = '42';
  delete process.env.TELEGRAM_OPERATOR_CHAT_ID;
  resetOrchestratorCommandQueueForTests();
});

afterEach(() => {
  restoreEnv('AUTHORIZED_USER_ID', previousAuthorizedUserId);
  restoreEnv('TELEGRAM_OPERATOR_CHAT_ID', previousTelegramChatId);
  resetOrchestratorCommandQueueForTests();
  reloadOrchestratorCommandQueueForTests();
  restoreEnv('ORCHESTRATOR_COMMAND_QUEUE_PATH', previousQueuePath);
  if (tempQueueDir) fs.rmSync(tempQueueDir, { recursive: true, force: true });
  tempQueueDir = '';
});

describe('orchestrator command router', () => {
  it('rejects Telegram messages from unauthorized chats', () => {
    const result = routeOrchestratorCommand({
      text: '/commands',
      source: 'telegram',
      chatId: '99'
    });

    expect(result.ok).toBe(false);
    expect(result.action).toBe('unauthorized');
    expect(result.reply).toContain('not authorized');
  });

  it('serves the BotFather command menu for authorized Telegram chats', () => {
    const result = routeOrchestratorCommand({
      text: '/commands',
      source: 'telegram',
      chatId: '42'
    });

    expect(result.ok).toBe(true);
    expect(result.reply).toContain('/status');
    expect(result.reply).toContain('/check');
    expect(result.reply).toContain('/pack_master');
  });

  it('queues terminal intents instead of executing them', () => {
    const result = routeOrchestratorCommand({
      text: '!git status',
      source: 'telegram',
      chatId: '42',
      username: 'operator'
    });

    expect(result.ok).toBe(true);
    expect(result.mode).toBe('terminal');
    expect(result.requiresConfirmation).toBe(true);
    expect(result.terminalIntent).toEqual(
      expect.objectContaining({
        command: 'git status',
        riskLevel: 'low',
        status: 'pending'
      })
    );
    expect(listTerminalIntents({ status: 'pending' })).toHaveLength(1);
  });

  it('persists queued terminal intents across process cache reloads', () => {
    const result = routeOrchestratorCommand({
      text: '!git status',
      source: 'telegram',
      chatId: '42',
      username: 'operator'
    });

    reloadOrchestratorCommandQueueForTests();

    expect(listTerminalIntents({ status: 'pending' })).toEqual([
      expect.objectContaining({
        id: result.terminalIntent!.id,
        command: 'git status',
        username: 'operator'
      })
    ]);
  });

  it('marks destructive terminal intents as high risk', () => {
    const result = routeOrchestratorCommand({
      text: '!git reset --hard HEAD',
      source: 'telegram',
      chatId: '42'
    });

    expect(result.terminalIntent?.riskLevel).toBe('high');
    expect(result.reply).toContain('has not been executed');
  });

  it('cancels queued terminal intents through /cancel', () => {
    routeOrchestratorCommand({
      text: '!git status',
      source: 'telegram',
      chatId: '42'
    });

    const cancel = routeOrchestratorCommand({
      text: '/cancel',
      source: 'telegram',
      chatId: '42'
    });

    expect(cancel.reply).toContain('Cancelled 1 pending');
    expect(listTerminalIntents({ status: 'pending' })).toHaveLength(0);
  });

  it('runs low-risk terminal intents from the approval queue', async () => {
    const queued = routeOrchestratorCommand({
      text: '!node --version',
      source: 'telegram',
      chatId: '42'
    });

    const result = await handleTerminalIntentAction({
      id: queued.terminalIntent!.id,
      action: 'run',
      operator: 'local-test'
    });

    expect(result.ok).toBe(true);
    expect(result.intent).toEqual(
      expect.objectContaining({
        status: 'completed',
        exitCode: 0
      })
    );
    expect(result.intent?.stdout).toMatch(/^v\d+/);
  });

  it('requires approval before running medium-risk terminal intents', async () => {
    const queued = routeOrchestratorCommand({
      text: '!node -e "console.log(\'medium-run\')"',
      source: 'telegram',
      chatId: '42'
    });

    const blocked = await handleTerminalIntentAction({
      id: queued.terminalIntent!.id,
      action: 'run',
      operator: 'local-test'
    });

    expect(blocked.ok).toBe(false);
    expect(blocked.message).toContain('must be approved');

    const approved = await handleTerminalIntentAction({
      id: queued.terminalIntent!.id,
      action: 'approve',
      operator: 'local-test'
    });
    expect(approved.ok).toBe(true);

    const completed = await handleTerminalIntentAction({
      id: queued.terminalIntent!.id,
      action: 'run',
      operator: 'local-test'
    });

    expect(completed.ok).toBe(true);
    expect(completed.intent?.stdout).toContain('medium-run');
  });

  it('keeps high-risk terminal intents manual-only', async () => {
    const queued = routeOrchestratorCommand({
      text: '!git reset --hard HEAD',
      source: 'telegram',
      chatId: '42'
    });

    const approved = await handleTerminalIntentAction({
      id: queued.terminalIntent!.id,
      action: 'approve',
      operator: 'local-test'
    });
    const run = await handleTerminalIntentAction({
      id: queued.terminalIntent!.id,
      action: 'run',
      operator: 'local-test'
    });

    expect(approved.ok).toBe(false);
    expect(run.ok).toBe(false);
    expect(run.message).toContain('manual-only');
  });

  it('extracts text messages from Telegram webhook updates', () => {
    const envelope = extractTelegramMessage({
      message: {
        text: '/status',
        chat: { id: 42 },
        from: { username: 'operator' }
      }
    });

    expect(envelope).toEqual({
      chatId: '42',
      text: '/status',
      username: 'operator'
    });
  });
});

function restoreEnv(key: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[key];
  } else {
    process.env[key] = value;
  }
}
