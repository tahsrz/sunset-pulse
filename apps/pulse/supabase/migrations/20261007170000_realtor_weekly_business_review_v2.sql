-- Preserve v1 weekly evidence while requiring seller outcome review in v2.
CREATE OR REPLACE FUNCTION public.realtor_validate_weekly_review_evidence()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path=public AS $$
DECLARE review JSONB; week_key TEXT; review_date DATE; zone TEXT; priority TEXT;
  version_text TEXT; next_action TEXT; friction_text TEXT;
BEGIN
  IF NEW.status <> 'completed' THEN RETURN NEW; END IF;
  IF NEW.kind_snapshot <> 'weekly_review' THEN
    IF NEW.completion_details <> '{}'::jsonb THEN
      RAISE EXCEPTION 'Only weekly reviews accept completion details' USING ERRCODE='22023';
    END IF;
    RETURN NEW;
  END IF;
  IF jsonb_typeof(NEW.completion_details) <> 'object'
    OR (SELECT count(*) FROM jsonb_object_keys(NEW.completion_details)) <> 1
    OR NOT (NEW.completion_details ? 'weeklyReview') OR NEW.completed_at IS NULL THEN
    RAISE EXCEPTION 'Weekly review checklist evidence is required' USING ERRCODE='22023';
  END IF;
  review := NEW.completion_details->'weeklyReview';
  IF jsonb_typeof(review) <> 'object' THEN
    RAISE EXCEPTION 'Weekly review checklist must be an object' USING ERRCODE='22023';
  END IF;
  version_text := review->>'version';
  IF (version_text='1' AND ((SELECT count(*) FROM jsonb_object_keys(review)) <> 6
      OR NOT (review ?& ARRAY['version','reviewedUpcomingDates','reviewedMissingExpenses','priority','timeZone','localWeekKey'])))
    OR (version_text='2' AND ((SELECT count(*) FROM jsonb_object_keys(review)) <> 9
      OR NOT (review ?& ARRAY['version','reviewedUpcomingDates','reviewedMissingExpenses','reviewedSellerOutcomes','priority','chosenNextAction','friction','timeZone','localWeekKey'])))
    OR version_text NOT IN ('1','2')
    OR review->>'reviewedUpcomingDates' <> 'true'
    OR review->>'reviewedMissingExpenses' <> 'true'
    OR (version_text='2' AND review->>'reviewedSellerOutcomes' <> 'true') THEN
    RAISE EXCEPTION 'Weekly review checklist evidence is invalid' USING ERRCODE='22023';
  END IF;
  priority := btrim(review->>'priority'); zone := review->>'timeZone'; week_key := review->>'localWeekKey';
  next_action := btrim(review->>'chosenNextAction');
  friction_text := review->>'friction';
  IF priority IS NULL OR char_length(priority) NOT BETWEEN 1 AND 200
    OR (version_text='2' AND (next_action IS NULL OR char_length(next_action) NOT BETWEEN 1 AND 200
      OR jsonb_typeof(review->'friction') NOT IN ('null','string')
      OR (friction_text IS NOT NULL AND char_length(btrim(friction_text)) > 500)))
    OR zone IS NULL OR char_length(zone)>80 OR NOT EXISTS (SELECT 1 FROM pg_timezone_names WHERE name=zone)
    OR week_key IS NULL OR week_key !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN
    RAISE EXCEPTION 'Weekly review date, timezone, or checklist text is invalid' USING ERRCODE='22023';
  END IF;
  BEGIN review_date := week_key::DATE;
  EXCEPTION WHEN others THEN RAISE EXCEPTION 'Weekly review local week is invalid' USING ERRCODE='22023'; END;
  IF to_char(review_date,'YYYY-MM-DD')<>week_key OR extract(isodow FROM review_date)<>1
    OR review_date<>date_trunc('week',NEW.completed_at AT TIME ZONE zone)::DATE THEN
    RAISE EXCEPTION 'Weekly review must use the completion week in its saved timezone' USING ERRCODE='22023';
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.realtor_validate_weekly_review_evidence() FROM PUBLIC,anon,authenticated;
