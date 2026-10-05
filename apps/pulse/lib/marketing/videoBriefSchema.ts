import { z } from 'zod';

const campaignKeySchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(80);
const evidenceSchema = z.object({
  claim: z.string().trim().min(8).max(280),
  sourceReference: z.string().trim().min(8).max(500),
  sourceDate: z.string().date().nullable(),
  publicationBasis: z.enum(['public-permitted', 'licensed', 'first-hand-consent', 'internal-only', 'unknown']),
  permissionEvidence: z.string().trim().min(8).max(400).nullable(),
}).strict();

const listingPermissionSchema = z.object({
  status: z.enum(['not-needed', 'pending', 'granted', 'denied']),
  listingReference: z.string().trim().min(3).max(160).nullable(),
  evidenceReference: z.string().trim().min(8).max(400).nullable(),
}).strict();
const backlogLinkSchema = z.object({
  itemId: z.string().uuid(),
  expectedRevision: z.number().int().positive().safe(),
}).strict();

export const videoBriefSchema = z.object({
  schemaVersion: z.literal(1),
  briefId: z.string().uuid(),
  revision: z.number().int().positive().safe(),
  supersedesBriefId: z.string().uuid().nullable(),
  backlogLink: backlogLinkSchema.nullable(),
  topic: z.string().trim().min(4).max(120),
  audienceNeed: z.string().trim().min(8).max(240),
  hook: z.string().trim().min(4).max(180),
  script: z.string().trim().min(20).max(2_000),
  shotList: z.array(z.string().trim().min(4).max(200)).min(1).max(12),
  claimEvidence: z.array(evidenceSchema).max(16),
  listingPermission: listingPermissionSchema,
  channels: z.array(z.enum(['tiktok', 'instagram-reels', 'youtube-shorts'])).min(1).max(3),
  ctaOfferKey: z.enum(['seller-plan', 'neighborhood-guides', 'market-report', 'none']),
  campaignKey: campaignKeySchema,
  reviewStatus: z.enum(['draft', 'in_review', 'approved', 'rejected']),
  reviewedByUserId: z.string().uuid().nullable(),
  reviewedAt: z.string().datetime({ offset: true }).nullable(),
  reviewNotes: z.string().trim().min(5).max(500).nullable(),
}).strict().superRefine((brief, context) => {
  if ((brief.revision === 1) !== (brief.supersedesBriefId === null)) {
    context.addIssue({ code: 'custom', path: ['supersedesBriefId'], message: 'The first revision has no predecessor; later revisions must identify one.' });
  }
  if (brief.supersedesBriefId === brief.briefId) {
    context.addIssue({ code: 'custom', path: ['supersedesBriefId'], message: 'A brief cannot supersede itself.' });
  }
  if (new Set(brief.channels).size !== brief.channels.length) {
    context.addIssue({ code: 'custom', path: ['channels'], message: 'Each distribution channel can appear only once.' });
  }
  if (brief.listingPermission.status === 'not-needed') {
    if (brief.listingPermission.listingReference || brief.listingPermission.evidenceReference) {
      context.addIssue({ code: 'custom', path: ['listingPermission'], message: 'A non-listing brief must not carry listing permission evidence.' });
    }
  } else if (!brief.listingPermission.listingReference) {
    context.addIssue({ code: 'custom', path: ['listingPermission', 'listingReference'], message: 'Listing-specific briefs need an exact listing reference.' });
  }
  if (brief.listingPermission.status === 'granted' && !brief.listingPermission.evidenceReference) {
    context.addIssue({ code: 'custom', path: ['listingPermission', 'evidenceReference'], message: 'Granted listing use needs recorded permission evidence.' });
  }
  if (brief.reviewStatus === 'approved' || brief.reviewStatus === 'rejected') {
    if (!brief.reviewedByUserId || !brief.reviewedAt) {
      context.addIssue({ code: 'custom', path: ['reviewedByUserId'], message: 'A human reviewer and timestamp are required for a final review decision.' });
    }
  } else if (brief.reviewedByUserId || brief.reviewedAt) {
    context.addIssue({ code: 'custom', path: ['reviewedByUserId'], message: 'Unreviewed briefs cannot claim a reviewer or review timestamp.' });
  }
  if (brief.reviewStatus === 'rejected' && !brief.reviewNotes) {
    context.addIssue({ code: 'custom', path: ['reviewNotes'], message: 'A rejected brief needs human feedback.' });
  }
  if (brief.reviewStatus === 'approved') {
    if (brief.reviewNotes) {
      context.addIssue({ code: 'custom', path: ['reviewNotes'], message: 'Approved briefs cannot retain rejection notes.' });
    }
    if (brief.listingPermission.status === 'pending' || brief.listingPermission.status === 'denied') {
      context.addIssue({ code: 'custom', path: ['listingPermission', 'status'], message: 'Listing-specific media cannot be approved without granted permission.' });
    }
    brief.claimEvidence.forEach((evidence, index) => {
      if (!evidence.sourceDate || evidence.publicationBasis === 'internal-only' || evidence.publicationBasis === 'unknown' || !evidence.permissionEvidence) {
        context.addIssue({ code: 'custom', path: ['claimEvidence', index], message: 'Every approved factual claim needs a public publication basis and permission evidence.' });
      }
    });
  }
});

export type VideoBrief = z.infer<typeof videoBriefSchema>;
