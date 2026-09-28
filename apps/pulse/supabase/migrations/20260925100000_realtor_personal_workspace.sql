-- Private realtor planner and cash ledger. These rows belong only to the
-- personal workspace owner; a team membership does not grant financial access.

CREATE TABLE public.realtor_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL UNIQUE REFERENCES public.platform_workspaces(id) ON DELETE RESTRICT,
  time_zone TEXT NOT NULL DEFAULT 'America/Chicago',
  reminders_enabled BOOLEAN NOT NULL DEFAULT false,
  gamification_enabled BOOLEAN NOT NULL DEFAULT true,
  celebrations_enabled BOOLEAN NOT NULL DEFAULT true,
  hide_amounts_on_today BOOLEAN NOT NULL DEFAULT false,
  records_start_date DATE,
  revision INTEGER NOT NULL DEFAULT 1 CHECK (revision > 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT realtor_preferences_timezone_check CHECK (char_length(time_zone) BETWEEN 1 AND 80)
);

CREATE TABLE public.realtor_planner_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.platform_workspaces(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('bill','professional_deadline','appointment','follow_up','task','weekly_review')),
  title TEXT NOT NULL CHECK (char_length(btrim(title)) BETWEEN 1 AND 160),
  notes TEXT NOT NULL DEFAULT '' CHECK (char_length(notes) <= 2000),
  due_spec JSONB NOT NULL CHECK (jsonb_typeof(due_spec) = 'object'),
  expected_amount_cents BIGINT CHECK (expected_amount_cents BETWEEN 1 AND 1000000000000),
  property_id UUID,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','archived')),
  materialized_through DATE,
  revision INTEGER NOT NULL DEFAULT 1 CHECK (revision > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (id, user_id, workspace_id),
  CONSTRAINT realtor_item_bill_amount_check CHECK (kind = 'bill' OR expected_amount_cents IS NULL)
);
CREATE INDEX realtor_planner_items_owner_status_idx ON public.realtor_planner_items(user_id, workspace_id, status, id);

CREATE TABLE public.realtor_planner_occurrences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.platform_workspaces(id) ON DELETE CASCADE,
  occurrence_key TEXT NOT NULL CHECK (char_length(occurrence_key) <= 200),
  original_date DATE NOT NULL,
  effective_date DATE NOT NULL,
  effective_time TIME,
  item_revision INTEGER NOT NULL CHECK (item_revision > 0),
  title_snapshot TEXT NOT NULL,
  kind_snapshot TEXT NOT NULL CHECK (kind_snapshot IN ('bill','professional_deadline','appointment','follow_up','task','weekly_review')),
  expected_amount_cents BIGINT CHECK (expected_amount_cents BETWEEN 1 AND 1000000000000),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','completed','skipped','cancelled')),
  completed_at TIMESTAMPTZ,
  completion_details JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(completion_details) = 'object'),
  revision INTEGER NOT NULL DEFAULT 1 CHECK (revision > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (item_id, user_id, workspace_id)
    REFERENCES public.realtor_planner_items(id, user_id, workspace_id) ON DELETE CASCADE,
  UNIQUE (id, user_id, workspace_id),
  CONSTRAINT realtor_occurrences_item_key UNIQUE (item_id, occurrence_key),
  CHECK (kind_snapshot = 'bill' OR expected_amount_cents IS NULL)
);
CREATE INDEX realtor_occurrences_agenda_idx ON public.realtor_planner_occurrences(user_id, workspace_id, effective_date, id);
CREATE INDEX realtor_occurrences_pending_item_idx ON public.realtor_planner_occurrences(item_id, original_date) WHERE status = 'pending';

CREATE TABLE public.realtor_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  occurrence_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.platform_workspaces(id) ON DELETE CASCADE,
  occurrence_revision INTEGER NOT NULL CHECK (occurrence_revision > 0),
  offset_days INTEGER NOT NULL CHECK (offset_days BETWEEN 0 AND 365),
  scheduled_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','visible','dismissed','superseded')),
  snoozed_until TIMESTAMPTZ,
  revision INTEGER NOT NULL DEFAULT 1 CHECK (revision > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (occurrence_id, user_id, workspace_id)
    REFERENCES public.realtor_planner_occurrences(id, user_id, workspace_id) ON DELETE CASCADE,
  CONSTRAINT realtor_reminders_occurrence_revision_offset_unique
    UNIQUE (occurrence_id, occurrence_revision, offset_days)
);
CREATE INDEX realtor_reminders_due_idx ON public.realtor_reminders(user_id, scheduled_at, id) WHERE status IN ('scheduled','visible');

CREATE TABLE public.realtor_financial_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.platform_workspaces(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('commission','expense','expected_commission')),
  current_revision INTEGER NOT NULL DEFAULT 1 CHECK (current_revision > 0),
  occurrence_id UUID,
  realized_by_record_id UUID UNIQUE REFERENCES public.realtor_financial_records(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','void','realized')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (occurrence_id, user_id, workspace_id)
    REFERENCES public.realtor_planner_occurrences(id, user_id, workspace_id) ON DELETE RESTRICT,
  UNIQUE (id, user_id, workspace_id),
  UNIQUE (occurrence_id),
  CHECK (realized_by_record_id IS NULL OR kind = 'expected_commission')
);

CREATE TABLE public.realtor_financial_revisions (
  record_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.platform_workspaces(id) ON DELETE CASCADE,
  revision INTEGER NOT NULL CHECK (revision > 0),
  request_key UUID NOT NULL,
  input_hash TEXT NOT NULL CHECK (input_hash ~ '^[a-f0-9]{64}$'),
  effective_date DATE NOT NULL,
  data JSONB NOT NULL CHECK (jsonb_typeof(data) = 'object' AND octet_length(data::text) <= 8192),
  actor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (record_id, revision),
  UNIQUE (user_id, request_key),
  FOREIGN KEY (record_id, user_id, workspace_id)
    REFERENCES public.realtor_financial_records(id, user_id, workspace_id) ON DELETE CASCADE
);
ALTER TABLE public.realtor_financial_records
  ADD CONSTRAINT realtor_financial_current_revision_fk
  FOREIGN KEY (id, current_revision) REFERENCES public.realtor_financial_revisions(record_id, revision)
  DEFERRABLE INITIALLY DEFERRED;
