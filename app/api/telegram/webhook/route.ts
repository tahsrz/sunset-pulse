import { NextRequest } from 'next/server';
import { errorResponse, successResponse } from '@/lib/core/apiResponse';
import { extractTelegramMessage, routeOrchestratorCommand } from '@/lib/core/orchestrator_commands';
import { sendTelegramMessage } from '@/lib/communication/telegram';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  return successResponse({
    endpoint: '/api/telegram/webhook',
    configured: Boolean(process.env.TELEGRAM_BOT_TOKEN),
    authorizedChatConfigured: Boolean(process.env.AUTHORIZED_USER_ID || process.env.TELEGRAM_OPERATOR_CHAT_ID),
    secretConfigured: Boolean(process.env.TELEGRAM_WEBHOOK_SECRET || process.env.TELEGRAM_SECRET_TOKEN)
  });
}

export async function POST(request: NextRequest) {
  if (!isWebhookSecretAllowed(request)) {
    return errorResponse('Telegram webhook secret rejected.', 401);
  }

  let update: any;
  try {
    update = await request.json();
  } catch {
    return errorResponse('Invalid Telegram update payload.', 400);
  }

  const envelope = extractTelegramMessage(update);
  if (!envelope) {
    return successResponse({
      endpoint: '/api/telegram/webhook',
      handled: false,
      reason: 'No text message found in update.'
    });
  }

  const result = routeOrchestratorCommand({
    text: envelope.text,
    source: 'telegram',
    chatId: envelope.chatId,
    username: envelope.username
  });

  await sendTelegramMessage(envelope.chatId, result.reply);

  return successResponse({
    endpoint: '/api/telegram/webhook',
    handled: true,
    chatId: envelope.chatId,
    result
  });
}

function isWebhookSecretAllowed(request: NextRequest) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET || process.env.TELEGRAM_SECRET_TOKEN;
  if (!secret) return true;
  return request.headers.get('x-telegram-bot-api-secret-token') === secret;
}
