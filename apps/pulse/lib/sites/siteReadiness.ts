import type { TenantSite } from '@/lib/sites/siteData';

export type SiteReadinessCheck = {
  key: string;
  label: string;
  complete: boolean;
};

export function getSiteReadinessChecks(site: Pick<TenantSite, 'agentProfile' | 'complianceProfile' | 'integrationProfile' | 'siteName'>): SiteReadinessCheck[] {
  return [
    {
      key: 'siteName',
      label: 'Public site name',
      complete: isPresent(site.siteName),
    },
    {
      key: 'agentName',
      label: 'Agent display name',
      complete: isPresent(site.agentProfile.displayName),
    },
    {
      key: 'brokerage',
      label: 'Brokerage name',
      complete: isPresent(site.agentProfile.brokerageName),
    },
    {
      key: 'contact',
      label: 'Lead email or agent email',
      complete: isPresent(site.integrationProfile.leadEmail) || isPresent(site.agentProfile.email),
    },
    {
      key: 'compliance',
      label: 'Compliance disclaimer',
      complete: isPresent(site.complianceProfile.footerDisclaimer) && isPresent(site.complianceProfile.mlsDisclaimer),
    },
    {
      key: 'hotList',
      label: 'Image-backed MLS hot-list IDs',
      complete: Array.isArray(site.integrationProfile.hotListMlsIds) && site.integrationProfile.hotListMlsIds.length > 0,
    },
  ];
}

export function isSiteReadyToPublish(site: Pick<TenantSite, 'agentProfile' | 'complianceProfile' | 'integrationProfile' | 'siteName'>) {
  return getSiteReadinessChecks(site).every((check) => check.complete);
}

function isPresent(value: unknown): boolean {
  return typeof value === 'string' ? value.trim().length > 0 : Boolean(value);
}