CREATE INDEX realtor_financial_date_idx ON public.realtor_financial_revisions(user_id, workspace_id, effective_date, record_id);
CREATE INDEX realtor_financial_current_idx ON public.realtor_financial_records(user_id, workspace_id, kind, status);
CREATE VIEW public.realtor_financial_current WITH (security_invoker = true) AS
  SELECT r.id,r.user_id,r.workspace_id,r.kind,r.current_revision,r.occurrence_id,r.realized_by_record_id,r.status,
    rev.effective_date,rev.data,rev.request_key,rev.created_at
  FROM public.realtor_financial_records r
  JOIN public.realtor_financial_revisions rev ON rev.record_id=r.id AND rev.revision=r.current_revision;
GRANT SELECT ON public.realtor_financial_current TO authenticated;

CREATE TABLE public.realtor_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.platform_workspaces(id) ON DELETE CASCADE,
  year SMALLINT NOT NULL CHECK (year BETWEEN 2000 AND 2200),
  metric TEXT NOT NULL CHECK (metric IN ('net_income','closings','weekly_reviews')),
  target BIGINT NOT NULL CHECK (target BETWEEN 1 AND 1000000000000),
  revision INTEGER NOT NULL DEFAULT 1 CHECK (revision > 0),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (metric = 'net_income' OR target <= 100000),
  UNIQUE (id, user_id, workspace_id)
);
CREATE UNIQUE INDEX realtor_goals_active_metric_idx
  ON public.realtor_goals(user_id, workspace_id, year, metric) WHERE status = 'active';

CREATE TABLE public.realtor_mutation_receipts (
  actor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  request_key UUID NOT NULL,
  operation TEXT NOT NULL CHECK (char_length(operation) BETWEEN 1 AND 80),
  input_hash TEXT NOT NULL CHECK (input_hash ~ '^[a-f0-9]{64}$'),
  resource_id UUID,
  resource_revision INTEGER,
  response JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(response) = 'object'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (actor_id, request_key)
);

CREATE OR REPLACE FUNCTION public.realtor_personal_access(p_actor_id UUID, p_workspace_id UUID)
RETURNS BOOLEAN LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.platform_workspaces w
    JOIN public.platform_memberships m ON m.workspace_id = w.id
    WHERE w.id = p_workspace_id AND w.kind = 'personal' AND w.status = 'active'
      AND w.created_by = p_actor_id AND m.user_id = p_actor_id
      AND m.role = 'owner' AND m.status = 'active'
      AND (auth.role() = 'service_role' OR p_actor_id = auth.uid())
  )
$$;

ALTER TABLE public.realtor_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.realtor_planner_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.realtor_planner_occurrences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.realtor_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.realtor_financial_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.realtor_financial_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.realtor_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.realtor_mutation_receipts ENABLE ROW LEVEL SECURITY;

CREATE POLICY realtor_preferences_owner_read ON public.realtor_preferences FOR SELECT TO authenticated USING (user_id = auth.uid() AND public.realtor_personal_access(user_id, workspace_id));
CREATE POLICY realtor_planner_owner_read ON public.realtor_planner_items FOR SELECT TO authenticated USING (user_id = auth.uid() AND public.realtor_personal_access(user_id, workspace_id));
CREATE POLICY realtor_occurrences_owner_read ON public.realtor_planner_occurrences FOR SELECT TO authenticated USING (user_id = auth.uid() AND public.realtor_personal_access(user_id, workspace_id));
CREATE POLICY realtor_reminders_owner_read ON public.realtor_reminders FOR SELECT TO authenticated USING (user_id = auth.uid() AND public.realtor_personal_access(user_id, workspace_id));
CREATE POLICY realtor_financial_owner_read ON public.realtor_financial_records FOR SELECT TO authenticated USING (user_id = auth.uid() AND public.realtor_personal_access(user_id, workspace_id));
CREATE POLICY realtor_financial_revision_owner_read ON public.realtor_financial_revisions FOR SELECT TO authenticated USING (user_id = auth.uid() AND public.realtor_personal_access(user_id, workspace_id));
CREATE POLICY realtor_goals_owner_read ON public.realtor_goals FOR SELECT TO authenticated USING (user_id = auth.uid() AND public.realtor_personal_access(user_id, workspace_id));

GRANT SELECT ON public.realtor_preferences, public.realtor_planner_items, public.realtor_planner_occurrences,
  public.realtor_reminders, public.realtor_financial_records, public.realtor_financial_revisions, public.realtor_goals TO authenticated;
REVOKE ALL ON public.realtor_mutation_receipts FROM PUBLIC, anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.realtor_preferences, public.realtor_planner_items,
  public.realtor_planner_occurrences, public.realtor_reminders, public.realtor_financial_records,
  public.realtor_financial_revisions, public.realtor_goals FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.realtor_setup_personal_workspace(
  p_actor_id UUID, p_workspace_id UUID, p_request_key UUID, p_expected_revision INTEGER, p_name TEXT, p_time_zone TEXT,
  p_reminders_enabled BOOLEAN, p_gamification_enabled BOOLEAN, p_celebrations_enabled BOOLEAN,
  p_hide_amounts BOOLEAN, p_records_start_date DATE
) RETURNS TABLE(workspace_id UUID, revision INTEGER, reused BOOLEAN)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE saved public.realtor_preferences%ROWTYPE; receipt public.realtor_mutation_receipts%ROWTYPE;
  request_hash TEXT; resolved_workspace UUID;
