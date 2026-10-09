import React from 'react';
import {SellerWorkspaceNav} from '@/components/realtor/SellerWorkspaceNav';
import {SellerOverviewPanel} from '@/components/realtor/SellerOverviewPanel';
export default function SellerSetupPage(){return <main className="min-h-screen bg-slate-950 px-4 py-10 text-white"><div className="mx-auto max-w-5xl space-y-6"><SellerWorkspaceNav active="/seller-setup"/><h1 className="text-3xl font-bold">Seller setup and health</h1><SellerOverviewPanel mode="setup"/></div></main>;}
