ALTER TABLE public.workflow_deliveries DROP CONSTRAINT IF EXISTS workflow_deliveries_status_check;
ALTER TABLE public.workflow_deliveries ADD CONSTRAINT workflow_deliveries_status_check
  CHECK (status IN ('pending','sending','accepted','sent','failed','uncertain'));
