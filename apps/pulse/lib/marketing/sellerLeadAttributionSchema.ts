import { z } from 'zod';

export const sellerLeadAttributionSchema = z.object({
  workspaceId: z.string().uuid(),
  publicationId: z.string().uuid(),
  leadId: z.string().uuid(),
  evidenceNote: z.string().trim().min(12).max(500),
  requestKey: z.string().uuid(),
}).strict();

export type SellerLeadAttributionInput = z.infer<typeof sellerLeadAttributionSchema>;
