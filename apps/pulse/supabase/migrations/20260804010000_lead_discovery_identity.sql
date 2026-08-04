-- Prevent concurrent discovery runs from creating the same source lead twice.
CREATE UNIQUE INDEX IF NOT EXISTS leads_discovery_identity_unique
ON public.leads (
  (metadata #>> '{discovery,source}'),
  (metadata #>> '{discovery,externalId}')
)
WHERE metadata #>> '{discovery,source}' IS NOT NULL
  AND metadata #>> '{discovery,externalId}' IS NOT NULL;
