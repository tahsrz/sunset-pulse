'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, type ReactNode } from 'react';
import { sellerCampaignQuery } from '@/lib/marketing/sellerCampaignQuery';

type MarketingCampaignLinkProps = {
  className?: string;
  children: ReactNode;
  href: string;
};

function CampaignAwareLink({ className, children, href }: MarketingCampaignLinkProps) {
  const params = useSearchParams();
  const campaignQuery = sellerCampaignQuery({
    utm_source: params.get('utm_source') ?? undefined,
    utm_medium: params.get('utm_medium') ?? undefined,
    utm_campaign: params.get('utm_campaign') ?? undefined,
    utm_content: params.get('utm_content') ?? undefined,
  });
  const [pathAndQuery, hash = ''] = href.split('#', 2);
  const destination = campaignQuery
    ? `${pathAndQuery}${pathAndQuery.includes('?') ? '&' : '?'}${campaignQuery.slice(1)}${hash ? `#${hash}` : ''}`
    : href;

  return <Link className={className} href={destination}>{children}</Link>;
}

export default function MarketingCampaignLink({ className, children, href }: MarketingCampaignLinkProps) {
  return (
    <Suspense fallback={<Link className={className} href={href}>{children}</Link>}>
      <CampaignAwareLink className={className} href={href}>{children}</CampaignAwareLink>
    </Suspense>
  );
}
