import React from 'react';
import Link from 'next/link';
import { z } from 'zod';
import { realtorDateSchema } from '@/lib/realtor-workspace/contracts';

const sellerSourceSchema = z.object({ id: z.string().uuid() });

export function PlannerTaskLinks({ dueDate, sellerSourceAvailable, sellerLead, showPlanner = true }: {
  dueDate?: unknown; sellerSourceAvailable?: unknown; sellerLead?: unknown; showPlanner?: boolean;
}) {
  const date = realtorDateSchema.safeParse(dueDate);
  const source = sellerSourceAvailable === true ? sellerSourceSchema.safeParse(sellerLead) : null;
  if (!showPlanner && !source?.success) return null;
  return <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs font-semibold text-cyan-200">
    {showPlanner ? <Link href={date.success ? `/planner?date=${encodeURIComponent(date.data)}` : '/planner'} className="underline">Open planner task</Link> : null}
    {source?.success ? <Link href={`/seller-inbox?leadId=${encodeURIComponent(source.data.id)}`} className="underline">Open seller request</Link> : null}
  </div>;
}
