/**
 * Pulse Telegram Bridge
 * Proactive notification system for Jamie's High-Stakes Hooks.
 */

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const OPERATOR_CHAT_ID = process.env.AUTHORIZED_USER_ID; // Primary operator ID

export async function sendTelegramNotification(message: string, chatId: string = OPERATOR_CHAT_ID) {
  if (!TELEGRAM_BOT_TOKEN || !chatId) {
    console.warn('⚠️ [TELEGRAM_BRIDGE] Missing token or chat ID. Skipping notification.');
    return null;
  }

  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'Markdown'
      })
    });

    const data = await response.json();
    if (!data.ok) throw new Error(data.description);
    
    console.log('📡 [TELEGRAM_BRIDGE] Proactive notification sent.');
    return data;
  } catch (error) {
    console.error('❌ [TELEGRAM_BRIDGE] Failed to send notification:', error);
    return null;
  }
}
