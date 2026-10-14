import React from 'react';
import Link from 'next/link';
import { SellerWorkspaceNav } from '@/components/realtor/SellerWorkspaceNav';
import { FieldbookShell } from '@/components/realtor/FieldbookShell';
import { SellerCaseList } from '@/components/realtor/SellerCaseList';
export default function SellerCasesPage() { return <FieldbookShell title="Seller cases" navigation={<SellerWorkspaceNav active="/seller-cases"/>}><div className="space-y-6"><p className="text-sm text-slate-300">Property, preparation, appointments, messages and shared progress for each seller request.</p><Link className="text-cyan-200 underline" href="/today">Open Today</Link><SellerCaseList/></div></FieldbookShell>; }
