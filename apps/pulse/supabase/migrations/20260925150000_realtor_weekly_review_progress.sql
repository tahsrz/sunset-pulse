CREATE OR REPLACE FUNCTION public.realtor_validate_weekly_review_evidence()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE review JSONB; week_key TEXT; review_date DATE; zone TEXT; priority TEXT;
BEGIN
  IF NEW.status <> 'completed' THEN
    RETURN NEW;
  END IF;

  IF NEW.kind_snapshot <> 'weekly_review' THEN
    IF NEW.completion_details <> '{}'::jsonb THEN
      RAISE EXCEPTION 'Only weekly reviews accept completion details' USING ERRCODE='22023';
    END IF;
    RETURN NEW;
  END IF;

  IF jsonb_typeof(NEW.completion_details) <> 'object' THEN
    RAISE EXCEPTION 'Weekly review checklist evidence must be an object' USING ERRCODE='22023';
  END IF;
  IF (SELECT count(*) FROM jsonb_object_keys(NEW.completion_details)) <> 1
    OR NOT (NEW.completion_details ? 'weeklyReview') OR NEW.completed_at IS NULL THEN
    RAISE EXCEPTION 'Weekly review checklist evidence is required' USING ERRCODE='22023';
  END IF;

  review := NEW.completion_details->'weeklyReview';
  IF jsonb_typeof(review) <> 'object' THEN
    RAISE EXCEPTION 'Weekly review checklist must be an object' USING ERRCODE='22023';
  END IF;
  IF (SELECT count(*) FROM jsonb_object_keys(review)) <> 6
    OR NOT (review ?& ARRAY['version','reviewedUpcomingDates','reviewedMissingExpenses','priority','timeZone','localWeekKey'])
    OR review->>'version' <> '1'
    OR review->>'reviewedUpcomingDates' <> 'true'
    OR review->>'reviewedMissingExpenses' <> 'true' THEN
    RAISE EXCEPTION 'Weekly review checklist evidence is invalid' USING ERRCODE='22023';
  END IF;

  priority := btrim(review->>'priority');
  zone := review->>'timeZone';
  week_key := review->>'localWeekKey';
  IF priority IS NULL OR char_length(priority) NOT BETWEEN 1 AND 200
    OR zone IS NULL OR char_length(zone) > 80
    OR NOT EXISTS (SELECT 1 FROM pg_timezone_names WHERE name=zone)
    OR week_key IS NULL OR week_key !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN
    RAISE EXCEPTION 'Weekly review date, timezone, or priority is invalid' USING ERRCODE='22023';
  END IF;

  BEGIN
    review_date := week_key::DATE;
  EXCEPTION WHEN others THEN
    RAISE EXCEPTION 'Weekly review local week is invalid' USING ERRCODE='22023';
  END;

  IF to_char(review_date, 'YYYY-MM-DD') <> week_key
    OR extract(isodow FROM review_date) <> 1
    OR review_date <> date_trunc('week', NEW.completed_at AT TIME ZONE zone)::DATE THEN
    RAISE EXCEPTION 'Weekly review must use the completion week in its saved timezone' USING ERRCODE='22023';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS realtor_weekly_review_evidence_guard ON public.realtor_planner_occurrences;
CREATE TRIGGER realtor_weekly_review_evidence_guard
BEFORE INSERT OR UPDATE
ON public.realtor_planner_occurrences
FOR EACH ROW EXECUTE FUNCTION public.realtor_validate_weekly_review_evidence();

CREATE UNIQUE INDEX IF NOT EXISTS realtor_weekly_review_one_per_local_week_idx
ON public.realtor_planner_occurrences(
  user_id,
  workspace_id,
  ((completion_details->'weeklyReview'->>'localWeekKey'))
)
WHERE kind_snapshot='weekly_review'
  AND status='completed'
  AND completion_details ? 'weeklyReview';

REVOKE ALL ON FUNCTION public.realtor_validate_weekly_review_evidence() FROM PUBLIC, anon, authenticated;
