/**
 * Pulse Telegram Bridge
 * Notification and operator reply helpers for Jamie and the central node.
 */

type TelegramSendOptions = {
  parseMode?: 'Markdown' | 'MarkdownV2' | 'HTML';
  disableWebPagePreview?: boolean;
};

export async function sendTelegramNotification(message: string, chatId: string | undefined = getDefaultOperatorChatId()) {
  return sendTelegramMessage(chatId, message, { parseMode: 'Markdown' });
}

export async function sendTelegramMessage(chatId: string | number | null | undefined, message: string, options: TelegramSendOptions = {}) {
  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!token || !chatId) {
    console.warn('[TELEGRAM_BRIDGE] Missing token or chat ID. Skipping message.');
    return null;
  }

  const url = `https://api.telegram.org/bot${token}/sendMessage`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: options.parseMode,
        disable_web_page_preview: options.disableWebPagePreview ?? true
      })
    });

    const data = await response.json();
    if (!data.ok) throw new Error(data.description || 'Telegram sendMessage failed.');

    console.log('[TELEGRAM_BRIDGE] Message sent.');
    return data;
  } catch (error) {
    console.error('[TELEGRAM_BRIDGE] Failed to send message:', error);
    return null;
  }
}

function getDefaultOperatorChatId() {
  const firstConfigured = process.env.AUTHORIZED_USER_ID || process.env.TELEGRAM_OPERATOR_CHAT_ID || '';
  return firstConfigured.split(',')[0]?.trim() || undefined;
}
