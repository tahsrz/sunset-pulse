import { supabaseAdmin } from '@/lib/supabase';
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
