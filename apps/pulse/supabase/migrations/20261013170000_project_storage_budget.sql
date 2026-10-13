-- Project-wide admission budget. Reservations are durable and never silently
-- expire: a timed-out upload may still be writing to the object store.
-- Storage API authorization probes run in rolled-back transactions. The same
-- trigger also runs for the final metadata commit, including service-role writes.
BEGIN;
SET LOCAL lock_timeout = '5s';
LOCK TABLE storage.objects IN SHARE ROW EXCLUSIVE MODE;

CREATE TABLE public.project_storage_budget (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  limit_bytes bigint NOT NULL DEFAULT 800000000 CHECK (limit_bytes BETWEEN 1 AND 800000000),
  live_bytes bigint NOT NULL CHECK (live_bytes >= 0),
  reserved_bytes bigint NOT NULL DEFAULT 0 CHECK (reserved_bytes >= 0),
  retired_bytes bigint NOT NULL DEFAULT 0 CHECK (retired_bytes >= 0),
  paused boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (live_bytes + reserved_bytes + retired_bytes <= limit_bytes)
);
INSERT INTO public.project_storage_budget(singleton, live_bytes)
SELECT true, COALESCE(sum((metadata->>'size')::bigint), 0) FROM storage.objects;

CREATE TABLE public.project_storage_reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket_id text NOT NULL,
  object_name text NOT NULL,
  max_bytes bigint NOT NULL CHECK (max_bytes BETWEEN 1 AND 80000000),
  status text NOT NULL DEFAULT 'reserved' CHECK (status IN ('reserved','committed','deleted')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(bucket_id, object_name)
);
ALTER TABLE public.project_storage_budget ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_storage_reservations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.project_storage_budget, public.project_storage_reservations FROM PUBLIC, anon, authenticated, service_role;

CREATE FUNCTION public.reserve_project_storage(p_bucket text, p_name text, p_bytes bigint)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE budget public.project_storage_budget%ROWTYPE; slot public.project_storage_reservations%ROWTYPE; file_limit bigint;
BEGIN
  IF p_bucket IS NULL OR length(p_bucket) NOT BETWEEN 1 AND 100 OR p_name IS NULL OR length(p_name) NOT BETWEEN 1 AND 1024
    OR p_bytes IS NULL OR p_bytes <= 0 THEN RAISE EXCEPTION 'Invalid storage reservation' USING ERRCODE='22023'; END IF;
  -- The removed bulk encyclopedia must not silently return through an importer.
  IF p_bucket='cartridges' AND (p_name ~ '(^|/)wiki_' OR p_name ~ '(^|/)wikipedia[-.]') THEN
    RAISE EXCEPTION 'Bulk Wikipedia cloud storage is disabled' USING ERRCODE='P0001';
  END IF;
  SELECT * INTO STRICT budget FROM public.project_storage_budget WHERE singleton FOR UPDATE;
  IF budget.paused THEN RAISE EXCEPTION 'Storage budget is paused' USING ERRCODE='P0001'; END IF;
  SELECT file_size_limit INTO file_limit FROM storage.buckets WHERE id=p_bucket;
  IF file_limit IS NULL OR file_limit NOT BETWEEN 1 AND 80000000 OR p_bytes > file_limit THEN
    RAISE EXCEPTION 'Storage requires a configured file limit of at most 80 MB' USING ERRCODE='P0001';
  END IF;
  SELECT * INTO slot FROM public.project_storage_reservations WHERE bucket_id=p_bucket AND object_name=p_name FOR UPDATE;
  IF FOUND THEN
    IF slot.status <> 'reserved' OR slot.max_bytes < file_limit THEN
      RAISE EXCEPTION 'Storage paths are immutable; use a new path' USING ERRCODE='P0001';
    END IF;
    RETURN jsonb_build_object('reservationId',slot.id,'maxBytes',slot.max_bytes);
  END IF;
  IF EXISTS(SELECT 1 FROM storage.objects WHERE bucket_id=p_bucket AND name=p_name) THEN
    RAISE EXCEPTION 'Storage paths are immutable; use a new path' USING ERRCODE='P0001';
  END IF;
  -- Charge the provider-enforced maximum, not the client's declaration. Signed
  -- capabilities therefore cannot overrun their admission reservation.
  IF budget.live_bytes + budget.reserved_bytes + budget.retired_bytes + file_limit > budget.limit_bytes THEN
    RAISE EXCEPTION 'Project storage budget reached; new uploads are paused' USING ERRCODE='P0001';
  END IF;
  INSERT INTO public.project_storage_reservations(bucket_id,object_name,max_bytes)
    VALUES(p_bucket,p_name,file_limit) RETURNING * INTO slot;
  UPDATE public.project_storage_budget SET reserved_bytes=reserved_bytes+file_limit,updated_at=clock_timestamp() WHERE singleton;
  RETURN jsonb_build_object('reservationId',slot.id,'maxBytes',slot.max_bytes);
