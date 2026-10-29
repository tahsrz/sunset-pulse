-- BYPASSRLS does not confer table privileges. Calendar reads use the server
-- client after checking the signed-in owner's personal workspace and site.
-- Reservation/configuration writes remain in their service-only definer RPCs.
GRANT SELECT ON public.scheduling_bookings, public.scheduling_availability TO service_role;
