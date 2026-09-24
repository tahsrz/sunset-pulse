import { z } from 'zod';

const manifestKey = /^[a-z][a-z0-9_-]{0,63}$/;
const uuid = z.string().uuid();

export type PlatformCommand =
  | { type: 'list_runs' }
  | { type: 'start_app'; appKey: string; version: number }
  | { type: 'cancel_run'; runId: string }
  | { type: 'focus_inbox' }
  | { type: 'focus_run'; runId: string }
  | { type: 'close_window'; windowId: string }
  | { type: 'reset_layout' };

export type CommandParseResult = { ok: true; command: PlatformCommand } | { ok: false; error: string };

/** Parse only the reviewed, single-line command grammar; this is not a shell. */
export function parsePlatformCommand(raw: string): CommandParseResult {
  if (raw.length > 256 || /[\r\n\0]/.test(raw)) return { ok: false, error: 'Commands must be one line and at most 256 characters.' };
  const input = raw.trim();
  if (input === '/ps') return { ok: true, command: { type: 'list_runs' } };
  if (input === ':focus inbox') return { ok: true, command: { type: 'focus_inbox' } };
  if (input === ':reset-layout') return { ok: true, command: { type: 'reset_layout' } };

  const start = /^\/start ([a-z][a-z0-9_-]{0,63})@([1-9][0-9]{0,8})$/.exec(input);
  if (start && manifestKey.test(start[1])) {
    return { ok: true, command: { type: 'start_app', appKey: start[1], version: Number(start[2]) } };
  }

  const cancel = /^\/cancel ([0-9a-f-]{36})$/i.exec(input);
  if (cancel && uuid.safeParse(cancel[1]).success) {
    return { ok: true, command: { type: 'cancel_run', runId: cancel[1] } };
  }

  const focusRun = /^:focus run ([0-9a-f-]{36})$/i.exec(input);
  if (focusRun && uuid.safeParse(focusRun[1]).success) {
    return { ok: true, command: { type: 'focus_run', runId: focusRun[1] } };
  }

  const close = /^:close ([0-9a-f-]{36})$/i.exec(input);
  if (close && uuid.safeParse(close[1]).success) {
    return { ok: true, command: { type: 'close_window', windowId: close[1] } };
  }

  return { ok: false, error: 'Supported commands: /ps, /start <manifest-key>@<version>, /cancel <run-id>, :focus inbox, :focus run <run-id>, :close <window-id>, :reset-layout.' };
}
