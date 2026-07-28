import 'server-only';

import { randomUUID } from 'node:crypto';
import { supabaseAdmin } from '@/lib/supabase';
import { applyMockCanonicalPropertyPatch, readMockCanonicalProperty } from '@/lib/mocks/canonicalProperties';
import {
  buildCanonicalListingPatch,
  buildListingIntakePropertyDiff,
  type ListingIntakePropertyField,
} from '@/lib/command-center/listingIntakePropertyDiff';
import {
  beginListingIntakePropertyApplication,
  completeListingIntakePropertyApplication,
  ListingIntakeAccessError,
  ListingIntakeConflictError,
  ListingIntakePublishGateError,
  readListingIntake,
} from '@/lib/command-center/listingIntakeStore';

export class CanonicalListingNotFoundError extends Error {}
export class CanonicalListingConflictError extends Error {}
export class CanonicalListingApplyError extends Error {}

export async function compareListingIntakeToCanonicalProperty(input: {
  intakeId: string;
  ownerId: string;
  propertyReference: string;
}) {
  const intake = await readListingIntake(input.intakeId, input.ownerId);
  if (!intake) return null;
  const property = await readCanonicalProperty(input.propertyReference);
  return {
    intake,
    property: summarizeCanonicalProperty(property),
    differences: buildListingIntakePropertyDiff(intake.approvedFacts, property),
  };
}

export async function applyListingIntakeToCanonicalProperty(input: {
  intakeId: string;
  ownerId: string;
  actor: string;
  expectedIntakeVersion: number;
  propertyId: string;
  expectedPropertyLastUpdated: string | null;
  fields: ListingIntakePropertyField[];
}) {
  const intake = await readListingIntake(input.intakeId, input.ownerId);
  if (!intake) return null;
  if (intake.publishStatus !== 'ready') {
    throw new ListingIntakePublishGateError(['Mark the intake ready before applying it to a canonical listing.']);
  }

  const property = await readCanonicalProperty(input.propertyId, true);
  const propertyLastUpdated = readLastUpdated(property);
  if (propertyLastUpdated !== input.expectedPropertyLastUpdated) {
    throw new CanonicalListingConflictError('The canonical listing changed since this comparison. Compare it again before applying fields.');
  }

  const differences = buildListingIntakePropertyDiff(intake.approvedFacts, property);
  const changedFields = new Set(differences.filter((difference) => difference.differs).map((difference) => difference.field));
  const fields = input.fields.filter((field) => changedFields.has(field));
  if (!fields.length) {
    throw new CanonicalListingApplyError('Select at least one field that still differs from the canonical listing.');
  }

  const patch = buildCanonicalListingPatch(intake.approvedFacts, fields);
  if (Object.values(patch).some((value) => value === null)) {
    throw new CanonicalListingApplyError('One or more selected values could not be converted safely. Recheck the intake facts.');
  }

  const applicationId = `lia_${randomUUID()}`;
  const application = await beginListingIntakePropertyApplication({
    intakeId: input.intakeId,
    ownerId: input.ownerId,
    actor: input.actor,
    expectedVersion: input.expectedIntakeVersion,
    applicationId,
    propertyId: String(property.id),
    mlsId: stringValue(property.mls_id),
    fields,
    expectedPropertyLastUpdated: propertyLastUpdated,
  });
  if (!application) return null;

  const now = new Date().toISOString();
  let data: Record<string, unknown> | null = null;
  let errorMessage = '';

  if (isMockMode()) {
    data = applyMockCanonicalPropertyPatch(String(property.id), patch, propertyLastUpdated, now);
  } else {
    let update = supabaseAdmin
      .from('properties')
      .update({ ...patch, last_updated: now })
      .eq('id', String(property.id));
    update = propertyLastUpdated
      ? update.eq('last_updated', propertyLastUpdated)
      : update.is('last_updated', null);
    const result = await update.select('*').maybeSingle();
    data = result.data;
    errorMessage = result.error?.message || '';
  }

  if (!data) {
    const reason = errorMessage || 'Canonical listing changed before the selected fields could be applied.';
    await completeListingIntakePropertyApplication({
      intakeId: input.intakeId,
      ownerId: input.ownerId,
      applicationId,
      status: 'failed',
      failureReason: reason,
    });
    if (!errorMessage) throw new CanonicalListingConflictError(reason);
    throw new CanonicalListingApplyError(`Unable to apply the selected fields: ${reason}`);
  }

  const updatedIntake = await completeListingIntakePropertyApplication({
    intakeId: input.intakeId,
    ownerId: input.ownerId,
    applicationId,
    status: 'applied',
    appliedPropertyLastUpdated: readLastUpdated(data),
  });
  if (!updatedIntake) {
    throw new CanonicalListingApplyError('The canonical listing was updated, but its intake audit record needs attention.');
  }

  return {
    intake: updatedIntake,
    property: summarizeCanonicalProperty(data),
    differences: buildListingIntakePropertyDiff(updatedIntake.approvedFacts, data),
  };
}

async function readCanonicalProperty(reference: string, requireId = false) {
  if (isMockMode()) {
    const property = readMockCanonicalProperty(reference, requireId);
    if (!property) throw new CanonicalListingNotFoundError('No canonical listing matches that ID or MLS number.');
    return property;
  }

  const value = reference.trim();
  let query = supabaseAdmin.from('properties').select('*').is('deleted_at', null);
  query = requireId || isUuid(value) ? query.eq('id', value) : query.eq('mls_id', value);
  const { data, error } = await query.maybeSingle();
  if (error) throw new CanonicalListingApplyError(`Unable to load canonical listing: ${error.message}`);
  if (!data) throw new CanonicalListingNotFoundError('No canonical listing matches that ID or MLS number.');
  return data as Record<string, unknown>;
}

function isMockMode() {
  return process.env.NEXT_PUBLIC_MOCK_MODE === 'true';
}

function summarizeCanonicalProperty(property: Record<string, unknown>) {
  return {
    id: String(property.id),
    mlsId: stringValue(property.mls_id),
    name: stringValue(property.name),
    lastUpdated: readLastUpdated(property),
  };
}

function readLastUpdated(property: Record<string, unknown>) {
  const value = property.last_updated;
  return typeof value === 'string' && value ? value : null;
}

function stringValue(value: unknown) {
  return value === null || value === undefined || value === '' ? null : String(value);
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
