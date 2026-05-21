import type { OperatorAccess } from './operator_access';
import { getBotFatherCommands, getOrchestratorSnapshot, runOrchestratorBrowserCheck } from './orchestrator_node';
import { cancelTerminalIntents, enqueueTerminalIntent, listTerminalIntents, type TerminalIntent, type TerminalRiskLevel } from './orchestrator_command_queue';
import { getTahMasterMetadata, listTahMasterPlaces, searchTahMaster } from './tah_master';

export type OrchestratorCommandSource = 'console' | 'telegram';

export type OrchestratorCommandInput = {
  text: string;
  source?: OrchestratorCommandSource;
  chatId?: string | number | null;
  username?: string | null;
  access?: OperatorAccess | null;
};

export type OrchestratorCommandResult = {
  ok: boolean;
  mode: 'assistant' | 'bot_command' | 'terminal' | 'empty';
  action: string;
  reply: string;
  requiresConfirmation: boolean;
  terminalIntent?: TerminalIntent;
  data?: any;
};

export type TelegramMessageEnvelope = {
  chatId: string;
  text: string;
  username: string | null;
};

export function routeOrchestratorCommand(input: OrchestratorCommandInput): OrchestratorCommandResult {
  const source = input.source || 'console';
  const text = String(input.text || '').trim();
  const chatId = normalizeChatId(input.chatId);
  const username = input.username || null;

  if (source === 'telegram') {
    const authorization = authorizeTelegramChat(chatId);
    if (!authorization.allowed) {
      return {
        ok: false,
        mode: 'empty',
        action: 'unauthorized',
        requiresConfirmation: false,
        reply: authorization.reason,
        data: { chatId, authorized: false }
      };
    }
  }

  if (!text) {
    return {
      ok: false,
      mode: 'empty',
      action: 'empty',
      requiresConfirmation: false,
      reply: 'Send /commands to see available actions, or use ! before a terminal command to queue it for review.'
    };
  }

  if (text.startsWith('!')) {
    return routeTerminalIntent({
      command: text.slice(1).trim(),
      source,
      chatId,
      username
    });
  }

  if (text.toLowerCase().startsWith('/shell ')) {
    return routeTerminalIntent({
      command: text.slice('/shell '.length).trim(),
      source,
      chatId,
      username
    });
  }

  if (text.startsWith('/')) {
    return routeBotCommand(text, buildCommandAccess(input), {
      source,
      chatId
    });
  }

  return {
    ok: true,
    mode: 'assistant',
    action: 'assistant_prompt',
    requiresConfirmation: false,
    reply: [
      'Central node received the operator prompt.',
      'Jamie/LLM delegation is the next layer; for now use /commands for routed actions or !command to queue terminal intent.'
    ].join(' ')
  };
}

export function extractTelegramMessage(update: any): TelegramMessageEnvelope | null {
  const message = update?.message || update?.edited_message || update?.channel_post;
  const text = message?.text || message?.caption;
  const chatId = message?.chat?.id;

  if (text === undefined || chatId === undefined || chatId === null) return null;

  return {
    chatId: String(chatId),
    text: String(text),
    username: message?.from?.username || message?.from?.first_name || null
  };
}

export function authorizeTelegramChat(chatId: string | null) {
  const allowedIds = getAuthorizedTelegramChatIds();

  if (!allowedIds.length) {
    return {
      allowed: false,
      reason: 'Telegram operator chat is not configured. Set AUTHORIZED_USER_ID or TELEGRAM_OPERATOR_CHAT_ID.'
    };
  }

  if (!chatId) {
    return {
      allowed: false,
      reason: 'Telegram update did not include a chat id.'
    };
  }

  if (!allowedIds.includes(chatId)) {
    return {
      allowed: false,
      reason: 'This Telegram chat is not authorized for the Sunset Pulse operator bridge.'
    };
  }

  return {
    allowed: true,
    reason: 'Authorized Telegram operator.'
  };
}

