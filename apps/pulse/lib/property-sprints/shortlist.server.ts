import { supabaseAdmin } from '@/lib/supabase';
import { requireWorkspaceAccess } from '@/lib/platform/access/workspaceAccess.server';
import { resolveWorkspaceMappedResourceScope } from '@/lib/platform/access/domainScope.server';
import { propertyShortlistEntrySchema, propertyNoteSchema, AREA_KEY, type PropertyShortlistEntry, type PropertyNote } from './contracts';

function fromRow(row: Record<string, unknown>): PropertyShortlistEntry {
  return {
    id: String(row.id), ownerId: String(row.owner_id), revision: Number(row.revision), status: row.status === 'archived' ? 'archived' : 'active',
    ...propertyShortlistEntrySchema.parse({ areaKey: row.area_key, address: row.address, city: row.city, state: row.state, postalCode: row.postal_code, mlsId: row.mls_id, county: row.county, parcelNumber: row.parcel_number, propertyKind: row.property_kind, unresolvedQuestions: row.unresolved_questions || [] }),
  };
}

export async function listShortlistEntries(ownerId: string) {
  const { data, error } = await supabaseAdmin.from('property_shortlist_entries').select('*').eq('owner_id', ownerId).eq('area_key', AREA_KEY).order('created_at', { ascending: false });
  if (error) throw new Error(`Unable to load property shortlist: ${error.message}`);
  return (data || []).map(fromRow);
}

/**
 * Workspace-aware read boundary. Legacy owner reads remain unchanged above;
 * team reads only see resources explicitly linked into the requested workspace.
 */
export async function listShortlistEntriesForWorkspace(actorId: string, workspaceId: string) {
  const workspace = await requireWorkspaceAccess(actorId, workspaceId, 'workspace:read');
  const { data: links, error: linkError } = await supabaseAdmin
    .from('platform_scope_links')
    .select('resource_id')
    .eq('workspace_id', workspace.workspaceId)
    .eq('resource_type', 'property_shortlist')
    .eq('status', 'mapped');
  if (linkError) throw new Error(`Unable to load workspace property scope: ${linkError.message}`);

  const resourceIds = [...new Set((links || []).map((link) => String(link.resource_id)).filter(Boolean))];
  if (!resourceIds.length) return [];
  const { data, error } = await supabaseAdmin
    .from('property_shortlist_entries')
    .select('*')
    .in('id', resourceIds)
    .eq('area_key', AREA_KEY)
    .order('created_at', { ascending: false });
  if (error) throw new Error(`Unable to load workspace property shortlist: ${error.message}`);
  return (data || []).map(fromRow);
}

async function findWorkspacePropertyByIdentity(workspaceId: string, input: unknown) {
  const parsed = propertyShortlistEntrySchema.parse(input);
  const { data: links, error: linkError } = await supabaseAdmin
    .from('platform_scope_links')
    .select('resource_id')
    .eq('workspace_id', workspaceId)
    .eq('resource_type', 'property_shortlist')
    .eq('status', 'mapped');
  if (linkError) throw new Error(`Unable to inspect workspace property scope: ${linkError.message}`);
  const ids = [...new Set((links || []).map((link) => String(link.resource_id)).filter(Boolean))];
  if (!ids.length) return null;
  let query = supabaseAdmin.from('property_shortlist_entries').select('*').in('id', ids).eq('area_key', AREA_KEY);
  if (parsed.mlsId) query = query.eq('mls_id', parsed.mlsId);
  else if (parsed.county && parsed.parcelNumber) query = query.eq('county', parsed.county).eq('parcel_number', parsed.parcelNumber);
  else query = query.eq('address', parsed.address).eq('city', parsed.city);
  const { data, error } = await query.limit(1);
  if (error) throw new Error(`Unable to inspect workspace property identity: ${error.message}`);
  return data?.[0] ? fromRow(data[0]) : null;
}

/**
 * Workspace-aware mutation boundary. Existing owner-scoped writes remain the
 * compatibility path; this adapter only mutates a mapped property or creates
 * a new actor-owned property and immediately links it to the workspace.
 */
export async function saveShortlistEntryForWorkspace(actorId: string, workspaceId: string, input: unknown, expectedRevision?: number | null) {
  const workspace = await requireWorkspaceAccess(actorId, workspaceId, 'property:edit');
  const parsed = propertyShortlistEntrySchema.parse(input);
  const existing = await findWorkspacePropertyByIdentity(workspace.workspaceId, input);
  if (existing && expectedRevision == null) throw new Error('Expected property revision is required for workspace edits.');
  const { data, error } = await supabaseAdmin.rpc('platform_save_property_shortlist_entry', {
    p_actor_id: actorId,
    p_workspace_id: workspace.workspaceId,
    p_property_id: existing?.id || null,
    p_expected_revision: expectedRevision ?? null,
    p_address: parsed.address,
    p_city: parsed.city,
    p_state: parsed.state,
    p_postal_code: parsed.postalCode,
    p_mls_id: parsed.mlsId,
    p_county: parsed.county,
    p_parcel_number: parsed.parcelNumber,
    p_property_kind: parsed.propertyKind,
    p_unresolved_questions: parsed.unresolvedQuestions,
  });
  if (error) throw new Error(`Unable to save workspace property: ${error.message}`);
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new Error('Workspace property save did not return a property.');
  return fromRow(row);
}

