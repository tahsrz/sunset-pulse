-- LUNA-201: authoritative commercial lineage for Supabase scheduling bookings.

ALTER TABLE public.scheduling_bookings
ADD COLUMN IF NOT EXISTS funnel_id UUID,
ADD COLUMN IF NOT EXISTS lead_id UUID REFERENCES public.agent_site_leads(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS agent_id TEXT,
ADD COLUMN IF NOT EXISTS site TEXT,
ADD COLUMN IF NOT EXISTS appointment_type TEXT CHECK (appointment_type IN (
  'buyer_consultation',
  'rental_consultation',
  'property_tour',
  'seller_consultation'
)),
ADD COLUMN IF NOT EXISTS listing_id TEXT;

CREATE INDEX IF NOT EXISTS scheduling_bookings_funnel_created_idx
ON public.scheduling_bookings (funnel_id, created_at DESC)
WHERE funnel_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS scheduling_bookings_lead_created_idx
ON public.scheduling_bookings (lead_id, created_at DESC)
WHERE lead_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS scheduling_attendees_booking_email_unique_idx
ON public.scheduling_attendees (booking_id, email);

ALTER TABLE public.scheduling_bookings
DROP CONSTRAINT IF EXISTS scheduling_bookings_commercial_lineage_check;

ALTER TABLE public.scheduling_bookings
ADD CONSTRAINT scheduling_bookings_commercial_lineage_check CHECK (
  (funnel_id IS NULL AND lead_id IS NULL AND agent_id IS NULL AND site IS NULL AND appointment_type IS NULL)
  OR
  (funnel_id IS NOT NULL AND lead_id IS NOT NULL AND agent_id IS NOT NULL AND site IS NOT NULL AND appointment_type IS NOT NULL)
);
