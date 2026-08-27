-- Privacy-safe daily evidence that the profit baseline collector was operating.

CREATE TABLE IF NOT EXISTS public.profit_baseline_checkpoints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    checkpoint_date DATE NOT NULL UNIQUE,
    captured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    readiness_status TEXT NOT NULL CHECK (readiness_status IN ('ready', 'not_ready')),
    decision TEXT NOT NULL CHECK (decision IN ('continue_baseline', 'start_margin_experiments')),
    blockers JSONB NOT NULL DEFAULT '[]'::jsonb,
    criteria JSONB NOT NULL DEFAULT '[]'::jsonb,
    aggregate_metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS profit_baseline_checkpoints_captured_idx
ON public.profit_baseline_checkpoints (captured_at DESC);

DROP TRIGGER IF EXISTS set_profit_baseline_checkpoints_updated_at ON public.profit_baseline_checkpoints;
CREATE TRIGGER set_profit_baseline_checkpoints_updated_at
BEFORE UPDATE ON public.profit_baseline_checkpoints
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.profit_baseline_checkpoints ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role manages profit baseline checkpoints" ON public.profit_baseline_checkpoints;
CREATE POLICY "Service role manages profit baseline checkpoints"
ON public.profit_baseline_checkpoints TO service_role USING (true) WITH CHECK (true);
