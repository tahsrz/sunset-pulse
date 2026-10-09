-- Bind personal planner items to a current owner's seller action without
-- copying seller contact details into planner snapshots.
ALTER TABLE public.realtor_planner_items
  ADD COLUMN source_lead_id UUID REFERENCES public.agent_site_leads(id) ON DELETE SET NULL,
  ADD COLUMN source_lead_action_key TEXT,
  ADD COLUMN source_lead_revision INTEGER;

ALTER TABLE public.realtor_planner_items
  ADD CONSTRAINT realtor_planner_seller_source_complete CHECK (
    (source_lead_id IS NULL AND source_lead_action_key IS NULL AND source_lead_revision IS NULL)
    OR (source_lead_id IS NOT NULL AND source_lead_action_key IS NOT NULL AND source_lead_revision > 0)
  ),
  ADD CONSTRAINT realtor_planner_source_exclusive CHECK (
    NOT (source_lead_id IS NOT NULL AND source_sprint_task_id IS NOT NULL)
  );

CREATE UNIQUE INDEX realtor_planner_seller_action_once_idx
  ON public.realtor_planner_items(user_id, source_lead_id, source_lead_action_key)
  WHERE source_lead_id IS NOT NULL;
CREATE INDEX realtor_planner_seller_source_idx
  ON public.realtor_planner_items(source_lead_id, status) WHERE source_lead_id IS NOT NULL;

CREATE FUNCTION public.realtor_preserve_seller_lead_source()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
  IF OLD.source_lead_id IS NOT NULL AND NEW.source_lead_id IS NOT NULL
    AND (NEW.source_lead_id IS DISTINCT FROM OLD.source_lead_id
      OR NEW.source_lead_action_key IS DISTINCT FROM OLD.source_lead_action_key
      OR NEW.kind IS DISTINCT FROM OLD.kind OR NEW.property_id IS DISTINCT FROM OLD.property_id) THEN
    RAISE EXCEPTION 'A seller action must retain its source and planner kind' USING ERRCODE='22023';
  END IF;
  IF OLD.source_lead_id IS NULL AND NEW.source_lead_id IS NOT NULL
    AND (NEW.source_sprint_task_id IS NOT NULL OR NEW.kind NOT IN ('follow_up','appointment')
      OR NEW.property_id IS NOT NULL) THEN
    RAISE EXCEPTION 'Invalid seller planner source' USING ERRCODE='22023';
  END IF;
  IF OLD.source_lead_id IS NOT NULL AND NEW.source_lead_id IS NULL
    AND (NEW.source_lead_action_key IS NOT NULL OR NEW.source_lead_revision IS NOT NULL) THEN
    RAISE EXCEPTION 'Seller source cleanup must clear its complete identity' USING ERRCODE='22023';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER realtor_planner_preserve_seller_lead_source
  BEFORE UPDATE ON public.realtor_planner_items
  FOR EACH ROW EXECUTE FUNCTION public.realtor_preserve_seller_lead_source();

CREATE FUNCTION public.realtor_clear_deleted_seller_source()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
  UPDATE public.realtor_planner_items
    SET source_lead_id=NULL, source_lead_action_key=NULL, source_lead_revision=NULL
    WHERE source_lead_id=OLD.id;
  RETURN OLD;
END $$;
CREATE TRIGGER realtor_clear_deleted_seller_source
  BEFORE DELETE ON public.agent_site_leads
  FOR EACH ROW EXECUTE FUNCTION public.realtor_clear_deleted_seller_source();

CREATE OR REPLACE FUNCTION public.seller_lead_event_immutable()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
  -- Preserve immutable outcomes while a lead exists. A hard privacy deletion
  -- of the parent may cascade its dependent history in the same transaction.
  IF TG_OP='DELETE' AND NOT EXISTS (
    SELECT 1 FROM public.agent_site_leads lead WHERE lead.id=OLD.lead_id
  ) THEN RETURN OLD; END IF;
  RAISE EXCEPTION 'Seller outcome history is immutable' USING ERRCODE='55000';
END $$;

CREATE FUNCTION public.realtor_cancel_seller_tasks_for_lead_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_planner_id UUID; v_occurrence_id UUID;
  revoke_changed BOOLEAN;
