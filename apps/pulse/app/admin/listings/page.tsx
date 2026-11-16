import Link from 'next/link';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { getOperatorAccess } from '@/lib/core/operator_access';
import { getRequestHostFromHeaders } from '@/lib/core/routeAuth';
import ListingEditor from './ListingEditor';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Listing Editor | Sunset Pulse' };

export default async function ListingsPage() {
  const access = await getOperatorAccess(getRequestHostFromHeaders(await headers()));
  if (!access.allowed) notFound();

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-slate-100 sm:px-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-3xl font-bold">Listing Editor</h1>
          <Link href="/admin/hot-list" className="text-teal-200 underline underline-offset-4">Tour hot list</Link>
        </div>
        <ListingEditor />
      </div>
    </main>
  );
}
