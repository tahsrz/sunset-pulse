import { NextRequest } from 'next/server';
import { requirePersonalRealtorWorkspace } from '@/lib/realtor-workspace/access.server';
import { realtorApi } from '@/lib/realtor-workspace/http.server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  return realtorApi(request, async (actorId) => {
    const { workspaceId } = await requirePersonalRealtorWorkspace(actorId);
    const { data, error } = await supabaseAdmin.from('sprint_backlog_items')
      .select('id,title,priority,estimate_minutes,status,source_id,created_at')
      .eq('owner_id', actorId).eq('source_type', 'manual').like('source_id', 'seller-acquisition:%')
      .in('status', ['open', 'in_progress']).order('priority', { ascending: true })
      .order('created_at', { ascending: true }).limit(101);
    if (error) throw new Error('Unable to load seller acquisition tasks.');
    const rows = data || [];
    const ids = rows.map((row) => String(row.id));
    const scheduledIds = new Set<string>();
    for (let offset = 0; offset < ids.length; offset += 50) {
      const linked = await supabaseAdmin.from('realtor_planner_items').select('source_sprint_task_id')
        .eq('user_id', actorId).eq('workspace_id', workspaceId)
        .in('source_sprint_task_id', ids.slice(offset, offset + 50));
      if (linked.error) throw new Error('Unable to verify scheduled seller acquisition tasks.');
      for (const row of linked.data || []) scheduledIds.add(String(row.source_sprint_task_id));
    }
    const tasks = rows.filter((row) => !scheduledIds.has(String(row.id))).slice(0, 100).map((row) => ({
      id: String(row.id), title: String(row.title), priority: Number(row.priority),
      estimateMinutes: row.estimate_minutes === null ? null : Number(row.estimate_minutes),
      sourceId: String(row.source_id),
    }));
    return { tasks, truncated: rows.length > 100 };
  });
}
