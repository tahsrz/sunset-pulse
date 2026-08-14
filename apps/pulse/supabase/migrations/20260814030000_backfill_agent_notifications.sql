-- Seed the native inbox from durable alert deliveries created before the inbox existed.
INSERT INTO public.agent_notifications (
    source_event_id,
    agent_id,
    lead_id,
    listing_id,
    kind,
    priority,
    title,
    body,
    action_href,
    action_label,
    occurrences,
    idempotency_key,
    metadata,
    first_seen_at,
    last_seen_at,
    created_at,
    updated_at
)
SELECT
    delivery.source_event_id,
    delivery.agent_id,
    delivery.lead_id,
    delivery.listing_id,
    delivery.alert_kind,
    CASE
        WHEN delivery.alert_kind = 'tour_request' THEN 'high'
        WHEN COALESCE(delivery.payload->>'score', '') ~ '^\d+(\.\d+)?$'
             AND (delivery.payload->>'score')::numeric >= 85 THEN 'high'
        ELSE 'normal'
    END,
    CASE delivery.alert_kind
        WHEN 'tour_request' THEN 'Tour requested'
        ELSE 'High-intent property revisit'
    END,
    COALESCE(NULLIF(delivery.payload->>'topReason', ''), 'New high-intent lead activity.'),
    COALESCE(NULLIF(delivery.payload->>'commandCenterPath', ''), '/admin/agent-leads'),
    'Open lead',
    CASE
        WHEN COALESCE(delivery.payload->>'occurrences', '') ~ '^\d+$'
            THEN GREATEST(1, (delivery.payload->>'occurrences')::integer)
        ELSE 1
    END,
    delivery.idempotency_key,
    delivery.payload,
    delivery.created_at,
    delivery.updated_at,
    delivery.created_at,
    delivery.updated_at
FROM public.notification_deliveries AS delivery
ON CONFLICT (idempotency_key) DO NOTHING;