function routeBotCommand(text: string, access: OperatorAccess, context: { source: OrchestratorCommandSource; chatId: string | null }): OrchestratorCommandResult {
  const [rawCommand = '', ...argParts] = text.split(/\s+/);
  const command = rawCommand.replace(/^\//, '').split('@')[0].toLowerCase();
  const args = argParts.join(' ').trim();

  switch (command) {
    case 'status':
      return commandResult('status', formatStatus(access));
    case 'sessions':
      return commandResult('sessions', formatSessions(access));
    case 'commands':
    case 'help':
      return commandResult('commands', formatCommands());
    case 'cancel':
      return commandResult('cancel', formatCancel(context));
    case 'tah':
      return commandResult('tah', formatTahSearch(args));
    case 'places':
      return commandResult('places', formatPlaces(args));
    case 'check':
      return commandResult('check', formatBrowserCheck());
    case 'pack_master':
    case 'pack-master':
      return commandResult('pack_master', [
        'Master packaging is a guarded local action.',
        'Run this from the repo when you are ready: npm run tah:pack-master'
      ].join('\n'), { requiresConfirmation: true });
    default:
      return {
        ok: false,
        mode: 'bot_command',
        action: 'unknown_command',
        requiresConfirmation: false,
        reply: `Unknown command /${command}. Send /commands for the menu.`
      };
  }
}

function routeTerminalIntent(input: { command: string; source: OrchestratorCommandSource; chatId: string | null; username: string | null }): OrchestratorCommandResult {
  if (!input.command) {
    return {
      ok: false,
      mode: 'terminal',
      action: 'terminal_empty',
      requiresConfirmation: false,
      reply: 'Add a command after ! or /shell. Example: !git status'
    };
  }

  const risk = classifyTerminalRisk(input.command);
  const intent = enqueueTerminalIntent({
    source: input.source,
    chatId: input.chatId,
    username: input.username,
    command: input.command,
    riskLevel: risk.level,
    reason: risk.reason
  });

  return {
    ok: true,
    mode: 'terminal',
    action: 'terminal_intent_queued',
    requiresConfirmation: true,
    terminalIntent: intent,
    reply: [
      `Terminal intent queued: ${intent.id}`,
      `Risk: ${intent.riskLevel} - ${intent.reason}`,
      `Command: ${intent.command}`,
      'It has not been executed. Review it in the orchestrator console before running anything locally.'
    ].join('\n')
  };
}

function commandResult(action: string, reply: string, options: { requiresConfirmation?: boolean; data?: any } = {}): OrchestratorCommandResult {
  return {
    ok: true,
    mode: 'bot_command',
    action,
    requiresConfirmation: Boolean(options.requiresConfirmation),
    reply,
    data: options.data
  };
}

function formatStatus(access: OperatorAccess) {
  const snapshot = getOrchestratorSnapshot(access);
  const archive = snapshot.masterArchive;
  const pending = snapshot.commandQueue.pendingTerminalIntentCount;

  return [
    'Sunset Pulse central node status:',
    `Master archive: ${archive.status} (${archive.sourceCount} sources / ${archive.shardCount} shards)`,
    `Telegram: ${snapshot.telegram.configured ? 'configured' : 'needs token'}`,
    `Bridge groups: ${snapshot.bridge.groups.length}`,
    `Pending terminal intents: ${pending}`,
    `Generated: ${snapshot.generatedAt}`
  ].join('\n');
}

function formatSessions(access: OperatorAccess) {
  const groups = getOrchestratorSnapshot(access).bridge.groups;
  if (!groups.length) return 'No bridge-like process groups detected.';

  return [
    'Bridge process groups:',
    ...groups.slice(0, 6).map(group => {
      const names = group.processNames.join(', ') || 'unknown process';
      return `root ${group.rootPid}: ${group.processCount} process(es), ${names}`;
    })
  ].join('\n');
}

function formatCommands() {
  return getBotFatherCommands()
    .map(command => `/${command.command} - ${command.description}`)
    .join('\n');
}

function formatCancel(context: { source: OrchestratorCommandSource; chatId: string | null }) {
  const cancelled = cancelTerminalIntents({
    includeAll: context.source === 'console',
    chatId: context.source === 'telegram' ? context.chatId : undefined
  });
  return cancelled
    ? `Cancelled ${cancelled} pending terminal intent${cancelled === 1 ? '' : 's'}.`
    : 'No pending terminal intents to cancel.';
}

function formatTahSearch(query: string) {
  if (!query) return 'Add a search query after /tah. Example: /tah Sunset Texas history';

  try {
    const result = searchTahMaster({ query, limit: 3 });
    if (!result.results.length) return `No TAH results found for "${query}".`;

    return [
      `TAH results for "${query}":`,
      ...result.results.map(item => {
        const title = item.title || item.slug || item.source || 'Untitled';
        const excerpt = compactText(item.text || '', 140);
        return `${item.rank}. ${title} (${Math.round(item.score)}) - ${excerpt}`;
      })
    ].join('\n');
  } catch (error: any) {
    return `TAH search is unavailable: ${error.message || 'unknown error'}`;
  }
}

function formatPlaces(query: string) {
  try {
    const result = listTahMasterPlaces({ q: query, limit: 5 });
    if (!result.places.length) return query ? `No Atlas places found for "${query}".` : 'No Atlas places have been extracted yet.';

    return [
      query ? `Atlas places for "${query}":` : 'Atlas places:',
      ...result.places.map(place => {
        const region = place.region ? `, ${place.region}` : '';
        const anchor = place.physicalAnchor ? ` - ${place.physicalAnchor}` : '';
        return `${place.label}${region}: ${place.binding}%${anchor}`;
      })
    ].join('\n');
  } catch (error: any) {
    return `Atlas places are unavailable: ${error.message || 'unknown error'}`;
  }
}

function formatBrowserCheck() {
  const check = runOrchestratorBrowserCheck();

  return [
    `Browser-style check: ${check.status}`,
    ...check.steps.map(step => `${step.status === 'passed' ? 'PASS' : 'FAIL'} ${step.label}: ${step.detail}`)
  ].join('\n');
}

function classifyTerminalRisk(command: string): { level: TerminalRiskLevel; reason: string } {
  const normalized = command.trim().toLowerCase();
  const highRisk = [
    /\brm\b/,
    /\bdel\b/,
    /\bremove-item\b/,
    /\brmdir\b/,
    /\bgit\s+reset\b/,
    /\bgit\s+clean\b/,
    /\bformat\b/,
    /\bshutdown\b/,
    /\brestart-computer\b/,
    /\bvercel\b.*\b--prod\b/,
    /\bnpm\s+publish\b/
  ];

  if (highRisk.some(pattern => pattern.test(normalized))) {
    return { level: 'high', reason: 'Command can delete, reset, publish, deploy, or stop services.' };
  }

  const lowRisk = [
    /^git\s+status\b/,
    /^pwd\b/,
    /^date\b/,
    /^dir\b/,
    /^ls\b/,
    /^node\s+--version\b/,
    /^npm\s+run\s+test:unit\b/,
    /^npx\s+next\s+lint\b/
  ];

  if (lowRisk.some(pattern => pattern.test(normalized))) {
    return { level: 'low', reason: 'Read-only or local verification command.' };
  }

  return { level: 'medium', reason: 'Command needs operator review before execution.' };
}

function buildCommandAccess(input: OrchestratorCommandInput): OperatorAccess {
  if (input.access) return input.access;

  return {
    allowed: true,
    mode: input.source === 'telegram' ? 'authenticated' : 'local',
    reason: input.source === 'telegram' ? 'Authorized Telegram operator.' : 'Local operator access.',
    user: {
      id: input.chatId ? `telegram:${input.chatId}` : 'local-console',
      email: null,
      role: 'operator',
      name: input.username || null
    }
  };
}

function normalizeChatId(chatId: string | number | null | undefined) {
  if (chatId === undefined || chatId === null) return null;
  return String(chatId);
}

function getAuthorizedTelegramChatIds() {
  return [
    process.env.AUTHORIZED_USER_ID,
    process.env.TELEGRAM_OPERATOR_CHAT_ID
  ]
    .filter(Boolean)
    .flatMap(value => String(value).split(','))
    .map(value => value.trim())
    .filter(Boolean);
}

function compactText(text: string, maxLength: number) {
  const compact = text.replace(/\s+/g, ' ').trim();
  if (compact.length <= maxLength) return compact;
  return `${compact.slice(0, maxLength - 3)}...`;
}
