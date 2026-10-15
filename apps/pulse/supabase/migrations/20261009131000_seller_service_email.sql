-- Seller email is an event job on the shared leased worker, never a second cron.
INSERT INTO public.workflow_event_contracts(workflow_key,min_payload_version,max_payload_version,enabled)
VALUES('seller_email',1,1,true) ON CONFLICT(workflow_key) DO NOTHING;

CREATE FUNCTION public.seller_email_prepare(p_job_id UUID,p_lease_token UUID,p_from TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE job public.workflow_jobs%ROWTYPE; msg public.seller_case_messages%ROWTYPE; lead public.agent_site_leads%ROWTYPE;
BEGIN
  SELECT * INTO job FROM public.workflow_jobs WHERE id=p_job_id FOR UPDATE;
  IF job.id IS NULL OR job.workflow_key<>'seller_email' OR job.status<>'running'
    OR job.lease_token IS DISTINCT FROM p_lease_token OR job.lease_until IS NULL OR job.lease_until<=clock_timestamp() THEN
    RAISE EXCEPTION 'Live email lease required' USING ERRCODE='PT409'; END IF;
  SELECT * INTO msg FROM public.seller_case_messages WHERE id=(job.payload->>'messageId')::UUID AND job_id=job.id AND owner_id=job.user_id;
  IF msg.id IS NULL THEN RAISE EXCEPTION 'Email unavailable' USING ERRCODE='P0002'; END IF;
  BEGIN lead:=public.seller_service_require_owner(job.user_id,msg.lead_id,true);
  EXCEPTION WHEN SQLSTATE 'P0002' THEN lead:=NULL; END;
  SELECT * INTO msg FROM public.seller_case_messages WHERE id=msg.id FOR UPDATE;
  IF msg.status IN ('accepted','delivered','bounced','failed','cancelled','unknown') THEN
    IF NOT public.complete_workflow_job_with_result(job.id,p_lease_token,'seller_email',msg.id) THEN RAISE EXCEPTION 'Email lease expired' USING ERRCODE='PT409'; END IF;
    RETURN jsonb_build_object('send',false,'messageId',msg.id,'status',msg.status);
  END IF;
  -- An ambiguous attempt is never retried after the provider's 24-hour dedupe window.
  IF msg.attempt_started_at<clock_timestamp()-INTERVAL '20 hours' THEN
    UPDATE public.seller_case_messages SET status='unknown' WHERE id=msg.id;
    IF NOT public.complete_workflow_job_with_result(job.id,p_lease_token,'seller_email',msg.id) THEN RAISE EXCEPTION 'Email lease expired' USING ERRCODE='PT409'; END IF;
    RETURN jsonb_build_object('send',false,'messageId',msg.id,'status','unknown');
  END IF;
  IF lead.id IS NULL OR NOT public.seller_service_contact_allowed(lead) OR lower(btrim(lead.email)) IS DISTINCT FROM msg.recipient THEN
    UPDATE public.seller_case_messages SET status=CASE WHEN attempt_started_at IS NULL THEN 'cancelled' ELSE 'unknown' END WHERE id=msg.id RETURNING * INTO msg;
    IF NOT public.complete_workflow_job_with_result(job.id,p_lease_token,'seller_email',msg.id) THEN RAISE EXCEPTION 'Email lease expired' USING ERRCODE='PT409'; END IF;
    RETURN jsonb_build_object('send',false,'messageId',msg.id,'status',msg.status);
  END IF;
  IF nullif(btrim(p_from),'') IS NULL THEN RAISE EXCEPTION 'Verified sender required' USING ERRCODE='22023'; END IF;
  UPDATE public.seller_case_messages SET status='sending',attempt_started_at=COALESCE(attempt_started_at,clock_timestamp()),
    from_address=COALESCE(from_address,p_from) WHERE id=msg.id RETURNING * INTO msg;
  RETURN jsonb_build_object('send',true,'messageId',msg.id,'to',msg.recipient,'replyTo',msg.reply_to,
    'from',msg.from_address,'subject',msg.subject,'body',msg.body);
END $$;

CREATE FUNCTION public.seller_email_accept(p_job_id UUID,p_lease_token UUID,p_provider_id TEXT)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE job public.workflow_jobs%ROWTYPE; msg public.seller_case_messages%ROWTYPE; lead public.agent_site_leads%ROWTYPE;
BEGIN
  SELECT * INTO job FROM public.workflow_jobs WHERE id=p_job_id FOR UPDATE;
  IF job.id IS NULL OR job.workflow_key<>'seller_email' OR job.status<>'running'
    OR job.lease_token IS DISTINCT FROM p_lease_token OR job.lease_until IS NULL OR job.lease_until<=clock_timestamp() THEN RAISE EXCEPTION 'Live email lease required' USING ERRCODE='PT409'; END IF;
  IF nullif(btrim(p_provider_id),'') IS NULL OR length(p_provider_id)>200 THEN RAISE EXCEPTION 'Provider receipt required' USING ERRCODE='22023'; END IF;
  SELECT * INTO msg FROM public.seller_case_messages WHERE id=(job.payload->>'messageId')::UUID AND job_id=job.id AND owner_id=job.user_id;
  IF msg.id IS NULL THEN RAISE EXCEPTION 'Email unavailable' USING ERRCODE='P0002'; END IF;
  BEGIN lead:=public.seller_service_require_owner(job.user_id,msg.lead_id,true);
  EXCEPTION WHEN SQLSTATE 'P0002' THEN lead:=NULL; END;
  UPDATE public.seller_case_messages SET status='accepted',provider_id=p_provider_id,accepted_at=now() WHERE id=msg.id AND status='sending';
  IF NOT FOUND THEN RAISE EXCEPTION 'Email state changed' USING ERRCODE='PT409'; END IF;
  -- Record provider acceptance, while preserving an external receipt if permission changed in flight.
  IF lead.id IS NOT NULL AND public.seller_service_contact_allowed(lead) THEN
    PERFORM public.seller_lead_record_action(job.user_id,jsonb_build_object('leadId',lead.id,'expectedRevision',lead.revision,
      'requestKey',msg.id,'action','record_contact','channel','email','occurredAt',now()));
  END IF;
  IF NOT public.complete_workflow_job_with_result(job.id,p_lease_token,'seller_email',msg.id) THEN RAISE EXCEPTION 'Email lease expired' USING ERRCODE='PT409'; END IF;
  RETURN msg.id;
END $$;

CREATE TABLE public.seller_email_delivery_receipts (
  receipt_id TEXT PRIMARY KEY CHECK(length(receipt_id) BETWEEN 1 AND 200), provider_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('delivered','bounced')), occurred_at TIMESTAMPTZ NOT NULL
);
ALTER TABLE public.seller_email_delivery_receipts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.seller_email_delivery_receipts FROM PUBLIC,anon,authenticated,service_role;
CREATE FUNCTION public.seller_email_delivery(p_receipt_id TEXT,p_provider_id TEXT,p_status TEXT,p_occurred_at TIMESTAMPTZ)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
  INSERT INTO public.seller_email_delivery_receipts VALUES(p_receipt_id,p_provider_id,p_status,p_occurred_at) ON CONFLICT DO NOTHING;
  IF NOT FOUND THEN RETURN; END IF;
  UPDATE public.seller_case_messages SET status=p_status WHERE provider_id=p_provider_id
    AND (status='accepted' OR (status='delivered' AND p_status='bounced'));