END $$;

CREATE FUNCTION public.enforce_project_storage_budget()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE budget public.project_storage_budget%ROWTYPE; slot public.project_storage_reservations%ROWTYPE; object_bytes bigint; old_bytes bigint;
BEGIN
  SELECT * INTO STRICT budget FROM public.project_storage_budget WHERE singleton FOR UPDATE;
  IF TG_OP='DELETE' THEN
    old_bytes := COALESCE((OLD.metadata->>'size')::bigint,0);
    -- Backend deletion can be asynchronous. Never spend these bytes again just
    -- because the metadata row disappeared; reclamation requires operator review.
    UPDATE public.project_storage_budget SET live_bytes=live_bytes-old_bytes,retired_bytes=retired_bytes+old_bytes,updated_at=clock_timestamp() WHERE singleton;
    UPDATE public.project_storage_reservations SET status='deleted',updated_at=clock_timestamp()
      WHERE bucket_id=OLD.bucket_id AND object_name=OLD.name AND status='committed';
    RETURN OLD;
  END IF;
  IF TG_OP='UPDATE' THEN
    IF NEW.bucket_id IS DISTINCT FROM OLD.bucket_id OR NEW.name IS DISTINCT FROM OLD.name
      OR NEW.version IS DISTINCT FROM OLD.version OR NEW.metadata->>'size' IS DISTINCT FROM OLD.metadata->>'size'
      OR NEW.metadata->>'eTag' IS DISTINCT FROM OLD.metadata->>'eTag' THEN
      RAISE EXCEPTION 'Storage objects are immutable; use a new reserved path' USING ERRCODE='P0001';
    END IF;
    RETURN NEW;
  END IF;
  IF budget.paused THEN RAISE EXCEPTION 'Storage budget is paused' USING ERRCODE='P0001'; END IF;
  SELECT * INTO slot FROM public.project_storage_reservations WHERE bucket_id=NEW.bucket_id AND object_name=NEW.name FOR UPDATE;
  IF NOT FOUND OR slot.status <> 'reserved' THEN
    RAISE EXCEPTION 'A project storage reservation is required before uploading' USING ERRCODE='P0001';
  END IF;
  -- Empty metadata is the Storage service's authorization probe, not a final
  -- object. No budget is settled until the API supplies authoritative size.
  IF NEW.metadata->>'size' IS NULL THEN RETURN NEW; END IF;
  IF (NEW.metadata->>'size') !~ '^[0-9]+$' THEN
    RAISE EXCEPTION 'Invalid authoritative object size' USING ERRCODE='22023';
  END IF;
  object_bytes := (NEW.metadata->>'size')::bigint;
  IF object_bytes > slot.max_bytes THEN RAISE EXCEPTION 'Object exceeds its storage reservation' USING ERRCODE='P0001'; END IF;
  UPDATE public.project_storage_budget SET live_bytes=live_bytes+object_bytes,
    reserved_bytes=reserved_bytes-slot.max_bytes,updated_at=clock_timestamp() WHERE singleton;
  UPDATE public.project_storage_reservations SET status='committed',updated_at=clock_timestamp() WHERE id=slot.id;
  RETURN NEW;
END $$;
CREATE TRIGGER project_storage_budget_guard BEFORE INSERT OR UPDATE OR DELETE ON storage.objects
FOR EACH ROW EXECUTE FUNCTION public.enforce_project_storage_budget();

CREATE FUNCTION public.project_storage_budget_status()
RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
  SELECT jsonb_build_object('limitBytes',limit_bytes,'liveBytes',live_bytes,'reservedBytes',reserved_bytes,'retiredBytes',retired_bytes,
    'availableBytes',limit_bytes-live_bytes-reserved_bytes-retired_bytes,'paused',paused,
    'pendingUploads',(SELECT count(*) FROM public.project_storage_reservations WHERE status='reserved'),
    'databaseBytes',pg_database_size(current_database()),
    'databaseWarning',pg_database_size(current_database()) >= 400000000)
  FROM public.project_storage_budget WHERE singleton;
$$;
REVOKE ALL ON FUNCTION public.reserve_project_storage(text,text,bigint), public.enforce_project_storage_budget(), public.project_storage_budget_status()
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.reserve_project_storage(text,text,bigint), public.project_storage_budget_status() TO service_role;
COMMIT;
