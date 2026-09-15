ALTER TABLE public.workflow_results ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role manages workflow results" ON public.workflow_results;
CREATE POLICY "Service role manages workflow results" ON public.workflow_results FOR ALL TO service_role USING (true) WITH CHECK (true);

REVOKE ALL ON FUNCTION public.claim_workflow_jobs(INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.recover_workflow_leases() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.advance_workflow_schedule(UUID, TIMESTAMPTZ, INTEGER, TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.pause_workflow_schedule(UUID, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.resume_workflow_schedule(UUID, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_workflow_jobs(INTEGER, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.recover_workflow_leases() TO service_role;
GRANT EXECUTE ON FUNCTION public.advance_workflow_schedule(UUID, TIMESTAMPTZ, INTEGER, TIMESTAMPTZ) TO service_role;
GRANT EXECUTE ON FUNCTION public.pause_workflow_schedule(UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.resume_workflow_schedule(UUID, UUID) TO service_role;
ALTER TABLE public.workflow_schedules ADD COLUMN IF NOT EXISTS local_weekday INTEGER NOT NULL DEFAULT 1 CHECK (local_weekday BETWEEN 1 AND 7);
