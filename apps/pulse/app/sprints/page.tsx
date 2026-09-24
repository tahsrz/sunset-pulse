import { SprintsWorkspace } from '@/app/admin/sprints/SprintsWorkspace';
import { getSessionUser } from '@/lib/core/getSessionUser';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function SprintsPage() {
  if (!(await getSessionUser())) redirect('/login?redirect=/sprints');
  return <main className="min-h-screen bg-slate-950 px-6 py-10 text-slate-100"><div className="mx-auto max-w-5xl"><SprintsWorkspace /></div></main>;
}
