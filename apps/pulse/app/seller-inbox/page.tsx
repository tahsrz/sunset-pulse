import { notFound } from 'next/navigation';
import { z } from 'zod';
import RealtorWorkspace from '@/components/realtor/RealtorWorkspace';

export const metadata = { title: 'Seller inbox | Sunset Pulse' };
export default async function SellerInboxPage({ searchParams }: {
  searchParams: Promise<{ leadId?: string }>;
}) {
  const { leadId } = await searchParams;
  if (leadId && !z.string().uuid().safeParse(leadId).success) notFound();
  return <RealtorWorkspace section="seller-inbox" sellerLeadId={leadId} />;
}
