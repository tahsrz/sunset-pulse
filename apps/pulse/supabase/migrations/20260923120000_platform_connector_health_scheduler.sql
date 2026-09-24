-- Scheduler boundary for connector health evidence. The event contract is
-- deliberately disabled until an operator explicitly enables fixture checks.
INSERT INTO public.workflow_event_contracts(workflow_key, min_payload_version, max_payload_version, enabled)
VALUES ('connector_health_check', 1, 1, false)
ON CONFLICT (workflow_key) DO NOTHING;
