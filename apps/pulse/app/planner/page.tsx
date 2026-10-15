import RealtorWorkspace from '@/components/realtor/RealtorWorkspace';
import { notFound } from 'next/navigation';
import { realtorDateSchema } from '@/lib/realtor-workspace/contracts';
export const metadata = { title: 'Planner | Sunset Pulse' };
export default async function PlannerPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const { date } = await searchParams;
  if (date && !realtorDateSchema.safeParse(date).success) notFound();
  return <RealtorWorkspace section="planner" plannerDate={date} />;
}
