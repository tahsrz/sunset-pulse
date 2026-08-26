import { headers } from 'next/headers';
import { getOperatorAccess } from '@/lib/core/operator_access';
import { getRequestHostFromHeaders } from '@/lib/core/routeAuth';
import { VibeEditor } from './VibeEditor';

export const dynamic = 'force-dynamic';
export default async function VibeEditorPage({ params }: { params: Promise<{ vibeId: string }> }) {
  const access = await getOperatorAccess(getRequestHostFromHeaders(await headers()));
  if (!access.allowed) return <main className="min-h-screen bg-slate-950 p-8 text-white"><h1 className="text-2xl font-black">Access denied</h1><p className="mt-3">{access.reason}</p></main>;
  return <VibeEditor vibeId={(await params).vibeId} />;
}