END $$;
-- Webhooks may precede the acceptance commit; reconcile already verified receipts on commit.
CREATE FUNCTION public.seller_email_reconcile_receipt() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
  IF NEW.status='accepted' THEN
    IF EXISTS(SELECT 1 FROM public.seller_email_delivery_receipts WHERE provider_id=NEW.provider_id AND status='bounced') THEN NEW.status:='bounced';
    ELSIF EXISTS(SELECT 1 FROM public.seller_email_delivery_receipts WHERE provider_id=NEW.provider_id AND status='delivered') THEN NEW.status:='delivered'; END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER seller_email_reconcile_receipt BEFORE UPDATE ON public.seller_case_messages FOR EACH ROW EXECUTE FUNCTION public.seller_email_reconcile_receipt();
REVOKE ALL ON FUNCTION public.seller_email_prepare(UUID,UUID,TEXT),public.seller_email_accept(UUID,UUID,TEXT),public.seller_email_delivery(TEXT,TEXT,TEXT,TIMESTAMPTZ),public.seller_email_reconcile_receipt() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.seller_email_prepare(UUID,UUID,TEXT),public.seller_email_accept(UUID,UUID,TEXT),public.seller_email_delivery(TEXT,TEXT,TEXT,TIMESTAMPTZ) TO service_role;
