-- Workspace access helpers read these records through the server-only service role.
-- Browser roles keep no direct table privileges; workspace APIs remain actor-scoped.
GRANT SELECT ON public.platform_workspaces, public.platform_memberships TO service_role;
