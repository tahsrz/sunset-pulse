-- Supabase Free has a 50 MB global per-file upload limit. Keep this bucket's
-- native limit aligned with the app's property-scan upload policy.
update storage.buckets
set file_size_limit = 50000000
where id = 'property-scans';