export async function archiveShortlistEntryForWorkspace(actorId: string, workspaceId: string, propertyId: string, expectedRevision: number) {
  const scope = await resolveWorkspaceMappedResourceScope(actorId, workspaceId, 'property_shortlist', propertyId);
  const { data, error } = await supabaseAdmin.rpc('platform_archive_property_shortlist_entry', {
    p_actor_id: actorId,
    p_workspace_id: scope.workspaceId,
    p_property_id: propertyId,
    p_expected_revision: expectedRevision,
  });
  if (error) throw new Error(`Unable to archive workspace property: ${error.message}`);
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new Error('Workspace property archive did not return a property.');
  return fromRow(row);
}

export async function saveShortlistEntry(ownerId: string, input: unknown, expectedRevision?: number | null) {
  const parsed = propertyShortlistEntrySchema.parse(input);
  const identityQuery = supabaseAdmin.from('property_shortlist_entries').select('*').eq('owner_id', ownerId).eq('area_key', AREA_KEY);
  const { data: existingRows, error: lookupError } = parsed.mlsId ? await identityQuery.eq('mls_id', parsed.mlsId).limit(1) : parsed.county && parsed.parcelNumber ? await identityQuery.eq('county', parsed.county).eq('parcel_number', parsed.parcelNumber).limit(1) : await identityQuery.eq('address', parsed.address).eq('city', parsed.city).limit(1);
  if (lookupError) throw new Error(`Unable to inspect property shortlist: ${lookupError.message}`);
  const existing = existingRows?.[0];
  if (existing && expectedRevision !== null && expectedRevision !== undefined && Number(existing.revision) !== expectedRevision) throw new Error('Property shortlist revision conflict. Reload before saving.');
  const values = { owner_id: ownerId, area_key: AREA_KEY, address: parsed.address, city: parsed.city, state: parsed.state, postal_code: parsed.postalCode, mls_id: parsed.mlsId, county: parsed.county, parcel_number: parsed.parcelNumber, property_kind: parsed.propertyKind, unresolved_questions: parsed.unresolvedQuestions, revision: existing ? Number(existing.revision) + 1 : 1, status: 'active' };
  const query = existing ? supabaseAdmin.from('property_shortlist_entries').update(values).eq('id', existing.id).eq('owner_id', ownerId) : supabaseAdmin.from('property_shortlist_entries').insert(values);
  const { data, error } = await query.select('*').single();
  if (error) throw new Error(`Unable to save property shortlist: ${error.message}`);
  return fromRow(data);
}

export async function archiveShortlistEntry(ownerId: string, id: string, expectedRevision: number) {
  const { data, error } = await supabaseAdmin.from('property_shortlist_entries').update({ status: 'archived', revision: expectedRevision + 1 }).eq('id', id).eq('owner_id', ownerId).eq('revision', expectedRevision).select('*').single();
  if (error) throw new Error(`Unable to archive property shortlist entry: ${error.message}`);
  return fromRow(data);
}

export async function listPropertyNotes(ownerId: string, propertyId: string) {
  const { data, error } = await supabaseAdmin.from('property_notes').select('id,property_id,author_type,source_command_id,body,created_at').eq('owner_id', ownerId).eq('property_id', propertyId).order('created_at', { ascending: true });
  if (error) throw new Error(`Unable to load property notes: ${error.message}`);
  return (data || []).map((row): PropertyNote => ({ id: row.id, propertyId: row.property_id, authorType: row.author_type, sourceCommandId: row.source_command_id, body: row.body, createdAt: row.created_at }));
}

export async function addPropertyNote(ownerId: string, propertyId: string, input: unknown) {
  const parsed = propertyNoteSchema.parse(input);
  const { data: property, error: propertyError } = await supabaseAdmin.from('property_shortlist_entries').select('id').eq('id', propertyId).eq('owner_id', ownerId).maybeSingle();
  if (propertyError) throw new Error(`Unable to verify property note ownership: ${propertyError.message}`);
  if (!property) throw new Error('Property does not belong to this owner.');
  const { data, error } = await supabaseAdmin.from('property_notes').insert({ owner_id: ownerId, property_id: propertyId, author_type: parsed.authorType, source_command_id: parsed.sourceCommandId, body: parsed.body }).select('id,property_id,author_type,source_command_id,body,created_at').single();
  if (error) throw new Error(`Unable to save property note: ${error.message}`);
  return { id: data.id, propertyId: data.property_id, authorType: data.author_type, sourceCommandId: data.source_command_id, body: data.body, createdAt: data.created_at } as PropertyNote;
}
