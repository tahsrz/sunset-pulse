'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, type ReactNode } from 'react';
import { sellerCampaignQuery } from '@/lib/marketing/sellerCampaignQuery';

type SellerCampaignLinkProps = {
  className?: string;
  children: ReactNode;
};

function CampaignAwareLink({ className, children }: SellerCampaignLinkProps) {
  const params = useSearchParams();
  const campaignQuery = sellerCampaignQuery({
    utm_source: params.get('utm_source') ?? undefined,
    utm_medium: params.get('utm_medium') ?? undefined,
    utm_campaign: params.get('utm_campaign') ?? undefined,
    utm_content: params.get('utm_content') ?? undefined,
  });

  return <Link className={className} href={`/seller-plan${campaignQuery}`}>{children}</Link>;
}

export default function SellerCampaignLink({ className, children }: SellerCampaignLinkProps) {
  return (
    <Suspense fallback={<Link className={className} href="/seller-plan">{children}</Link>}>
      <CampaignAwareLink className={className}>{children}</CampaignAwareLink>
    </Suspense>
  );
}
