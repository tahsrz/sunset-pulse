import { z } from 'zod';
const count=z.number().int().nonnegative();
export const sellerPrioritiesSchema=z.object({items:z.array(z.object({id:z.string(),leadId:z.string().uuid(),title:z.string(),reason:z.string(),score:z.number(),dueAt:z.string().nullable()})).max(20),hasMore:z.boolean()});
export const sellerOverviewSchema=z.object({
  funnel:z.object({startAt:z.string(),timeZone:z.string(),generatedAt:z.string(),visits:count,offerClicks:count,requests:count,replies:count,held:count,signed:count,closed:count,
    campaigns:z.array(z.object({campaign:z.string(),requests:count,replies:count,held:count,signed:count,closed:count})).max(50),hasMoreCampaigns:z.boolean()}),
  health:z.object({plannerConfigured:z.boolean(),timeZone:z.string().nullable(),remindersEnabled:z.boolean(),activeSites:count,emailContractEnabled:z.boolean(),pendingJobs:count,failedJobs:count,lastCompletedJob:z.string().nullable(),lastRequest:z.string().nullable(),unresolvedEmails:count,emailConfigured:z.boolean(),webhookConfigured:z.boolean(),intakeConfigured:z.boolean()}),
});
export type SellerOverview=z.infer<typeof sellerOverviewSchema>;
