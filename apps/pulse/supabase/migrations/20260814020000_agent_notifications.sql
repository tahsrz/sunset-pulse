CREATE TABLE IF NOT EXISTS public.agent_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_event_id UUID NOT NULL REFERENCES public.intelligence_events(id) ON DELETE CASCADE,
    agent_id TEXT NOT NULL,
    lead_id UUID REFERENCES public.agent_site_leads(id) ON DELETE SET NULL,
    listing_id TEXT,
    kind TEXT NOT NULL CHECK (kind IN ('high_intent_revisit', 'tour_request')),
    priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('normal', 'high')),
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    action_href TEXT NOT NULL,
    action_label TEXT NOT NULL DEFAULT 'Open lead',
    occurrences INTEGER NOT NULL DEFAULT 1 CHECK (occurrences > 0),
    idempotency_key TEXT NOT NULL UNIQUE,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    read_at TIMESTAMPTZ,
    archived_at TIMESTAMPTZ,
    first_seen_at TIMESTAMPTZ NOT NULL,
    last_seen_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS agent_notifications_inbox_idx
ON public.agent_notifications (agent_id, archived_at, last_seen_at DESC);

CREATE INDEX IF NOT EXISTS agent_notifications_unread_idx
ON public.agent_notifications (agent_id, read_at, last_seen_at DESC)
WHERE archived_at IS NULL;

DROP TRIGGER IF EXISTS set_agent_notifications_updated_at ON public.agent_notifications;
CREATE TRIGGER set_agent_notifications_updated_at
BEFORE UPDATE ON public.agent_notifications
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.agent_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role manages agent notifications" ON public.agent_notifications;
CREATE POLICY "Service role manages agent notifications"
ON public.agent_notifications
TO service_role
USING (true)
WITH CHECK (true);
