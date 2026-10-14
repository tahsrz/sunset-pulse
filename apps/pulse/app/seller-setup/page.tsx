import React from 'react';
import {SellerWorkspaceNav} from '@/components/realtor/SellerWorkspaceNav';
import {SellerOverviewPanel} from '@/components/realtor/SellerOverviewPanel';
import {FieldbookShell} from '@/components/realtor/FieldbookShell';
export default function SellerSetupPage(){return <FieldbookShell title="Setup" navigation={<SellerWorkspaceNav active="/seller-setup"/>}><SellerOverviewPanel mode="setup"/></FieldbookShell>;}
