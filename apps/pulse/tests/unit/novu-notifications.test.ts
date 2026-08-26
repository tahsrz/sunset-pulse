import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getNovuNotificationSnapshot,
  notifyHotLeadWithNovu,
  novuTriggerEndpoint,
  triggerNovuNotification,
} from '@/lib/notifications/novu';

const originalEnv = { ...process.env };
let tempDir: string;

beforeEach(() => {
  vi.restoreAllMocks();
  process.env = { ...originalEnv };
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'novu-events-'));
  process.env.NOVU_LEDGER_PATH = path.join(tempDir, 'novu-events.jsonl');
  process.env.NOVU_API_URL = 'https://api.novu.test';
});

afterEach(() => {
  process.env = { ...originalEnv };
  fs.rmSync(tempDir, { recursive: true, force: true });
});

describe('Novu notification pipeline', () => {
  it('queues locally when Novu credentials are not configured', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    const record = await triggerNovuNotification({
      workflowId: 'lead-hot-alert',
      to: { subscriberId: 'operator', email: 'operator@example.com' },
      payload: { leadName: 'Jane Buyer', probability: 91 },
      source: 'lead_intelligence',
      transactionId: 'lead-1',
    });

    expect(record.status).toBe('queued_local');
    expect(record.payloadKeys).toEqual(['leadName', 'probability']);
    expect(record.diagnostics.reason).toContain('Missing NOVU');
    expect(fetchSpy).not.toHaveBeenCalled();

    const ledger = fs.readFileSync(process.env.NOVU_LEDGER_PATH!, 'utf8');
    expect(ledger).not.toContain('Jane Buyer');
  });

  it('sends Novu trigger requests with ApiKey auth and idempotency headers', async () => {
    process.env.NOVU_SECRET_KEY = 'novu-secret';
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 201,
      json: vi.fn().mockResolvedValue({ acknowledged: true, status: 'processed', transactionId: 'lead-2' }),
    } as any);

    const record = await triggerNovuNotification({
      workflowId: 'lead-hot-alert',
      to: 'operator',
      payload: { probability: 87 },
      transactionId: 'lead-2',
      source: 'lead_intelligence',
    });

    expect(record.status).toBe('sent');
    expect(record.diagnostics).toMatchObject({
      responseStatus: 201,
      novuStatus: 'processed',
      acknowledged: true,
    });
    expect(fetchMock).toHaveBeenCalledWith(novuTriggerEndpoint(), expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({
        Authorization: 'ApiKey novu-secret',
        'idempotency-key': 'lead-2',
      }),
    }));
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toMatchObject({
      name: 'lead-hot-alert',
      to: ['operator'],
      payload: { probability: 87 },
      transactionId: 'lead-2',
    });
  });

  it('builds hot-lead Novu payloads using the operator subscriber defaults', async () => {
    process.env.NOVU_OPERATOR_EMAIL = 'ops@example.com';
    process.env.NOVU_HOT_LEAD_WORKFLOW_ID = 'custom-hot-lead';

    const record = await notifyHotLeadWithNovu({
      lead: { name: 'Riley Seller', email: 'riley@example.com', budget: 700000 },
      probability: 92,
      leadCategory: 'Residential',
      propertyName: 'Sunset Ranch',
      topHook: 'Inventory is tight.',
    });

    expect(record.status).toBe('queued_local');
    expect(record.workflowId).toBe('custom-hot-lead');
    expect(record.source).toBe('lead_intelligence');
    expect(record.recipientRefs).toEqual(['sunset-operator']);
    expect(record.transactionId).toMatch(/^hot-lead:/);
  });

  it('summarizes local notification events', async () => {
    process.env.NOVU_NOTIFICATIONS_DISABLED = 'true';

    await triggerNovuNotification({
      workflowId: 'schedule-reminder',
      to: 'staff-1',
      source: 'scheduling',
      payload: { shift: 'Monday register' },
    });

    const snapshot = getNovuNotificationSnapshot();
    expect(snapshot).toMatchObject({
      status: 'disabled',
      eventCount: 1,
      workflowCounts: { 'schedule-reminder': 1 },
      sourceCounts: { scheduling: 1 },
      statusCounts: { disabled: 1 },
    });
  });
});
