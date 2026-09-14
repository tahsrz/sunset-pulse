import { createHash } from 'node:crypto';
import { propertyTaskInputSchema, type PropertyShortlistEntry, type PropertyTaskInput } from './contracts';

export type ExistingPropertyTask = { dedupeKey: string; status: string };
export type PropertySprintTask = PropertyTaskInput & { title: string; description: string; priority: number; sourceType: 'property_shortlist'; propertyKind: PropertyShortlistEntry['propertyKind'] };
export type PropertySprintExclusion = { propertyId: string; taskKind: string; reason: string };
type PlanningProperty = PropertyShortlistEntry & { collaborationNotes?: string[] };

function taskKey(property: PropertyShortlistEntry, taskKind: PropertyTaskInput['taskKind'], suffix = '') {
  return createHash('sha256').update([property.id, property.revision, taskKind, suffix].join(':')).digest('hex');
}

export function buildPropertyBacklog({ properties, existingTasks = [], occurrenceAt = new Date().toISOString() }: { properties: PlanningProperty[]; existingTasks?: ExistingPropertyTask[]; occurrenceAt?: string }) {
  const existing = new Set(existingTasks.filter((task) => !['cancelled', 'done'].includes(task.status)).map((task) => task.dedupeKey));
  const tasks: PropertySprintTask[] = [];
  const exclusions: PropertySprintExclusion[] = [];
  for (const property of properties.filter((entry) => entry.status === 'active')) {
    const context = property.collaborationNotes?.length ? ` Collaborative context from the owner and Jamie: ${property.collaborationNotes.join(' | ')}` : '';
    const identityReady = Boolean(property.address || property.mlsId || (property.county && property.parcelNumber));
    const firstKind = identityReady ? 'verify_facts' : 'resolve_identity';
    const firstKey = taskKey(property, firstKind);
    if (!existing.has(firstKey)) {
      const input = propertyTaskInputSchema.parse({ propertyId: property.id, propertyRevision: property.revision, taskKind: firstKind, workerKey: 'property_research', instructions: identityReady ? `Verify the supplied facts for ${property.address || property.mlsId || property.parcelNumber}. Preserve original and current price separately.${context}` : `Resolve the street address, MLS ID, or parcel identity before researching this property.${context}`, estimatedMinutes: identityReady ? 25 : 15, dependencyKeys: [], dedupeKey: firstKey });
      tasks.push({ ...input, title: `${firstKind === 'resolve_identity' ? 'Resolve identity' : 'Verify facts'} · ${property.address || property.mlsId || 'shortlist property'}`, description: input.instructions, priority: 1, sourceType: 'property_shortlist', propertyKind: property.propertyKind });
    }
    if (property.propertyKind === 'land') {
      const key = taskKey(property, 'research_constraints');
      if (property.unresolvedQuestions.length && !existing.has(key)) {
        const input = propertyTaskInputSchema.parse({ propertyId: property.id, propertyRevision: property.revision, taskKind: 'research_constraints', workerKey: 'property_research', instructions: `Resolve development questions recorded for this land property: ${property.unresolvedQuestions.join('; ')}`, estimatedMinutes: 45, dependencyKeys: [firstKey], dedupeKey: key });
        tasks.push({ ...input, title: `Research land constraints · ${property.address || 'Keller land opportunity'}`, description: input.instructions, priority: 2, sourceType: 'property_shortlist', propertyKind: property.propertyKind });
      } else if (!property.unresolvedQuestions.length) exclusions.push({ propertyId: property.id, taskKind: 'research_constraints', reason: 'No unresolved land questions recorded.' });
    }
    const briefKey = taskKey(property, 'draft_buyer_brief');
    if (!existing.has(briefKey)) {
      const input = propertyTaskInputSchema.parse({ propertyId: property.id, propertyRevision: property.revision, taskKind: 'draft_buyer_brief', workerKey: 'property_writer', instructions: `Prepare a buyer brief using only the supplied or confirmed facts for ${property.address || 'this shortlist property'}. Include open questions and source references; do not invent missing details.${context}`, estimatedMinutes: 30, dependencyKeys: [firstKey], dedupeKey: briefKey });
      tasks.push({ ...input, title: `Draft buyer brief · ${property.address || 'shortlist property'}`, description: input.instructions, priority: 3, sourceType: 'property_shortlist', propertyKind: property.propertyKind });
    }
  }
  return { tasks, exclusions, occurrenceAt };
}
