import type { SellerOverview } from './sellerOverviewContract';

export type SellerSetupHealth = SellerOverview['health'];
export type SellerSetupStep = {
  key: 'planner' | 'website' | 'reminders' | 'first_request';
  title: string;
  status: 'ready' | 'needs_action' | 'unavailable';
  detail: string;
  href: string;
  action: string;
};

export function deriveSellerSetupSteps(health: SellerSetupHealth): SellerSetupStep[] {
  const plannerReady = health.plannerConfigured && Boolean(health.timeZone);
  const websiteReady = health.activeSites > 0 && health.intakeConfigured;
  const remindersStatus = !health.plannerConfigured ? 'unavailable' : health.remindersEnabled ? 'ready' : 'needs_action';

  return [
    {
      key: 'planner', title: 'Your day and timezone', status: plannerReady ? 'ready' : 'needs_action',
      detail: plannerReady ? `Your planner uses ${health.timeZone}.` : 'Set up your personal planner and choose the timezone you use for seller appointments.',
      href: '/today', action: plannerReady ? 'Open Today' : 'Set up your planner',
    },
    {
      key: 'website', title: 'Your seller website', status: websiteReady ? 'ready' : 'unavailable',
      detail: websiteReady ? `${health.activeSites} active ${health.activeSites === 1 ? 'website is' : 'websites are'} connected to seller intake.` : 'A seller website with connected intake is not available for this account yet. Review the public seller form or use the site setup link provided when your website was created.',
      href: '/seller-plan', action: 'Preview seller intake',
    },
    {
      key: 'reminders', title: 'Your reminders', status: remindersStatus,
      detail: health.remindersEnabled ? 'In-app reminders are enabled.' : health.plannerConfigured ? 'In-app reminders are off. Turn them on in your planner if you want seller follow-ups there.' : 'Set up your planner before choosing its reminder preference.',
      href: '/today', action: health.remindersEnabled ? 'Review planner' : 'Review reminders',
    },
    {
      key: 'first_request', title: 'Your first seller request', status: health.lastRequest ? 'ready' : 'needs_action',
      detail: health.lastRequest ? `A seller request was recorded ${new Date(health.lastRequest).toLocaleString(undefined, { timeZone: health.timeZone || 'America/Chicago' })}.` : 'Submit an inquiry you intend to keep, then confirm its contact permission in your inbox.',
      href: health.lastRequest ? '/seller-inbox' : '/seller-plan', action: health.lastRequest ? 'Open your inbox' : 'Open seller request form',
    },
  ];
}