BEGIN
  IF p_actor_id IS NULL OR p_request_key IS NULL OR p_workspace_id IS NULL
    OR char_length(btrim(COALESCE(p_name,''))) NOT BETWEEN 1 AND 160
    OR char_length(COALESCE(p_time_zone,'')) NOT BETWEEN 1 AND 80 THEN
    RAISE EXCEPTION 'Invalid personal planner setup' USING ERRCODE='22023';
  END IF;
  request_hash := encode(digest(jsonb_build_object('name',btrim(p_name),'timeZone',p_time_zone,
    'remindersEnabled',p_reminders_enabled,'gamificationEnabled',p_gamification_enabled,
    'celebrationsEnabled',p_celebrations_enabled,'hideAmounts',p_hide_amounts,'recordsStartDate',p_records_start_date)::text,'sha256'),'hex');
  SELECT * INTO receipt FROM public.realtor_mutation_receipts WHERE actor_id=p_actor_id AND request_key=p_request_key;
  IF FOUND THEN
    IF receipt.input_hash <> request_hash OR receipt.operation <> 'setup' THEN RAISE EXCEPTION 'Request key conflict' USING ERRCODE='23505'; END IF;
    RETURN QUERY SELECT (receipt.response->>'workspaceId')::UUID, receipt.resource_revision, TRUE;
    RETURN;
  END IF;
  BEGIN
    SELECT result.workspace_id INTO resolved_workspace
    FROM public.platform_create_workspace_with_owner(p_actor_id,p_workspace_id,'personal',btrim(p_name)) AS result;
  EXCEPTION WHEN unique_violation THEN
    SELECT w.id INTO resolved_workspace FROM public.platform_workspaces w
    WHERE w.created_by=p_actor_id AND w.kind='personal' AND w.status='active' FOR UPDATE;
    IF resolved_workspace IS NULL THEN RAISE; END IF;
  END;
  SELECT * INTO saved FROM public.realtor_preferences WHERE user_id=p_actor_id FOR UPDATE;
  IF FOUND THEN
    IF saved.workspace_id <> resolved_workspace THEN RAISE EXCEPTION 'A different personal workspace is already configured' USING ERRCODE='40001'; END IF;
    IF p_expected_revision IS NULL OR saved.revision <> p_expected_revision THEN RAISE EXCEPTION 'Personal preferences changed' USING ERRCODE='40001'; END IF;
    UPDATE public.realtor_preferences AS preference SET time_zone=p_time_zone,reminders_enabled=p_reminders_enabled,
      gamification_enabled=p_gamification_enabled,celebrations_enabled=p_celebrations_enabled,
      hide_amounts_on_today=p_hide_amounts,records_start_date=p_records_start_date,
      revision=preference.revision+1,updated_at=now() WHERE preference.user_id=p_actor_id RETURNING preference.* INTO saved;
  ELSE
    IF p_expected_revision IS NOT NULL THEN RAISE EXCEPTION 'Unexpected personal preference revision' USING ERRCODE='22023'; END IF;
    INSERT INTO public.realtor_preferences(user_id,workspace_id,time_zone,reminders_enabled,gamification_enabled,
      celebrations_enabled,hide_amounts_on_today,records_start_date)
    VALUES(p_actor_id,resolved_workspace,p_time_zone,p_reminders_enabled,p_gamification_enabled,
      p_celebrations_enabled,p_hide_amounts,p_records_start_date) RETURNING * INTO saved;
  END IF;
  INSERT INTO public.realtor_mutation_receipts(actor_id,request_key,operation,input_hash,resource_id,resource_revision,response)
  VALUES(p_actor_id,p_request_key,'setup',request_hash,saved.workspace_id,saved.revision,jsonb_build_object('workspaceId',saved.workspace_id));
  RETURN QUERY SELECT saved.workspace_id,saved.revision,saved.workspace_id <> p_workspace_id;
END $$;

CREATE OR REPLACE FUNCTION public.realtor_save_planner_item(
  p_actor_id UUID, p_workspace_id UUID, p_item_id UUID, p_expected_revision INTEGER,
  p_request_key UUID, p_item JSONB, p_occurrences JSONB
) RETURNS TABLE(item_id UUID, revision INTEGER, reused BOOLEAN)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE saved public.realtor_planner_items%ROWTYPE; receipt public.realtor_mutation_receipts%ROWTYPE;
  payload_hash TEXT; item_uuid UUID; occurrence_row JSONB; reminder_row JSONB; occurrence_uuid UUID;
  occurrence_revision INTEGER; max_date DATE;
