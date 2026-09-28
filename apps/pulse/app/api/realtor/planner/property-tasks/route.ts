import { NextRequest } from 'next/server';
import { requirePersonalRealtorWorkspace } from '@/lib/realtor-workspace/access.server';
import { realtorApi } from '@/lib/realtor-workspace/http.server';
import { listShortlistEntries } from '@/lib/property-sprints/shortlist.server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  return realtorApi(request, async (actorId) => {
    const { workspaceId } = await requirePersonalRealtorWorkspace(actorId);
    const [properties, taskResult] = await Promise.all([
      listShortlistEntries(actorId),
      supabaseAdmin.from('sprint_backlog_items')
        .select('id,title,priority,estimate_minutes,status,property_id,property_task_kind,input_revision,created_at')
        .eq('owner_id', actorId).eq('source_type', 'property_shortlist').in('status', ['open', 'in_progress'])
        .not('property_id', 'is', null).order('priority', { ascending: true }).order('created_at', { ascending: true }).limit(101),
    ]);
    if (taskResult.error) throw new Error('Unable to load your property sprint tasks.');
    const scheduledTaskIds = new Set<string>();
    const taskIds = (taskResult.data || []).map((row) => String(row.id));
    for (let offset = 0; offset < taskIds.length; offset += 50) {
      const scheduled = await supabaseAdmin.from('realtor_planner_items').select('source_sprint_task_id')
        .eq('user_id', actorId).eq('workspace_id', workspaceId)
        .in('source_sprint_task_id', taskIds.slice(offset, offset + 50));
      if (scheduled.error) throw new Error('Unable to safely check which property tasks are already scheduled.');
      for (const row of scheduled.data || []) scheduledTaskIds.add(String(row.source_sprint_task_id));
    }
    const activeProperties = new Map(properties.filter((property) => property.status === 'active').map((property) => [property.id, property]));
    const tasks = (taskResult.data || []).flatMap((task) => {
      if (scheduledTaskIds.has(String(task.id))) return [];
      const property = task.property_id ? activeProperties.get(String(task.property_id)) : undefined;
      if (!property) return [];
      return [{
        id: String(task.id), title: String(task.title), priority: Number(task.priority),
        estimateMinutes: task.estimate_minutes === null ? null : Number(task.estimate_minutes),
        taskKind: String(task.property_task_kind || 'property_task'),
        propertyId: property.id,
        propertyLabel: [property.address || property.mlsId || 'Shortlist property', [property.city, property.state].filter(Boolean).join(', ')].filter(Boolean).join(' · '),
        stale: Number(task.input_revision || 0) !== property.revision,
      }];
    });
    return { tasks: tasks.slice(0, 100), truncated: tasks.length > 100 || (taskResult.data || []).length > 100 };
  });
}
