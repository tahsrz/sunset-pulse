export const SMS_OPT_IN_TERMS_VERSION = '2026-06-18-end-business-use-cases';

export const SMS_OPT_IN_USE_CASES = [
  {
    id: 'property_alerts',
    slug: 'property-alerts',
    endBusiness: 'Sunset Pulse Real Estate Services',
    label: 'Property Alerts',
    category: 'informational',
    description: 'Saved searches, property matches, showing reminders, and market updates.',
    consentText:
      'I agree to receive recurring automated informational SMS/text messages from Sunset Pulse Real Estate Services about saved property searches, property matches, showing reminders, and market updates at the phone number provided. Message frequency varies. Message and data rates may apply. Reply STOP to unsubscribe and HELP for help. Consent is not a condition of purchase.'
  },
  {
    id: 'scheduling_alerts',
    slug: 'scheduling-alerts',
    endBusiness: 'Sunset Gas & Grill',
    label: 'Scheduling Alerts',
    category: 'transactional',
    description: 'Employee schedule notices, shift offers, coverage requests, and roster updates.',
    consentText:
      'I agree to receive recurring automated transactional SMS/text messages from Sunset Gas & Grill about employee schedules, shift offers, coverage requests, and roster updates at the phone number provided. Message frequency varies. Message and data rates may apply. Reply STOP to unsubscribe and HELP for help.'
  },
  {
    id: 'order_updates',
    slug: 'order-updates',
    endBusiness: 'Sunset Gas & Grill',
    label: 'Order Updates',
    category: 'transactional',
    description: 'Grill order confirmations, pickup notices, and paid-order service updates.',
    consentText:
      'I agree to receive automated transactional SMS/text messages from Sunset Gas & Grill about grill order confirmations, pickup notices, and paid-order service updates at the phone number provided. Message frequency varies. Message and data rates may apply. Reply STOP to unsubscribe and HELP for help.'
  },
  {
    id: 'local_offers',
    slug: 'local-offers',
    endBusiness: 'Sunset Gas & Grill',
    label: 'Local Offers',
    category: 'promotional',
    description: 'Promotional local offers, specials, and Sunset Gas & Grill announcements.',
    consentText:
      'I agree to receive recurring automated promotional SMS/text messages from Sunset Gas & Grill about local offers, specials, and announcements at the phone number provided. Message frequency varies. Message and data rates may apply. Reply STOP to unsubscribe and HELP for help. Consent is not a condition of purchase.'
  }
] as const;

export type SmsOptInUseCaseId = (typeof SMS_OPT_IN_USE_CASES)[number]['id'];
export type SmsOptInUseCaseSlug = (typeof SMS_OPT_IN_USE_CASES)[number]['slug'];

export function getSelectedSmsOptInUseCases(useCases: Record<string, unknown> = {}) {
  return SMS_OPT_IN_USE_CASES.filter((useCase) => useCases[useCase.id] === true);
}

export function getSmsOptInUseCaseBySlug(slug: string) {
  return SMS_OPT_IN_USE_CASES.find((useCase) => useCase.slug === slug);
}

export function buildSmsConsentAuditText(selectedUseCases: typeof SMS_OPT_IN_USE_CASES[number][]) {
  return selectedUseCases
    .map((useCase) => `${useCase.endBusiness} - ${useCase.label} (${useCase.category}): ${useCase.consentText}`)
    .join('\n\n');
}
