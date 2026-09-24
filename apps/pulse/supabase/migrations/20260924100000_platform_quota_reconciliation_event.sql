-- Workspace-authorized, bounded cleanup dispatched through the existing worker.
-- This contract remains opt-in and disabled after migration.
INSERT INTO public.workflow_event_contracts(workflow_key,min_payload_version,max_payload_version,enabled)
VALUES ('capability_reservation_reconcile',1,1,false)
ON CONFLICT (workflow_key) DO NOTHING;
