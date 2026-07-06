-- Query support for the public MLS discovery engine. These partial indexes
-- exclude private, demo, deleted, internal, and inactive rows up front.

CREATE INDEX IF NOT EXISTS idx_properties_discovery_fresh
  ON public.properties(last_updated DESC, id)
  WHERE deleted_at IS NULL
    AND is_demo = false
    AND display_public = true
    AND source = 'MLS'
    AND listing_status = 'Active';

CREATE INDEX IF NOT EXISTS idx_properties_discovery_price
  ON public.properties(price, last_updated DESC)
  WHERE deleted_at IS NULL
    AND is_demo = false
    AND display_public = true
    AND source = 'MLS'
    AND listing_status = 'Active';

CREATE INDEX IF NOT EXISTS idx_properties_discovery_location
  ON public.properties(city, type, last_updated DESC)
  WHERE deleted_at IS NULL
    AND is_demo = false
    AND display_public = true
    AND source = 'MLS'
    AND listing_status = 'Active';
