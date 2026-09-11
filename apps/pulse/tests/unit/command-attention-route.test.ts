import { describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import { POST } from '@/app/api/commands/attention/route';

describe('bounded attention route', () => {
  it('rejects malformed and oversized requests without command execution', async () => {
    const invalid = await POST(new Request('http://localhost/api/commands/attention', { method: 'POST', body: '{' }));
    expect(invalid.status).toBe(400);
    const oversized = await POST(new Request('http://localhost/api/commands/attention', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ windowId: 'w', agents: [{ id: 'a', workerId: 'follow-up-writer', label: 'a', assignment: 'x', assignmentRevision: 1 }], segments: [{ id: 's', sessionId: 's', sequence: 1, text: 'x'.repeat(2_001), capturedAt: 1, final: true }] }) }));
    expect(oversized.status).toBe(400);
  });

  it('returns bounded rules-based decisions', async () => {
    const response = await POST(new Request('http://localhost/api/commands/attention', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ windowId: 'w', agents: [{ id: 'a', workerId: 'follow-up-writer', label: 'Follow-up', assignment: 'Write follow-ups', assignmentRevision: 1 }], segments: [{ id: 's', sessionId: 's', sequence: 1, text: 'Please write a follow up for the buyer', capturedAt: 1, final: true }] }) }));
    expect(response.status).toBe(200);
    expect((await response.json()).decisions[0].action).toBe('submit');
  });
});