BEGIN
  revoke_changed := OLD.metadata#>>'{sellerPlan,requestedContact,revokedAt}' IS DISTINCT FROM
    NEW.metadata#>>'{sellerPlan,requestedContact,revokedAt}'
    AND NEW.metadata#>>'{sellerPlan,requestedContact,revokedAt}' IS NOT NULL;
  IF NEW.source <> 'seller_plan' OR (NEW.status NOT IN ('archived','closed') AND NOT revoke_changed) THEN RETURN NEW; END IF;
  FOR v_planner_id IN SELECT item.id FROM public.realtor_planner_items AS item
    WHERE item.source_lead_id=NEW.id ORDER BY item.id FOR UPDATE LOOP
    FOR v_occurrence_id IN SELECT occurrence.id FROM public.realtor_planner_occurrences AS occurrence
      WHERE occurrence.item_id=v_planner_id AND occurrence.status='pending'
      ORDER BY occurrence.id FOR UPDATE LOOP
      UPDATE public.realtor_reminders AS reminder SET status='superseded',
        revision=reminder.revision+1,updated_at=now()
      WHERE reminder.occurrence_id=v_occurrence_id AND reminder.status IN ('scheduled','visible');
      UPDATE public.realtor_planner_occurrences SET status='cancelled',
        revision=revision+1,updated_at=now() WHERE id=v_occurrence_id AND status='pending';
    END LOOP;
  END LOOP;
  RETURN NEW;
