import React from 'react';
import { notFound } from 'next/navigation';
import { z } from 'zod';
import { SellerCaseWorkspace } from '@/components/realtor/SellerCaseWorkspace';
export default async function SellerCasePage({ params }: { params: Promise<{ leadId: string }> }) {
  const { leadId } = await params; if (!z.string().uuid().safeParse(leadId).success) notFound();
  return <SellerCaseWorkspace key={leadId} leadId={leadId}/>;
}
