CREATE TABLE IF NOT EXISTS public.workflow_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_run_id UUID NOT NULL REFERENCES public.licensed_workflow_runs(id) ON DELETE CASCADE,
  batch_number INTEGER NOT NULL,
  recipients JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sending','sent','failed')),
  idempotency_key TEXT NOT NULL UNIQUE,
  provider_message_id TEXT,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workflow_run_id, batch_number)
);
CREATE INDEX IF NOT EXISTS workflow_deliveries_run_idx ON public.workflow_deliveries(workflow_run_id, batch_number);
ALTER TABLE public.workflow_deliveries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role manages workflow deliveries" ON public.workflow_deliveries;
CREATE POLICY "Service role manages workflow deliveries" ON public.workflow_deliveries FOR ALL TO service_role USING (true) WITH CHECK (true);