BEGIN
  IF NOT public.realtor_personal_access(p_actor_id,p_workspace_id) THEN RAISE EXCEPTION 'Personal planner access denied' USING ERRCODE='42501'; END IF;
  IF jsonb_typeof(p_item) <> 'object' OR octet_length(p_item::text) > 8192
    OR jsonb_typeof(p_occurrences) <> 'array' OR jsonb_array_length(p_occurrences) > 200
    OR p_request_key IS NULL THEN RAISE EXCEPTION 'Invalid planner item' USING ERRCODE='22023'; END IF;
  IF p_item->>'kind' NOT IN ('bill','professional_deadline','appointment','follow_up','task','weekly_review')
    OR char_length(btrim(COALESCE(p_item->>'title',''))) NOT BETWEEN 1 AND 160
    OR (p_item->>'notes') IS NULL OR char_length(p_item->>'notes') > 2000
    OR jsonb_typeof(p_item->'due') <> 'object'
    OR (p_item->>'kind' <> 'bill' AND p_item->'expectedAmountCents' <> 'null'::jsonb) THEN
    RAISE EXCEPTION 'Invalid planner item fields' USING ERRCODE='22023';
  END IF;
  payload_hash := encode(digest(jsonb_build_object('item',p_item,'occurrences',p_occurrences)::text,'sha256'),'hex');
  SELECT * INTO receipt FROM public.realtor_mutation_receipts WHERE actor_id=p_actor_id AND request_key=p_request_key;
  IF FOUND THEN
    IF receipt.operation <> 'planner_item' OR receipt.input_hash <> payload_hash THEN RAISE EXCEPTION 'Request key conflict' USING ERRCODE='23505'; END IF;
    RETURN QUERY SELECT receipt.resource_id,receipt.resource_revision,TRUE; RETURN;
  END IF;
  IF p_item_id IS NULL THEN
    IF p_expected_revision IS NOT NULL THEN RAISE EXCEPTION 'Unexpected item revision' USING ERRCODE='22023'; END IF;
    INSERT INTO public.realtor_planner_items(user_id,workspace_id,kind,title,notes,due_spec,expected_amount_cents,property_id)
    VALUES(p_actor_id,p_workspace_id,p_item->>'kind',btrim(p_item->>'title'),p_item->>'notes',p_item->'due',
      NULLIF(p_item->>'expectedAmountCents','null')::BIGINT,NULLIF(p_item#>>'{property,propertyId}','')::UUID)
    RETURNING * INTO saved;
  ELSE
    SELECT * INTO saved FROM public.realtor_planner_items i
     WHERE i.id=p_item_id AND i.user_id=p_actor_id AND i.workspace_id=p_workspace_id AND i.status='active' FOR UPDATE;
    IF NOT FOUND OR saved.revision <> p_expected_revision THEN RAISE EXCEPTION 'Planner item changed' USING ERRCODE='40001'; END IF;
    UPDATE public.realtor_planner_items AS planner SET kind=p_item->>'kind',title=btrim(p_item->>'title'),notes=p_item->>'notes',
      due_spec=p_item->'due',expected_amount_cents=NULLIF(p_item->>'expectedAmountCents','null')::BIGINT,
      property_id=NULLIF(p_item#>>'{property,propertyId}','')::UUID,revision=planner.revision+1,updated_at=now()
     WHERE planner.id=p_item_id RETURNING planner.* INTO saved;
    UPDATE public.realtor_reminders AS reminder SET status='superseded',revision=reminder.revision+1,updated_at=now()
     WHERE reminder.occurrence_id IN (SELECT occurrence.id FROM public.realtor_planner_occurrences AS occurrence WHERE occurrence.item_id=p_item_id AND occurrence.status='pending')
       AND reminder.status IN ('scheduled','visible');
    UPDATE public.realtor_planner_occurrences AS occurrence SET status='cancelled',revision=occurrence.revision+1,updated_at=now()
     WHERE occurrence.item_id=p_item_id AND occurrence.status='pending';
  END IF;
  item_uuid := saved.id;
  FOR occurrence_row IN SELECT value FROM jsonb_array_elements(p_occurrences) LOOP
    IF occurrence_row->>'occurrenceKeyDate' IS NULL OR occurrence_row->>'effectiveDate' IS NULL
      OR char_length(occurrence_row->>'occurrenceKeyDate') <> 10 OR char_length(occurrence_row->>'effectiveDate') <> 10 THEN
      RAISE EXCEPTION 'Invalid occurrence candidate' USING ERRCODE='22023';
    END IF;
    INSERT INTO public.realtor_planner_occurrences AS current_occurrence(item_id,user_id,workspace_id,occurrence_key,original_date,effective_date,
      effective_time,item_revision,title_snapshot,kind_snapshot,expected_amount_cents)
    VALUES(item_uuid,p_actor_id,p_workspace_id,item_uuid::TEXT||':'||(occurrence_row->>'occurrenceKeyDate'),
      (occurrence_row->>'occurrenceKeyDate')::DATE,(occurrence_row->>'effectiveDate')::DATE,
      NULLIF(p_item#>>'{due,localTime}','null')::TIME,saved.revision,saved.title,saved.kind,saved.expected_amount_cents)
    ON CONFLICT ON CONSTRAINT realtor_occurrences_item_key DO UPDATE SET
      effective_date=EXCLUDED.effective_date,effective_time=EXCLUDED.effective_time,item_revision=EXCLUDED.item_revision,
      title_snapshot=EXCLUDED.title_snapshot,kind_snapshot=EXCLUDED.kind_snapshot,
      expected_amount_cents=EXCLUDED.expected_amount_cents,status='pending',revision=current_occurrence.revision+1,updated_at=now()
    WHERE current_occurrence.status IN ('cancelled','pending')
    RETURNING current_occurrence.id,current_occurrence.revision INTO occurrence_uuid,occurrence_revision;
    IF occurrence_uuid IS NOT NULL THEN
      FOR reminder_row IN SELECT value FROM jsonb_array_elements(COALESCE(occurrence_row->'reminders','[]'::jsonb)) LOOP
        IF (reminder_row->>'offsetDays')::INTEGER NOT BETWEEN 0 AND 365
          OR (reminder_row->>'scheduledAt')::TIMESTAMPTZ IS NULL THEN
          RAISE EXCEPTION 'Invalid reminder candidate' USING ERRCODE='22023';
        END IF;
        INSERT INTO public.realtor_reminders(occurrence_id,user_id,workspace_id,occurrence_revision,offset_days,scheduled_at)
        VALUES(occurrence_uuid,p_actor_id,p_workspace_id,occurrence_revision,(reminder_row->>'offsetDays')::INTEGER,
          (reminder_row->>'scheduledAt')::TIMESTAMPTZ)
        ON CONFLICT ON CONSTRAINT realtor_reminders_occurrence_revision_offset_unique DO NOTHING;
      END LOOP;
    END IF;
    max_date := GREATEST(COALESCE(max_date,(occurrence_row->>'effectiveDate')::DATE),(occurrence_row->>'effectiveDate')::DATE);
  END LOOP;
  UPDATE public.realtor_planner_items SET materialized_through=max_date WHERE id=item_uuid AND max_date IS NOT NULL;
  INSERT INTO public.realtor_mutation_receipts(actor_id,request_key,operation,input_hash,resource_id,resource_revision,response)
  VALUES(p_actor_id,p_request_key,'planner_item',payload_hash,item_uuid,saved.revision,jsonb_build_object('itemId',item_uuid));
  INSERT INTO public.platform_audit_events(workspace_id,actor_id,actor_kind,action,resource_type,resource_id,safe_metadata)
  VALUES(p_workspace_id,p_actor_id,'user',CASE WHEN p_expected_revision IS NULL THEN 'realtor.planner.created' ELSE 'realtor.planner.updated' END,
    'realtor_planner_item',item_uuid::TEXT,jsonb_build_object('revision',saved.revision,'kind',saved.kind));
  RETURN QUERY SELECT item_uuid,saved.revision,FALSE;
END $$;

CREATE OR REPLACE FUNCTION public.realtor_apply_occurrence_action(
  p_actor_id UUID,p_workspace_id UUID,p_occurrence_id UUID,p_expected_revision INTEGER,
  p_request_key UUID,p_action TEXT,p_effective_date DATE,p_effective_time TIME,p_completion_details JSONB
) RETURNS TABLE(occurrence_id UUID, revision INTEGER, status TEXT, reused BOOLEAN)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE item public.realtor_planner_occurrences%ROWTYPE; receipt public.realtor_mutation_receipts%ROWTYPE;
  request_hash TEXT; next_status TEXT;
BEGIN
  IF NOT public.realtor_personal_access(p_actor_id,p_workspace_id) THEN RAISE EXCEPTION 'Personal planner access denied' USING ERRCODE='42501'; END IF;
  IF p_action NOT IN ('complete','reopen','skip','reschedule') OR p_request_key IS NULL
    OR jsonb_typeof(COALESCE(p_completion_details,'{}'::jsonb)) <> 'object'
    OR octet_length(COALESCE(p_completion_details,'{}'::jsonb)::text) > 4096 THEN RAISE EXCEPTION 'Invalid planner action' USING ERRCODE='22023'; END IF;
  request_hash := encode(digest(jsonb_build_object('occurrence',p_occurrence_id,'revision',p_expected_revision,'action',p_action,
    'date',p_effective_date,'time',p_effective_time,'details',COALESCE(p_completion_details,'{}'::jsonb))::text,'sha256'),'hex');
  SELECT * INTO receipt FROM public.realtor_mutation_receipts WHERE actor_id=p_actor_id AND request_key=p_request_key;
  IF FOUND THEN
    IF receipt.operation <> 'occurrence_action' OR receipt.input_hash <> request_hash THEN RAISE EXCEPTION 'Request key conflict' USING ERRCODE='23505'; END IF;
    RETURN QUERY SELECT receipt.resource_id,receipt.resource_revision,receipt.response->>'status',TRUE; RETURN;
  END IF;
  SELECT * INTO item FROM public.realtor_planner_occurrences o WHERE o.id=p_occurrence_id AND o.user_id=p_actor_id AND o.workspace_id=p_workspace_id FOR UPDATE;
  IF NOT FOUND OR item.revision <> p_expected_revision THEN RAISE EXCEPTION 'Planner occurrence changed' USING ERRCODE='40001'; END IF;
  IF item.kind_snapshot='bill' AND p_action IN ('complete','reopen') THEN RAISE EXCEPTION 'Record the bill payment to complete this item' USING ERRCODE='22023'; END IF;
  next_status := CASE p_action WHEN 'complete' THEN 'completed' WHEN 'reopen' THEN 'pending' WHEN 'skip' THEN 'skipped' ELSE item.status END;
  IF p_action='reschedule' AND (p_effective_date IS NULL OR p_effective_date < CURRENT_DATE) THEN RAISE EXCEPTION 'Reschedule date must be valid and current or future' USING ERRCODE='22023'; END IF;
  UPDATE public.realtor_reminders AS reminder SET status='superseded',revision=reminder.revision+1,updated_at=now()
   WHERE reminder.occurrence_id=item.id AND reminder.status IN ('scheduled','visible');
  UPDATE public.realtor_planner_occurrences AS occurrence SET status=next_status,
    effective_date=CASE WHEN p_action='reschedule' THEN p_effective_date ELSE effective_date END,
    effective_time=CASE WHEN p_action='reschedule' THEN p_effective_time ELSE effective_time END,
    completion_details=CASE WHEN p_action='complete' THEN COALESCE(p_completion_details,'{}'::jsonb) ELSE completion_details END,
    completed_at=CASE WHEN p_action='complete' THEN now() WHEN p_action='reopen' THEN NULL ELSE completed_at END,
    revision=occurrence.revision+1,updated_at=now() WHERE occurrence.id=item.id RETURNING occurrence.* INTO item;
  INSERT INTO public.realtor_mutation_receipts(actor_id,request_key,operation,input_hash,resource_id,resource_revision,response)
  VALUES(p_actor_id,p_request_key,'occurrence_action',request_hash,item.id,item.revision,jsonb_build_object('status',item.status));
  INSERT INTO public.platform_audit_events(workspace_id,actor_id,actor_kind,action,resource_type,resource_id,safe_metadata)
  VALUES(p_workspace_id,p_actor_id,'user','realtor.occurrence.'||p_action,'realtor_occurrence',item.id::TEXT,jsonb_build_object('revision',item.revision));
  RETURN QUERY SELECT item.id,item.revision,item.status,FALSE;
END $$;

CREATE OR REPLACE FUNCTION public.realtor_save_financial_record(
  p_actor_id UUID,p_workspace_id UUID,p_record_id UUID,p_expected_revision INTEGER,
  p_request_key UUID,p_kind TEXT,p_effective_date DATE,p_data JSONB,p_occurrence_id UUID,p_expected_occurrence_revision INTEGER
) RETURNS TABLE(record_id UUID, revision INTEGER, reused BOOLEAN)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE saved public.realtor_financial_records%ROWTYPE; receipt public.realtor_mutation_receipts%ROWTYPE;
  payload_hash TEXT; new_record UUID; received BIGINT; gross BIGINT; withheld BIGINT; expense BIGINT;
BEGIN
  IF NOT public.realtor_personal_access(p_actor_id,p_workspace_id) THEN RAISE EXCEPTION 'Personal financial access denied' USING ERRCODE='42501'; END IF;
  IF p_kind NOT IN ('commission','expense','expected_commission') OR p_request_key IS NULL
    OR p_data IS NULL OR jsonb_typeof(p_data) <> 'object' OR octet_length(p_data::text)>8192
    OR p_effective_date IS NULL OR (p_kind<>'expected_commission' AND p_effective_date>CURRENT_DATE) THEN RAISE EXCEPTION 'Invalid financial record' USING ERRCODE='22023'; END IF;
  payload_hash := encode(digest(jsonb_build_object('kind',p_kind,'date',p_effective_date,'data',p_data,'occurrence',p_occurrence_id)::text,'sha256'),'hex');
  SELECT * INTO receipt FROM public.realtor_mutation_receipts WHERE actor_id=p_actor_id AND request_key=p_request_key;
  IF FOUND THEN
    IF receipt.operation <> 'financial_record' OR receipt.input_hash <> payload_hash THEN RAISE EXCEPTION 'Request key conflict' USING ERRCODE='23505'; END IF;
    RETURN QUERY SELECT receipt.resource_id,receipt.resource_revision,TRUE; RETURN;
  END IF;
  IF p_kind='commission' THEN
    IF p_data->>'mode'='gross' THEN
      gross := (p_data->>'grossCents')::BIGINT; withheld := (p_data->>'withheldCents')::BIGINT;
      IF gross NOT BETWEEN 1 AND 1000000000000 OR withheld NOT BETWEEN 0 AND gross THEN RAISE EXCEPTION 'Invalid commission amounts' USING ERRCODE='22023'; END IF;
      received := gross-withheld;
    ELSIF p_data->>'mode'='net_deposit' THEN
      received := (p_data->>'depositCents')::BIGINT; gross:=NULL; withheld:=NULL;
      IF received NOT BETWEEN 1 AND 1000000000000 THEN RAISE EXCEPTION 'Invalid deposit amount' USING ERRCODE='22023'; END IF;
    ELSE RAISE EXCEPTION 'Invalid commission mode' USING ERRCODE='22023'; END IF;
    p_data := p_data || jsonb_build_object('receivedCents',received,'grossCents',gross,'withheldCents',withheld);
  ELSIF p_kind='expense' THEN
    expense := (p_data->>'amountCents')::BIGINT;
    IF expense NOT BETWEEN 1 AND 1000000000000 OR p_data->>'category' NOT IN ('broker_dues','mls','association','education','license','insurance','marketing','software','other') THEN
      RAISE EXCEPTION 'Invalid expense fields' USING ERRCODE='22023';
    END IF;
  ELSIF p_data->>'estimatedTakeHomeCents' IS NULL OR (p_data->>'estimatedTakeHomeCents')::BIGINT NOT BETWEEN 1 AND 1000000000000 THEN
    RAISE EXCEPTION 'Invalid expected commission' USING ERRCODE='22023';
  END IF;
  IF p_occurrence_id IS NOT NULL AND p_kind <> 'expense' THEN RAISE EXCEPTION 'Only a bill payment can link an occurrence' USING ERRCODE='22023'; END IF;
  IF (p_occurrence_id IS NULL) <> (p_expected_occurrence_revision IS NULL) THEN RAISE EXCEPTION 'Bill payment revision is required' USING ERRCODE='22023'; END IF;
  IF p_record_id IS NULL THEN
    IF p_expected_revision IS NOT NULL THEN RAISE EXCEPTION 'Unexpected record revision' USING ERRCODE='22023'; END IF;
    INSERT INTO public.realtor_financial_records(user_id,workspace_id,kind,occurrence_id)
    VALUES(p_actor_id,p_workspace_id,p_kind,p_occurrence_id) RETURNING * INTO saved;
  ELSE
    SELECT * INTO saved FROM public.realtor_financial_records r
     WHERE r.id=p_record_id AND r.user_id=p_actor_id AND r.workspace_id=p_workspace_id AND r.kind=p_kind FOR UPDATE;
    IF NOT FOUND OR saved.current_revision <> p_expected_revision THEN RAISE EXCEPTION 'Financial record changed' USING ERRCODE='40001'; END IF;
  END IF;
  INSERT INTO public.realtor_financial_revisions(record_id,user_id,workspace_id,revision,request_key,input_hash,effective_date,data,actor_id)
  VALUES(saved.id,p_actor_id,p_workspace_id,CASE WHEN p_record_id IS NULL THEN 1 ELSE saved.current_revision+1 END,
    p_request_key,encode(digest(jsonb_build_object('kind',p_kind,'date',p_effective_date,'data',p_data,'occurrence',p_occurrence_id)::text,'sha256'),'hex'),
    p_effective_date,p_data,p_actor_id);
  UPDATE public.realtor_financial_records SET current_revision=CASE WHEN p_record_id IS NULL THEN 1 ELSE current_revision+1 END,status='active'
   WHERE id=saved.id;
  IF p_occurrence_id IS NOT NULL THEN
    UPDATE public.realtor_planner_occurrences AS occurrence SET status='completed',completed_at=now(),revision=occurrence.revision+1,updated_at=now()
     WHERE occurrence.id=p_occurrence_id AND occurrence.user_id=p_actor_id AND occurrence.workspace_id=p_workspace_id AND occurrence.kind_snapshot='bill'
       AND occurrence.status='pending' AND occurrence.revision=p_expected_occurrence_revision;
    IF NOT FOUND THEN RAISE EXCEPTION 'Bill occurrence is not payable' USING ERRCODE='40001'; END IF;
    UPDATE public.realtor_reminders AS reminder SET status='superseded',revision=reminder.revision+1,updated_at=now()
     WHERE reminder.occurrence_id=p_occurrence_id AND reminder.status IN ('scheduled','visible');
  END IF;
  new_record:=saved.id;
  INSERT INTO public.realtor_mutation_receipts(actor_id,request_key,operation,input_hash,resource_id,resource_revision,response)
  VALUES(p_actor_id,p_request_key,'financial_record',payload_hash,new_record,CASE WHEN p_record_id IS NULL THEN 1 ELSE saved.current_revision+1 END,jsonb_build_object('recordId',new_record));
  INSERT INTO public.platform_audit_events(workspace_id,actor_id,actor_kind,action,resource_type,resource_id,safe_metadata)
  VALUES(p_workspace_id,p_actor_id,'user','realtor.financial.'||p_kind,'realtor_financial_record',new_record::TEXT,
    jsonb_build_object('revision',CASE WHEN p_record_id IS NULL THEN 1 ELSE saved.current_revision+1 END,'effectiveDate',p_effective_date));
  RETURN QUERY SELECT new_record,CASE WHEN p_record_id IS NULL THEN 1 ELSE saved.current_revision+1 END,FALSE;
END $$;

CREATE OR REPLACE FUNCTION public.realtor_read_business_summary(p_actor_id UUID,p_workspace_id UUID,p_year INTEGER)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public AS $$
DECLARE output JSONB; start_date DATE; end_date DATE;
BEGIN
  IF NOT public.realtor_personal_access(p_actor_id,p_workspace_id) OR p_year NOT BETWEEN 2000 AND 2200 THEN
    RAISE EXCEPTION 'Personal financial access denied' USING ERRCODE='42501';
  END IF;
  start_date := make_date(p_year,1,1); end_date := make_date(p_year+1,1,1);
  SELECT jsonb_build_object(
    'year',p_year,'currency','USD','asOf',CURRENT_DATE,
    'recordsStartDate',max(pref.records_start_date),
    'receivedCents',COALESCE(sum(CASE WHEN r.kind='commission' AND r.status='active' THEN
      CASE WHEN rev.data->>'mode'='gross' THEN (rev.data->>'grossCents')::NUMERIC-(rev.data->>'withheldCents')::NUMERIC
           ELSE (rev.data->>'depositCents')::NUMERIC END ELSE 0 END),0)::TEXT,
    'knownGrossCents',COALESCE(sum(CASE WHEN r.kind='commission' AND r.status='active' AND rev.data->>'mode'='gross' THEN (rev.data->>'grossCents')::NUMERIC ELSE 0 END),0)::TEXT,
    'knownWithheldCents',COALESCE(sum(CASE WHEN r.kind='commission' AND r.status='active' AND rev.data->>'mode'='gross' THEN (rev.data->>'withheldCents')::NUMERIC ELSE 0 END),0)::TEXT,
    'paidExpensesCents',COALESCE(sum(CASE WHEN r.kind='expense' AND r.status='active' THEN (rev.data->>'amountCents')::NUMERIC ELSE 0 END),0)::TEXT,
    'netOnlyReceiptCount',count(*) FILTER (WHERE r.kind='commission' AND r.status='active' AND rev.data->>'mode'='net_deposit'),
    'grossReceiptCount',count(*) FILTER (WHERE r.kind='commission' AND r.status='active' AND rev.data->>'mode'='gross'),
    'closingCount',(SELECT count(DISTINCT COALESCE(NULLIF(cr.data->>'closingReference',''),cr.record_id::TEXT))
      FROM public.realtor_financial_records c JOIN public.realtor_financial_revisions cr
        ON cr.record_id=c.id AND cr.revision=c.current_revision
      WHERE c.user_id=p_actor_id AND c.workspace_id=p_workspace_id AND c.kind='commission' AND c.status='active'
        AND cr.effective_date>=start_date AND cr.effective_date<end_date),
    'completedWeeklyReviews',(SELECT count(*) FROM public.realtor_planner_occurrences o
      WHERE o.user_id=p_actor_id AND o.workspace_id=p_workspace_id AND o.kind_snapshot='weekly_review'
        AND o.status='completed' AND o.effective_date>=start_date AND o.effective_date<end_date),
    'recordedNetCents',(COALESCE(sum(CASE WHEN r.kind='commission' AND r.status='active' THEN
      CASE WHEN rev.data->>'mode'='gross' THEN (rev.data->>'grossCents')::NUMERIC-(rev.data->>'withheldCents')::NUMERIC
           ELSE (rev.data->>'depositCents')::NUMERIC END ELSE 0 END),0)
      - COALESCE(sum(CASE WHEN r.kind='expense' AND r.status='active' THEN (rev.data->>'amountCents')::NUMERIC ELSE 0 END),0))::TEXT,
    'pendingIncomeCents',COALESCE(sum(CASE WHEN r.kind='expected_commission' AND r.status='active' THEN (rev.data->>'estimatedTakeHomeCents')::NUMERIC ELSE 0 END),0)::TEXT
  ) INTO output
  FROM public.realtor_preferences pref
  LEFT JOIN public.realtor_financial_records r ON r.user_id=p_actor_id AND r.workspace_id=p_workspace_id
  LEFT JOIN public.realtor_financial_revisions rev ON rev.record_id=r.id AND rev.revision=r.current_revision
    AND rev.effective_date>=start_date AND rev.effective_date<end_date
  WHERE pref.user_id=p_actor_id AND pref.workspace_id=p_workspace_id;
  RETURN output;
END $$;

CREATE OR REPLACE FUNCTION public.realtor_save_goal(
  p_actor_id UUID,p_workspace_id UUID,p_goal_id UUID,p_expected_revision INTEGER,p_request_key UUID,
  p_year SMALLINT,p_metric TEXT,p_target BIGINT,p_archive BOOLEAN DEFAULT FALSE
) RETURNS TABLE(goal_id UUID,revision INTEGER,reused BOOLEAN)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE saved public.realtor_goals%ROWTYPE; receipt public.realtor_mutation_receipts%ROWTYPE; request_hash TEXT;
BEGIN
  IF NOT public.realtor_personal_access(p_actor_id,p_workspace_id) THEN RAISE EXCEPTION 'Personal goal access denied' USING ERRCODE='42501'; END IF;
  IF p_year NOT BETWEEN 2000 AND 2200 OR p_metric NOT IN ('net_income','closings','weekly_reviews')
    OR p_target NOT BETWEEN 1 AND 1000000000000 OR (p_metric<>'net_income' AND p_target>100000)
    OR p_request_key IS NULL THEN RAISE EXCEPTION 'Invalid goal' USING ERRCODE='22023'; END IF;
  request_hash:=encode(digest(jsonb_build_object('id',p_goal_id,'revision',p_expected_revision,'year',p_year,'metric',p_metric,'target',p_target,'archive',p_archive)::text,'sha256'),'hex');
  SELECT * INTO receipt FROM public.realtor_mutation_receipts WHERE actor_id=p_actor_id AND request_key=p_request_key;
  IF FOUND THEN
    IF receipt.operation<>'goal' OR receipt.input_hash<>request_hash THEN RAISE EXCEPTION 'Request key conflict' USING ERRCODE='23505'; END IF;
    RETURN QUERY SELECT receipt.resource_id,receipt.resource_revision,TRUE; RETURN;
  END IF;
  IF p_goal_id IS NULL THEN
    IF p_archive OR p_expected_revision IS NOT NULL THEN RAISE EXCEPTION 'Invalid new goal revision' USING ERRCODE='22023'; END IF;
    INSERT INTO public.realtor_goals(user_id,workspace_id,year,metric,target)
    VALUES(p_actor_id,p_workspace_id,p_year,p_metric,p_target) RETURNING * INTO saved;
  ELSE
    SELECT * INTO saved FROM public.realtor_goals g WHERE g.id=p_goal_id AND g.user_id=p_actor_id AND g.workspace_id=p_workspace_id AND g.status='active' FOR UPDATE;
    IF NOT FOUND OR saved.revision<>p_expected_revision THEN RAISE EXCEPTION 'Goal changed' USING ERRCODE='40001'; END IF;
    UPDATE public.realtor_goals AS goal SET target=p_target,status=CASE WHEN p_archive THEN 'archived' ELSE 'active' END,
      revision=goal.revision+1,updated_at=now() WHERE goal.id=p_goal_id RETURNING goal.* INTO saved;
  END IF;
  INSERT INTO public.realtor_mutation_receipts(actor_id,request_key,operation,input_hash,resource_id,resource_revision,response)
  VALUES(p_actor_id,p_request_key,'goal',request_hash,saved.id,saved.revision,jsonb_build_object('goalId',saved.id));
  RETURN QUERY SELECT saved.id,saved.revision,FALSE;
END $$;

REVOKE ALL ON FUNCTION public.realtor_personal_access(UUID,UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.realtor_personal_access(UUID,UUID) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.realtor_setup_personal_workspace(UUID,UUID,UUID,INTEGER,TEXT,TEXT,BOOLEAN,BOOLEAN,BOOLEAN,BOOLEAN,DATE) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.realtor_setup_personal_workspace(UUID,UUID,UUID,INTEGER,TEXT,TEXT,BOOLEAN,BOOLEAN,BOOLEAN,BOOLEAN,DATE) TO service_role;
REVOKE ALL ON FUNCTION public.realtor_save_planner_item(UUID,UUID,UUID,INTEGER,UUID,JSONB,JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.realtor_save_planner_item(UUID,UUID,UUID,INTEGER,UUID,JSONB,JSONB) TO service_role;
REVOKE ALL ON FUNCTION public.realtor_apply_occurrence_action(UUID,UUID,UUID,INTEGER,UUID,TEXT,DATE,TIME,JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.realtor_apply_occurrence_action(UUID,UUID,UUID,INTEGER,UUID,TEXT,DATE,TIME,JSONB) TO service_role;
REVOKE ALL ON FUNCTION public.realtor_save_financial_record(UUID,UUID,UUID,INTEGER,UUID,TEXT,DATE,JSONB,UUID,INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.realtor_save_financial_record(UUID,UUID,UUID,INTEGER,UUID,TEXT,DATE,JSONB,UUID,INTEGER) TO service_role;
REVOKE ALL ON FUNCTION public.realtor_read_business_summary(UUID,UUID,INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.realtor_read_business_summary(UUID,UUID,INTEGER) TO service_role;
REVOKE ALL ON FUNCTION public.realtor_save_goal(UUID,UUID,UUID,INTEGER,UUID,SMALLINT,TEXT,BIGINT,BOOLEAN) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.realtor_save_goal(UUID,UUID,UUID,INTEGER,UUID,SMALLINT,TEXT,BIGINT,BOOLEAN) TO service_role;
