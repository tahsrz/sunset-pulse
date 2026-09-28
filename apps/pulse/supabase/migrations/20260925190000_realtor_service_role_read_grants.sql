-- Server routes use the service-role client for owner-scoped reads, then apply
-- the signed-in actor/workspace filters in the application layer. BYPASSRLS
-- does not replace PostgreSQL object privileges, so grant only read access to
-- the realtor read models; writes continue through the guarded SECURITY DEFINER
-- mutation RPCs.
GRANT SELECT ON TABLE
  public.realtor_preferences,
  public.realtor_planner_items,
  public.realtor_planner_occurrences,
  public.realtor_reminders,
  public.realtor_financial_records,
  public.realtor_financial_revisions,
  public.realtor_financial_current,
  public.realtor_goals
TO service_role;
