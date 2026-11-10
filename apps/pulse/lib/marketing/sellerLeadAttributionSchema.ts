import { z } from 'zod';

export const sellerLeadAttributionSchema = z.object({
  workspaceId: z.string().guid(),
  publicationId: z.string().guid(),
  leadId: z.string().guid(),
  evidenceNote: z.string().trim().min(12).max(500),
  requestKey: z.string().guid(),
}).strict();

export type SellerLeadAttributionInput = z.infer<typeof sellerLeadAttributionSchema>;
