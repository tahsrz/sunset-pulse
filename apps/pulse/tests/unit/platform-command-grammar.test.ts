import { describe, expect, it } from 'vitest';
import { parsePlatformCommand } from '@/lib/platform/commands/grammar';

describe('workspace command grammar', () => {
  it('accepts only the reviewed list, pinned app start, and UUID cancel forms', () => {
    expect(parsePlatformCommand('/ps')).toEqual({ ok: true, command: { type: 'list_runs' } });
    expect(parsePlatformCommand('/start real-estate-readiness@1')).toEqual({ ok: true, command: { type: 'start_app', appKey: 'real-estate-readiness', version: 1 } });
    expect(parsePlatformCommand('/cancel 11111111-1111-4111-8111-111111111111')).toEqual({ ok: true, command: { type: 'cancel_run', runId: '11111111-1111-4111-8111-111111111111' } });
    expect(parsePlatformCommand(':focus inbox')).toEqual({ ok: true, command: { type: 'focus_inbox' } });
    expect(parsePlatformCommand(':focus run 11111111-1111-4111-8111-111111111111')).toEqual({ ok: true, command: { type: 'focus_run', runId: '11111111-1111-4111-8111-111111111111' } });
    expect(parsePlatformCommand(':close 11111111-1111-4111-8111-111111111111')).toEqual({ ok: true, command: { type: 'close_window', windowId: '11111111-1111-4111-8111-111111111111' } });
    expect(parsePlatformCommand(':reset-layout')).toEqual({ ok: true, command: { type: 'reset_layout' } });
  });

  it.each([
    '/start unknown@0', '/start RealEstate@1', '/start app@1 extra', '/cancel not-a-uuid',
    '/ps; SELECT * FROM platform_runs', '/exec https://example.com', '/start app@1\n/cancel 11111111-1111-4111-8111-111111111111',
  ])('rejects unsupported or shell-like input: %s', (input) => {
    expect(parsePlatformCommand(input).ok).toBe(false);
  });

  it('bounds the command input length', () => {
    expect(parsePlatformCommand(`/ps ${'x'.repeat(253)}`).ok).toBe(false);
  });
});
