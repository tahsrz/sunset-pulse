DROP INDEX IF EXISTS public.lead_message_drafts_fingerprint_idx;
CREATE UNIQUE INDEX IF NOT EXISTS lead_message_drafts_fingerprint_idx
  ON public.lead_message_drafts (fingerprint);
