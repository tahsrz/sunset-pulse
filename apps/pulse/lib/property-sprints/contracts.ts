import { z } from 'zod';

export const AREA_KEY = 'keller-westlake';
export const propertyKindSchema = z.enum(['residential', 'land']);
export const propertyTaskKindSchema = z.enum(['resolve_identity', 'verify_facts', 'research_constraints', 'draft_buyer_brief', 'draft_outreach', 'follow_up_inquiry']);

const propertyIdentityFields = {
  address: z.string().trim().max(240).nullable().default(null),
  city: z.string().trim().max(120).nullable().default(null),
  state: z.string().trim().length(2).default('TX'),
  postalCode: z.string().trim().max(20).nullable().default(null),
  mlsId: z.string().trim().max(80).nullable().default(null),
  county: z.string().trim().max(120).nullable().default(null),
  parcelNumber: z.string().trim().max(120).nullable().default(null),
};

function validateIdentity(value: z.infer<z.ZodObject<typeof propertyIdentityFields>>, context: z.RefinementCtx) {
  if (!value.address && !value.mlsId && !(value.county && value.parcelNumber)) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: 'Address, MLS ID, or county plus parcel number is required.' });
  }
}

export const propertyIdentitySchema = z.object(propertyIdentityFields).superRefine(validateIdentity);

export const propertyShortlistEntrySchema = z.object(propertyIdentityFields).extend({
  areaKey: z.literal(AREA_KEY).default(AREA_KEY),
  propertyKind: propertyKindSchema,
  unresolvedQuestions: z.array(z.string().trim().min(1).max(500)).max(50).default([]),
}).superRefine(validateIdentity);

export const propertyTaskInputSchema = z.object({
  propertyId: z.string().uuid(),
  propertyRevision: z.number().int().positive(),
  taskKind: propertyTaskKindSchema,
  workerKey: z.string().trim().min(1).max(80).nullable().default(null),
  instructions: z.string().trim().max(4000),
  estimatedMinutes: z.number().int().min(1).max(10080).nullable().default(null),
  dependencyKeys: z.array(z.string().trim().min(1).max(200)).max(20).default([]),
  dedupeKey: z.string().trim().min(1).max(300),
});
export const propertyNoteSchema = z.object({ body: z.string().trim().min(1).max(4000), authorType: z.enum(['user', 'jamie']).default('user'), sourceCommandId: z.string().trim().max(160).nullable().default(null) });

export type PropertyShortlistEntry = z.infer<typeof propertyShortlistEntrySchema> & { id: string; ownerId: string; revision: number; status: 'active' | 'archived' };
export type PropertyTaskInput = z.infer<typeof propertyTaskInputSchema>;
export type PropertyNote = z.infer<typeof propertyNoteSchema> & { id: string; propertyId: string; createdAt: string };
