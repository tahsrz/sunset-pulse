-- Atomic, deployment-shared rate limits for unauthenticated public APIs.

CREATE TABLE IF NOT EXISTS public.public_api_rate_limits (
    key_hash TEXT PRIMARY KEY CHECK (key_hash ~ '^[a-f0-9]{64}$'),
    window_started_at TIMESTAMPTZ NOT NULL,
    request_count INTEGER NOT NULL CHECK (request_count > 0),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS public_api_rate_limits_updated_idx
ON public.public_api_rate_limits (updated_at);

ALTER TABLE public.public_api_rate_limits ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.public_api_rate_limits FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.public_api_rate_limits TO service_role;

CREATE OR REPLACE FUNCTION public.consume_public_rate_limit(
    p_key_hash TEXT,
    p_limit INTEGER,
    p_window_seconds INTEGER DEFAULT 60
)
RETURNS TABLE (
    is_limited BOOLEAN,
    remaining INTEGER,
    reset_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_now TIMESTAMPTZ := clock_timestamp();
BEGIN
    IF p_key_hash !~ '^[a-f0-9]{64}$' THEN
        RAISE EXCEPTION 'Invalid rate-limit key';
    END IF;
    IF p_limit < 1 OR p_window_seconds < 1 OR p_window_seconds > 3600 THEN
        RAISE EXCEPTION 'Invalid rate-limit configuration';
    END IF;

    IF random() < 0.01 THEN
        DELETE FROM public.public_api_rate_limits
        WHERE updated_at < v_now - INTERVAL '1 day';
    END IF;

    RETURN QUERY
    WITH consumed AS (
        INSERT INTO public.public_api_rate_limits (
            key_hash,
            window_started_at,
            request_count,
            updated_at
        )
        VALUES (p_key_hash, v_now, 1, v_now)
        ON CONFLICT (key_hash) DO UPDATE
        SET
            window_started_at = CASE
                WHEN public.public_api_rate_limits.window_started_at <= v_now - make_interval(secs => p_window_seconds)
                    THEN v_now
                ELSE public.public_api_rate_limits.window_started_at
            END,
            request_count = CASE
                WHEN public.public_api_rate_limits.window_started_at <= v_now - make_interval(secs => p_window_seconds)
                    THEN 1
                ELSE public.public_api_rate_limits.request_count + 1
            END,
            updated_at = v_now
        RETURNING request_count, window_started_at
    )
    SELECT
        consumed.request_count > p_limit,
        GREATEST(0, p_limit - consumed.request_count),
        consumed.window_started_at + make_interval(secs => p_window_seconds)
    FROM consumed;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_public_rate_limit(TEXT, INTEGER, INTEGER)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_public_rate_limit(TEXT, INTEGER, INTEGER)
TO service_role;
