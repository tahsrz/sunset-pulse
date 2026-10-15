import { z } from 'zod';

const MAX_COUNT = 1_000_000_000;

export const videoPublicationOutcomeSchema = z.object({
  workspaceId: z.string().uuid(),
  publicationId: z.string().uuid(),
  capturedAt: z.string().datetime({ offset: true }),
  views: z.number().int().min(0).max(MAX_COUNT),
  engagements: z.number().int().min(0).max(MAX_COUNT),
  linkClicks: z.number().int().min(0).max(MAX_COUNT),
  sellerPlanRequests: z.number().int().min(0).max(MAX_COUNT),
  sourceNote: z.string().trim().min(8).max(500),
  requestKey: z.string().uuid(),
}).strict().superRefine((outcome, context) => {
  if (Date.parse(outcome.capturedAt) > Date.now()) {
    context.addIssue({ code: 'custom', path: ['capturedAt'], message: 'Capture time cannot be in the future.' });
  }
  if (outcome.engagements > outcome.views) {
    context.addIssue({ code: 'custom', path: ['engagements'], message: 'Engagements cannot exceed views.' });
  }
});

export type VideoPublicationOutcomeInput = z.infer<typeof videoPublicationOutcomeSchema>;
