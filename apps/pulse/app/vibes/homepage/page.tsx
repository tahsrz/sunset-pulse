import React from 'react';
import { headers } from 'next/headers';
import { getOperatorAccess } from '@/lib/core/operator_access';
import { PlatformHomepageEditor } from './PlatformHomepageEditor';

export const dynamic = 'force-dynamic';
export default async function HomepageWorkspace() {
  const access = await getOperatorAccess((await headers()).get('host'));
  if (!access.allowed)
    return (
      <p role="alert" className="p-8">
        Sign in as an operator to manage the platform homepage.
      </p>
    );
  return <PlatformHomepageEditor />;
}
