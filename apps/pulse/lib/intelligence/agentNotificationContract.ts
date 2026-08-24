import { z } from 'zod';

export const agentNotificationSchema = z.object({
  id: z.string().uuid(),
  source_event_id: z.string().uuid(),
  agent_id: z.string().min(1),
  lead_id: z.string().uuid().nullable(),
  listing_id: z.string().nullable(),
  kind: z.enum(['high_intent_revisit', 'tour_request']),
  priority: z.enum(['normal', 'high']),
  title: z.string(),
  body: z.string(),
  action_href: z.string(),
  action_label: z.string(),
  occurrences: z.number().int().positive(),
  read_at: z.string().datetime().nullable(),
  archived_at: z.string().datetime().nullable(),
  first_seen_at: z.string().datetime(),
  last_seen_at: z.string().datetime(),
  created_at: z.string().datetime(),
}).strict();

export type AgentNotification = z.infer<typeof agentNotificationSchema>;
