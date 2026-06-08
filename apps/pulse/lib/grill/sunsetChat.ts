export const SUNSET_CHAT_TAGS = ['Food', 'Store', 'Local', 'Deal', 'Lost & Found'] as const;
export type SunsetChatTag = typeof SUNSET_CHAT_TAGS[number];

export const SUNSET_CHAT_MAX_MESSAGE_LENGTH = 240;
export const SUNSET_CHAT_MAX_NICKNAME_LENGTH = 32;
export const SUNSET_CHAT_EXPIRY_HOURS = 48;

export type SunsetChatInput = {
  nickname?: string;
  message?: string;
  tag?: string;
};

export function normalizeSunsetChatInput(input: SunsetChatInput) {
  const nickname = String(input.nickname || '')
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, SUNSET_CHAT_MAX_NICKNAME_LENGTH);
  const message = String(input.message || '')
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, SUNSET_CHAT_MAX_MESSAGE_LENGTH);
  const tag = normalizeSunsetChatTag(input.tag);

  return { nickname, message, tag };
}

export function validateSunsetChatInput(input: SunsetChatInput) {
  const normalized = normalizeSunsetChatInput(input);

  if (normalized.nickname.length < 2) {
    return { ok: false as const, message: 'Nickname must be at least 2 characters.' };
  }

  if (normalized.message.length < 1) {
    return { ok: false as const, message: 'Message is required.' };
  }

  return { ok: true as const, value: normalized };
}

export function getSunsetChatExpiresAt(now = new Date()) {
  return new Date(now.getTime() + SUNSET_CHAT_EXPIRY_HOURS * 60 * 60 * 1000);
}

function normalizeSunsetChatTag(tag?: string): SunsetChatTag {
  const value = String(tag || '').trim().toLowerCase();
  return SUNSET_CHAT_TAGS.find((candidate) => candidate.toLowerCase() === value) || 'Local';
}
