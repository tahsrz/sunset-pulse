import { beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from '@/app/api/sms/opt-in/route';

const mocks = vi.hoisted(() => ({
  connectDB: vi.fn(),
  findOneAndUpdate: vi.fn(),
  applyApiRateLimit: vi.fn()
}));

vi.mock('@/lib/core/database', () => ({
  default: mocks.connectDB
}));

vi.mock('@/models/SmsOptIn', () => ({
  default: {
    findOneAndUpdate: mocks.findOneAndUpdate
  }
}));

vi.mock('@/lib/core/apiRateLimit', () => ({
  applyApiRateLimit: mocks.applyApiRateLimit
}));

describe('sms opt-in route', () => {
  beforeEach(() => {
    mocks.connectDB.mockReset();
    mocks.findOneAndUpdate.mockReset();
    mocks.applyApiRateLimit.mockReset();
    mocks.applyApiRateLimit.mockResolvedValue(null);
  });

  it('rejects submissions without a separately selected SMS use case', async () => {
    const response = await POST(new Request('http://localhost/api/sms/opt-in', {
      method: 'POST',
      body: JSON.stringify({
        phone: '(817) 555-0123',
        useCases: {}
      })
    }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe(true);
    expect(body.details.useCases[0]).toContain('Select at least one');
    expect(mocks.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('stores selected consent use cases as separate audit records', async () => {
    mocks.connectDB.mockResolvedValue(undefined);
    mocks.findOneAndUpdate.mockReturnValue({
      lean: vi.fn().mockResolvedValue({
        phone: '+18175550123',
        status: 'opted_in',
        consentedAt: new Date('2026-06-18T12:00:00.000Z')
      })
    });

    const response = await POST(new Request('http://localhost/api/sms/opt-in', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-forwarded-for': '203.0.113.5',
        'user-agent': 'vitest'
      },
      body: JSON.stringify({
        name: 'Taylor',
        email: 'taylor@example.com',
        phone: '(817) 555-0123',
        page: '/sms-opt-in/property-alerts',
        useCases: {
          property_alerts: true,
          scheduling_alerts: false,
          order_updates: true,
          local_offers: false
        },
        source: 'sms-opt-in-webform'
      })
    }));
    const body = await response.json();
    const [, update] = mocks.findOneAndUpdate.mock.calls[0];

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.selectedUseCases).toEqual(['property_alerts', 'order_updates']);
    expect(mocks.findOneAndUpdate).toHaveBeenCalledWith(
      { phone: '+18175550123' },
      expect.any(Object),
      expect.objectContaining({ upsert: true, new: true })
    );
    expect(update.$set.consentUseCases).toHaveLength(2);
    expect(update.$set.consentUseCases.map((useCase: any) => useCase.id)).toEqual(['property_alerts', 'order_updates']);
    expect(update.$set.consentUseCases.map((useCase: any) => useCase.endBusiness)).toEqual([
      'Sunset Pulse Real Estate Services',
      'Sunset Gas & Grill'
    ]);
    expect(update.$set.consentText).toContain('Sunset Pulse Real Estate Services - Property Alerts (informational)');
    expect(update.$set.consentText).toContain('Sunset Gas & Grill - Order Updates (transactional)');
    expect(update.$set.consentText).not.toContain('Sunset Gas & Grill - Local Offers (promotional)');
    expect(update.$set.metadata.page).toBe('/sms-opt-in/property-alerts');
    expect(update.$set.metadata.selectedUseCases).toEqual(['property_alerts', 'order_updates']);
    expect(update.$set.termsVersion).toBe('2026-06-18-end-business-use-cases');
  });
});
