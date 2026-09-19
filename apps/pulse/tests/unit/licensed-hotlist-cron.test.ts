import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mockFrom = vi.hoisted(() => vi.fn());

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: mockFrom } }));
vi.mock('@/lib/autonomous-workflows/workflowRegistry.server', () => ({ getWorkflowHandler: vi.fn() }));

import { GET } from '@/app/api/admin/automations/hotlist-email/cron/route';

describe('licensed hot-list workflow scheduler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.CRON_SECRET;
  });

  it('fails closed when the scheduler secret is missing', async () => {
    const response = await GET(new NextRequest('http://localhost/api/admin/automations/hotlist-email/cron'));
    expect(response.status).toBe(503);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('rejects requests without the scheduler bearer token', async () => {
    process.env.CRON_SECRET = 'cron-key';
    const response = await GET(new NextRequest('http://localhost/api/admin/automations/hotlist-email/cron'));
    expect(response.status).toBe(401);
    expect(mockFrom).not.toHaveBeenCalled();
  });
});
