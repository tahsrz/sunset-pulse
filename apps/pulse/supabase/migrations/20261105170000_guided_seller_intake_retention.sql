-- Frozen operator action receipts need replay fields, but never the private intake.
CREATE FUNCTION public.strip_guided_seller_action_receipt()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.response := NEW.response #- '{lead,metadata,sellerPlan,journey}';
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.strip_guided_seller_action_receipt() FROM PUBLIC, anon, authenticated, service_role;

CREATE TRIGGER strip_guided_seller_action_receipt
BEFORE INSERT OR UPDATE OF response ON public.agent_site_lead_action_receipts
FOR EACH ROW EXECUTE FUNCTION public.strip_guided_seller_action_receipt();

UPDATE public.agent_site_lead_action_receipts
SET response = response #- '{lead,metadata,sellerPlan,journey}'
WHERE response #> '{lead,metadata,sellerPlan,journey}' IS NOT NULL;

CREATE INDEX agent_site_leads_guided_retention_idx
ON public.agent_site_leads (created_at, id)
WHERE source = 'seller_plan'
  AND metadata #>> '{sellerPlan,offerVersion}' = '3'
  AND metadata #> '{sellerPlan,journey}' IS NOT NULL;

-- The daily CMA cron also prunes one bounded batch of guided answers. Lock the
-- selected rows so overlapping runs and normal lead actions cannot undo a prune.
CREATE FUNCTION public.purge_expired_guided_seller_intake()
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  WITH expired AS (
    SELECT id
    FROM public.agent_site_leads
    WHERE source = 'seller_plan'
      AND metadata #>> '{sellerPlan,offerVersion}' = '3'
      AND metadata #> '{sellerPlan,journey}' IS NOT NULL
      AND created_at <= now() - interval '2160 hours'
    ORDER BY created_at, id
    LIMIT 500
    FOR UPDATE SKIP LOCKED
  ), pruned AS (
    UPDATE public.agent_site_leads AS lead
    SET metadata = lead.metadata #- '{sellerPlan,journey}'
    FROM expired
    WHERE lead.id = expired.id
    RETURNING 1
  )
  SELECT count(*)::integer FROM pruned;
$$;

REVOKE ALL ON FUNCTION public.purge_expired_guided_seller_intake() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.purge_expired_guided_seller_intake() TO service_role;
