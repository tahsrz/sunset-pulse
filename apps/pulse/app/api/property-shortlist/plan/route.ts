import { NextRequest, NextResponse } from 'next/server';
import { isAuthResponse, requireSignedInUser } from '@/lib/core/routeAuth';
import { supabaseAdmin } from '@/lib/supabase';
import { buildPropertyBacklog } from '@/lib/property-sprints/buildPropertyBacklog';
import { listPropertyNotes, listShortlistEntries } from '@/lib/property-sprints/shortlist.server';

export async function POST(request: NextRequest) {
  const access = await requireSignedInUser(request);
  if (isAuthResponse(access)) return access;
  const ownerId = access.user.id;
  try {
    const properties = await listShortlistEntries(ownerId);
    const { data: existing, error: existingError } = await supabaseAdmin.from('sprint_backlog_items').select('dedupe_key,status').eq('owner_id', ownerId).not('dedupe_key', 'is', null);
    if (existingError) throw new Error(`Unable to inspect property tasks: ${existingError.message}`);
    const planningProperties = await Promise.all(properties.map(async (property) => ({ ...property, collaborationNotes: (await listPropertyNotes(ownerId, property.id)).map((note) => `${note.authorType}: ${note.body}`) })));
    const plan = buildPropertyBacklog({ properties: planningProperties, existingTasks: existing || [] });
    const { data: inserted, error: insertError } = plan.tasks.length ? await supabaseAdmin.from('sprint_backlog_items').insert(plan.tasks.map((task) => ({ owner_id: ownerId, title: task.title, description: task.description, priority: task.priority, estimate_minutes: task.estimatedMinutes, source_type: task.sourceType, source_id: task.propertyId, property_id: task.propertyId, property_task_kind: task.taskKind, input_revision: task.propertyRevision, dedupe_key: task.dedupeKey }))).select('*') : { data: [], error: null };
    if (insertError) throw new Error(`Unable to create property tasks: ${insertError.message}`);
    return NextResponse.json({ ok: true, created: inserted || [], exclusions: plan.exclusions, occurrenceAt: plan.occurrenceAt });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Unable to generate property plan.' }, { status: 409 });
  }
}
