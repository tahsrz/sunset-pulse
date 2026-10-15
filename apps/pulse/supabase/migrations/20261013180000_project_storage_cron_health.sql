-- Read-only scheduler diagnostics. Metadata drift or unbounded buckets must
-- pause background publishers, never silently reset the admission ledger.
BEGIN;
CREATE OR REPLACE FUNCTION public.project_storage_budget_status()
RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
  SELECT jsonb_build_object(
    'limitBytes',limit_bytes,'liveBytes',live_bytes,'reservedBytes',reserved_bytes,'retiredBytes',retired_bytes,
    'availableBytes',limit_bytes-live_bytes-reserved_bytes-retired_bytes,'paused',paused,
    'pendingUploads',(SELECT count(*) FROM public.project_storage_reservations WHERE status='reserved'),
    'databaseBytes',pg_database_size(current_database()),
    'databaseWarning',pg_database_size(current_database()) >= 400000000,
    'observedBytes',(SELECT COALESCE(sum((metadata->>'size')::bigint),0) FROM storage.objects),
    'unknownSizeObjects',(SELECT count(*) FROM storage.objects WHERE metadata->>'size' IS NULL),
    'bucketLimits',(SELECT COALESCE(jsonb_agg(jsonb_build_object('id',id,'fileLimitBytes',file_size_limit) ORDER BY id),'[]'::jsonb) FROM storage.buckets)
  ) FROM public.project_storage_budget WHERE singleton;
$$;
REVOKE ALL ON FUNCTION public.project_storage_budget_status() FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.project_storage_budget_status() TO service_role;
COMMIT;
