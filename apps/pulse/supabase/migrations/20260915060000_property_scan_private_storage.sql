-- Private capture storage for consented property-scan sessions.
-- The server route uses the service role after verifying the signed-in owner.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'property-scans',
  'property-scans',
  false,
  78643200,
  array['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

