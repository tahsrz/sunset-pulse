-- Durable, privacy-safe identity joining Jamie activity to downstream revenue actions.

ALTER TABLE public.agent_site_leads
ADD COLUMN IF NOT EXISTS funnel_id UUID;

UPDATE public.agent_site_leads
SET funnel_id = gen_random_uuid()
WHERE funnel_id IS NULL;

ALTER TABLE public.agent_site_leads
ALTER COLUMN funnel_id SET DEFAULT gen_random_uuid(),
ALTER COLUMN funnel_id SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS agent_site_leads_funnel_id_idx
ON public.agent_site_leads (funnel_id);

ALTER TABLE public.agent_notifications
ADD COLUMN IF NOT EXISTS funnel_id UUID;

UPDATE public.agent_notifications AS notification
SET funnel_id = lead.funnel_id
FROM public.agent_site_leads AS lead
WHERE notification.lead_id = lead.id
  AND notification.funnel_id IS NULL;

CREATE INDEX IF NOT EXISTS agent_notifications_funnel_id_idx
ON public.agent_notifications (funnel_id, created_at DESC);

ALTER TABLE public.notification_deliveries
ADD COLUMN IF NOT EXISTS funnel_id UUID;

UPDATE public.notification_deliveries AS delivery
SET funnel_id = lead.funnel_id
FROM public.agent_site_leads AS lead
WHERE delivery.lead_id = lead.id
  AND delivery.funnel_id IS NULL;

CREATE INDEX IF NOT EXISTS notification_deliveries_funnel_id_idx
ON public.notification_deliveries (funnel_id, created_at DESC);
