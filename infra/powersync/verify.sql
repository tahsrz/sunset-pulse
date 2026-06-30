-- Run in the Supabase SQL editor after applying the Phase 1/5 migrations.
-- Every query should return the expected rows before enabling PowerSync clients.

SELECT version
FROM supabase_migrations.schema_migrations
WHERE version IN ('20260630000000', '20260630010000')
ORDER BY version;

SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('acquire_mls_sync_lease', 'release_mls_sync_lease')
ORDER BY routine_name;

SELECT schemaname, tablename
FROM pg_publication_tables
WHERE pubname = 'powersync'
  AND schemaname = 'public'
  AND tablename IN ('properties', 'collections', 'recent_property_views', 'saved_searches')
ORDER BY tablename;

SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('properties', 'collections', 'recent_property_views', 'saved_searches')
ORDER BY tablename;

SELECT
  count(*) FILTER (WHERE display_public AND deleted_at IS NULL AND NOT is_demo) AS sync_eligible,
  count(*) FILTER (WHERE latitude IS NULL OR longitude IS NULL) AS missing_coordinates,
  max(updated_at) AS latest_canonical_update
FROM public.properties;

SELECT
  status,
  count(*) AS runs,
  max(completed_at) AS latest_completion,
  sum(failed) AS failed_listings
FROM public.mls_sync_runs
GROUP BY status
ORDER BY status;
