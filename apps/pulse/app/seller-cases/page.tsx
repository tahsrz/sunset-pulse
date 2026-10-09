import React from 'react';
import Link from 'next/link';
import { SellerWorkspaceNav } from '@/components/realtor/SellerWorkspaceNav';
import { SellerCaseList } from '@/components/realtor/SellerCaseList';
export default function SellerCasesPage() { return <main className="min-h-screen bg-slate-950 px-4 py-10 text-white"><div className="mx-auto max-w-6xl space-y-6"><SellerWorkspaceNav active="/seller-cases"/><h1 className="text-3xl font-bold">Seller cases</h1><p className="text-sm text-slate-300">Open a seller case from any owned request to connect its property, preparation, bookings, communications and client progress.</p><Link className="text-cyan-200 underline" href="/today">Start with Today</Link><SellerCaseList/></div></main>; }
