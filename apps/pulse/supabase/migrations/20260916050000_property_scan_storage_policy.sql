-- Property-scan media remains private. The application creates signed upload
-- capabilities only after owner authorization and uses the service role for
-- server-side inspection, preview, and bounded cleanup. Keep the bucket
-- explicitly non-public so a guessed object path cannot be read anonymously.
update storage.buckets
set public = false,
    file_size_limit = 78643200,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime']
where id = 'property-scans';

