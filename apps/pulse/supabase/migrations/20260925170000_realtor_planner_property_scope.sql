CREATE OR REPLACE FUNCTION public.realtor_validate_planner_property_scope()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.property_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM public.property_shortlist_entries p
    WHERE p.id = NEW.property_id
      AND p.owner_id = NEW.user_id
      AND p.area_key = 'keller-westlake'
  ) THEN
    RAISE EXCEPTION 'Planner property must belong to this realtor'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS realtor_planner_property_scope ON public.realtor_planner_items;
CREATE TRIGGER realtor_planner_property_scope
  BEFORE INSERT OR UPDATE OF property_id, user_id
  ON public.realtor_planner_items
  FOR EACH ROW
  EXECUTE FUNCTION public.realtor_validate_planner_property_scope();
