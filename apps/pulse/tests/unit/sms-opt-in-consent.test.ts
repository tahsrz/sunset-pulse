import { describe, expect, it } from 'vitest';
import {
  SMS_OPT_IN_USE_CASES,
  getSmsOptInUseCaseBySlug,
} from '@/lib/sms/consent';

describe('sms opt-in consent configuration', () => {
  it('exposes one stable dedicated page slug for each consent use case', () => {
    expect(SMS_OPT_IN_USE_CASES.map((useCase) => useCase.slug)).toEqual([
      'property-alerts',
      'scheduling-alerts',
      'order-updates',
      'local-offers',
    ]);
  });

  it('resolves dedicated opt-in page slugs back to the end business consent record', () => {
    const propertyAlerts = getSmsOptInUseCaseBySlug('property-alerts');
    const orderUpdates = getSmsOptInUseCaseBySlug('order-updates');

    expect(propertyAlerts).toEqual(expect.objectContaining({
      id: 'property_alerts',
      endBusiness: 'Sunset Pulse Real Estate Services',
    }));
    expect(orderUpdates).toEqual(expect.objectContaining({
      id: 'order_updates',
      endBusiness: 'Sunset Gas & Grill',
    }));
    expect(getSmsOptInUseCaseBySlug('missing-use-case')).toBeUndefined();
  });
});
