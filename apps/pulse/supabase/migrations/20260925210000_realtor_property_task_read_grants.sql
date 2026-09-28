-- Server-side personal planner reads use the service-role client. Keep writes
-- behind the existing scoped RPCs while granting only the required reads.
GRANT SELECT ON public.property_shortlist_entries, public.sprint_backlog_items TO service_role;