END $$;
CREATE TRIGGER realtor_cancel_seller_tasks_after_lead_change
  AFTER UPDATE ON public.agent_site_leads FOR EACH ROW
  WHEN (OLD.source='seller_plan' AND (NEW.status IN ('archived','closed')
    OR NEW.metadata#>>'{sellerPlan,requestedContact,revokedAt}' IS DISTINCT FROM OLD.metadata#>>'{sellerPlan,requestedContact,revokedAt}'))
  EXECUTE FUNCTION public.realtor_cancel_seller_tasks_for_lead_change();

CREATE FUNCTION public.realtor_cancel_cancelled_consultation_task()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_planner_id UUID; v_occurrence_id UUID;
BEGIN
  IF NEW.event_type<>'consultation_cancelled' THEN RETURN NEW; END IF;
  FOR v_planner_id IN SELECT item.id FROM public.realtor_planner_items item
    WHERE item.source_lead_id=NEW.lead_id
      AND item.source_lead_action_key=('consultation:' || (NEW.details->>'consultationEventId'))
    ORDER BY item.id FOR UPDATE LOOP
    FOR v_occurrence_id IN SELECT occurrence.id FROM public.realtor_planner_occurrences occurrence
      WHERE occurrence.item_id=v_planner_id AND occurrence.status='pending'
      ORDER BY occurrence.id FOR UPDATE LOOP
      UPDATE public.realtor_reminders reminder SET status='superseded',
        revision=reminder.revision+1,updated_at=now()
      WHERE reminder.occurrence_id=v_occurrence_id AND reminder.status IN ('scheduled','visible');
      UPDATE public.realtor_planner_occurrences SET status='cancelled',
        revision=revision+1,updated_at=now() WHERE id=v_occurrence_id AND status='pending';
    END LOOP;
  END LOOP;
  RETURN NEW;
END $$;
CREATE TRIGGER realtor_cancel_cancelled_consultation_task
  AFTER INSERT ON public.seller_lead_events FOR EACH ROW
  EXECUTE FUNCTION public.realtor_cancel_cancelled_consultation_task();

ALTER FUNCTION public.realtor_save_planner_item(UUID,UUID,UUID,INTEGER,UUID,JSONB,JSONB)
  RENAME TO realtor_save_planner_item_without_seller_identity;

CREATE FUNCTION public.realtor_save_planner_item(
  p_actor_id UUID, p_workspace_id UUID, p_item_id UUID, p_expected_revision INTEGER,
  p_request_key UUID, p_item JSONB, p_occurrences JSONB
) RETURNS TABLE(item_id UUID, revision INTEGER, reused BOOLEAN)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE
  source JSONB := p_item->'sellerLead';
  source_lead public.agent_site_leads%ROWTYPE;
  owned_site public.site_config%ROWTYPE;
  linked_lead UUID;
  linked_key TEXT;
  linked_lead_revision INTEGER;
  saved_id UUID;
  saved_revision INTEGER;
  was_reused BOOLEAN;
  event_uuid UUID;
  action_name TEXT;
  starts_at TIMESTAMPTZ;
  due_at TIMESTAMPTZ;
BEGIN
  IF source IS NULL OR source = 'null'::JSONB THEN
    IF p_item_id IS NOT NULL THEN
      SELECT planner.source_lead_id INTO linked_lead FROM public.realtor_planner_items AS planner
      WHERE planner.id=p_item_id AND planner.user_id=p_actor_id AND planner.workspace_id=p_workspace_id
      FOR UPDATE;
      IF linked_lead IS NOT NULL THEN
        RAISE EXCEPTION 'A seller-linked planner item must retain its source' USING ERRCODE='22023';
      END IF;
    END IF;
    RETURN QUERY SELECT * FROM public.realtor_save_planner_item_without_seller_identity(
      p_actor_id,p_workspace_id,p_item_id,p_expected_revision,p_request_key,p_item - 'sellerLead',p_occurrences);
    RETURN;
  END IF;

  IF NOT public.realtor_personal_access(p_actor_id,p_workspace_id)
    OR jsonb_typeof(source)<>'object' OR octet_length(source::TEXT)>512
    OR p_item->>'kind' NOT IN ('follow_up','appointment')
    OR p_item->'property' IS DISTINCT FROM 'null'::JSONB
    OR NULLIF(p_item->>'sourceSprintTaskId','') IS NOT NULL
    OR p_item#>>'{due,recurrence,frequency}' IS DISTINCT FROM 'once'
    OR jsonb_array_length(COALESCE(p_occurrences,'[]'::JSONB)) NOT BETWEEN 1 AND 1 THEN
    RAISE EXCEPTION 'Invalid seller planner source' USING ERRCODE='22023';
  END IF;
  PERFORM 1 FROM public.platform_workspaces workspace
    WHERE workspace.id=p_workspace_id AND workspace.kind='personal'
      AND workspace.created_by=p_actor_id AND workspace.status='active'
    FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Personal planner access denied' USING ERRCODE='42501'; END IF;
  PERFORM 1 FROM public.platform_memberships membership
    WHERE membership.workspace_id=p_workspace_id AND membership.user_id=p_actor_id
      AND membership.role='owner' AND membership.status='active'
    FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Personal planner access denied' USING ERRCODE='42501'; END IF;
  BEGIN
    linked_lead := (source->>'leadId')::UUID;
    linked_lead_revision := (source->>'expectedLeadRevision')::INTEGER;
    linked_key := source->>'actionKey';
  EXCEPTION WHEN invalid_text_representation OR numeric_value_out_of_range THEN
    RAISE EXCEPTION 'Invalid seller planner identity' USING ERRCODE='22023';
  END;
  IF linked_lead IS NULL OR linked_lead_revision<1 OR char_length(linked_key) NOT BETWEEN 1 AND 120 THEN
    RAISE EXCEPTION 'Invalid seller planner identity' USING ERRCODE='22023';
  END IF;

  SELECT site.* INTO owned_site FROM public.site_config AS site
  JOIN public.agent_site_leads AS lead ON lead.agent_id=site.agent_id
  WHERE lead.id=linked_lead AND site.owner_id=p_actor_id AND site.status='active'
  FOR SHARE OF site;
  IF NOT FOUND THEN RAISE EXCEPTION 'Seller source is unavailable' USING ERRCODE='P0002'; END IF;
  SELECT lead.* INTO source_lead FROM public.agent_site_leads AS lead
  WHERE lead.id=linked_lead AND lead.agent_id=owned_site.agent_id AND lead.source='seller_plan'
  FOR UPDATE;
  IF NOT FOUND OR source_lead.revision<>linked_lead_revision
    OR source_lead.status IN ('archived','closed')
    OR source_lead.metadata#>>'{sellerPlan,requestedContact,revokedAt}' IS NOT NULL
    OR source_lead.metadata#>>'{sellerPlan,requestedContact,granted}' IS DISTINCT FROM 'true' THEN
    RAISE EXCEPTION 'Seller source changed or is unavailable' USING ERRCODE='40001';
  END IF;

  action_name := split_part(linked_key,':',1);
  IF linked_key='initial-response:v1' THEN
    IF source_lead.contact_attempted_at IS NOT NULL THEN
      RAISE EXCEPTION 'Initial seller response has already been handled' USING ERRCODE='23505';
    END IF;
  ELSIF action_name IN ('reply','consultation') THEN
    BEGIN event_uuid := split_part(linked_key,':',2)::UUID;
    EXCEPTION WHEN invalid_text_representation THEN RAISE EXCEPTION 'Invalid seller action key' USING ERRCODE='22023'; END;
    IF action_name='reply' AND NOT EXISTS (
      SELECT 1 FROM public.seller_lead_events AS event WHERE event.id=event_uuid
        AND event.lead_id=linked_lead AND event.event_type='customer_replied'
    ) THEN RAISE EXCEPTION 'Seller reply source is unavailable' USING ERRCODE='40001'; END IF;
    IF action_name='consultation' THEN
      SELECT event.occurred_at INTO starts_at FROM public.seller_lead_events AS event
      WHERE event.id=event_uuid AND event.lead_id=linked_lead AND event.event_type='consultation_confirmed';
      IF starts_at IS NULL THEN RAISE EXCEPTION 'Seller consultation source is unavailable' USING ERRCODE='40001'; END IF;
      IF p_item#>>'{due,utcOffsetMinutes}' IS NOT NULL THEN
        due_at := (((p_item#>>'{due,anchorDate}')::DATE + (p_item#>>'{due,localTime}')::TIME)
          - make_interval(mins => (p_item#>>'{due,utcOffsetMinutes}')::INTEGER)) AT TIME ZONE 'UTC';
      ELSE
        due_at := ((p_item#>>'{due,anchorDate}')::DATE + (p_item#>>'{due,localTime}')::TIME)
          AT TIME ZONE (p_item#>>'{due,timeZone}');
      END IF;
      IF p_item->>'kind'<>'appointment' OR due_at IS DISTINCT FROM starts_at THEN
        RAISE EXCEPTION 'Seller consultation time must match its confirmed time' USING ERRCODE='22023';
      END IF;
    END IF;
  ELSE
    RAISE EXCEPTION 'Unknown seller action key' USING ERRCODE='22023';
  END IF;

  IF p_item_id IS NOT NULL THEN
    SELECT planner.source_lead_id,planner.source_lead_action_key INTO linked_lead,linked_key
    FROM public.realtor_planner_items AS planner WHERE planner.id=p_item_id
      AND planner.user_id=p_actor_id AND planner.workspace_id=p_workspace_id FOR UPDATE;
    IF NOT FOUND OR linked_lead IS DISTINCT FROM (source->>'leadId')::UUID
      OR linked_key IS DISTINCT FROM source->>'actionKey' THEN
      RAISE EXCEPTION 'Seller planner identity cannot be changed' USING ERRCODE='22023';
    END IF;
  END IF;

  SELECT saved.item_id,saved.revision,saved.reused INTO saved_id,saved_revision,was_reused
  FROM public.realtor_save_planner_item_without_seller_identity(
    p_actor_id,p_workspace_id,p_item_id,p_expected_revision,p_request_key,p_item,p_occurrences
  ) AS saved;
  IF p_item_id IS NULL THEN
    UPDATE public.realtor_planner_items AS planner
      SET source_lead_id=(source->>'leadId')::UUID,
        source_lead_action_key=source->>'actionKey',source_lead_revision=linked_lead_revision
      WHERE planner.id=saved_id AND planner.user_id=p_actor_id AND planner.workspace_id=p_workspace_id
        AND planner.source_lead_id IS NULL;
    IF NOT FOUND THEN
      SELECT planner.source_lead_id,planner.source_lead_action_key INTO linked_lead,linked_key
      FROM public.realtor_planner_items AS planner WHERE planner.id=saved_id AND planner.user_id=p_actor_id;
      IF linked_lead IS DISTINCT FROM (source->>'leadId')::UUID OR linked_key IS DISTINCT FROM source->>'actionKey' THEN
        RAISE EXCEPTION 'Seller action already has a different planner item' USING ERRCODE='23505';
      END IF;
    END IF;
  ELSE
    UPDATE public.realtor_planner_items SET source_lead_revision=linked_lead_revision
      WHERE id=saved_id AND source_lead_id=(source->>'leadId')::UUID
        AND source_lead_action_key=source->>'actionKey';
  END IF;
  RETURN QUERY SELECT saved_id,saved_revision,was_reused;
END $$;

REVOKE ALL ON FUNCTION public.realtor_save_planner_item_without_seller_identity(UUID,UUID,UUID,INTEGER,UUID,JSONB,JSONB)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.realtor_save_planner_item_without_seller_identity(UUID,UUID,UUID,INTEGER,UUID,JSONB,JSONB)
  TO service_role;
REVOKE ALL ON FUNCTION public.realtor_save_planner_item(UUID,UUID,UUID,INTEGER,UUID,JSONB,JSONB)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.realtor_save_planner_item(UUID,UUID,UUID,INTEGER,UUID,JSONB,JSONB)
  TO service_role;
REVOKE ALL ON FUNCTION public.realtor_preserve_seller_lead_source(),public.realtor_clear_deleted_seller_source()
  FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.realtor_cancel_seller_tasks_for_lead_change()
  FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.realtor_cancel_cancelled_consultation_task()
  FROM PUBLIC,anon,authenticated,service_role;
