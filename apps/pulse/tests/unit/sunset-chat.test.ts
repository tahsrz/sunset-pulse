import { describe, expect, it } from 'vitest';
import {
  getSunsetChatExpiresAt,
  normalizeSunsetChatInput,
  SUNSET_CHAT_MAX_MESSAGE_LENGTH,
  validateSunsetChatInput,
} from '@/lib/grill/sunsetChat';
import { getApprovedSunsetChatModeratorEmails } from '@/lib/grill/sunsetChatModeration';

describe('Sunset Chat rules', () => {
  it('normalizes nickname, message, and tags without content filtering', () => {
    const normalized = normalizeSunsetChatInput({
      nickname: '  Counter   Regular  ',
      message: '  Burgers   are   moving  ',
      tag: 'deal',
    });

    expect(normalized).toEqual({
      nickname: 'Counter Regular',
      message: 'Burgers are moving',
      tag: 'Deal',
    });
  });

  it('keeps arbitrary message words and only enforces length', () => {
    const message = 'x'.repeat(SUNSET_CHAT_MAX_MESSAGE_LENGTH + 25);
    const normalized = normalizeSunsetChatInput({
      nickname: 'Taz',
      message,
      tag: 'Local',
    });

    expect(normalized.message).toHaveLength(SUNSET_CHAT_MAX_MESSAGE_LENGTH);
  });

  it('requires a nickname and message', () => {
    expect(validateSunsetChatInput({ nickname: 'A', message: 'Hello' })).toEqual({
      ok: false,
      message: 'Nickname must be at least 2 characters.',
    });
    expect(validateSunsetChatInput({ nickname: 'Taz', message: '' })).toEqual({
      ok: false,
      message: 'Message is required.',
    });
  });

  it('expires posts after 48 hours', () => {
    const now = new Date('2026-06-08T12:00:00.000Z');
    expect(getSunsetChatExpiresAt(now).toISOString()).toBe('2026-06-10T12:00:00.000Z');
  });

  it('uses approved emails for staff moderation', () => {
    const previousModerators = process.env.SUNSET_CHAT_MODERATOR_EMAILS;
    const previousOwner = process.env.SUNSET_CHAT_OWNER_EMAIL;
    const previousOperator = process.env.OPERATOR_EMAIL;
    const previousAuthorized = process.env.AUTHORIZED_EMAIL;

    process.env.SUNSET_CHAT_MODERATOR_EMAILS = ' cook@sunset.local, CASHIER@sunset.local ';
    process.env.SUNSET_CHAT_OWNER_EMAIL = 'owner@sunset.local';
    delete process.env.OPERATOR_EMAIL;
    delete process.env.AUTHORIZED_EMAIL;

    expect(getApprovedSunsetChatModeratorEmails()).toEqual([
      'cook@sunset.local',
      'cashier@sunset.local',
      'owner@sunset.local',
    ]);

    restoreEnv('SUNSET_CHAT_MODERATOR_EMAILS', previousModerators);
    restoreEnv('SUNSET_CHAT_OWNER_EMAIL', previousOwner);
    restoreEnv('OPERATOR_EMAIL', previousOperator);
    restoreEnv('AUTHORIZED_EMAIL', previousAuthorized);
  });
});

function restoreEnv(key: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[key];
    return;
  }
  process.env[key] = value;
}
