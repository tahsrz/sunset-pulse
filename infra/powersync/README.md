# Phase 5 PowerSync and Phase 6 hardening workflow

This folder contains the Sync Streams configuration for Sunset Pulse's feature-gated browser SQLite cache.

## Activation order

1. Apply the Supabase migrations through `20260630010000_powersync_local_first.sql`.
2. Provision a PowerSync instance connected to the Supabase Postgres database and publication named `powersync`.
3. Deploy `sync-config.yaml` as a Sync Streams (edition 3) configuration.
4. Set `NEXT_PUBLIC_POWERSYNC_URL` to the instance endpoint.
5. Set `NEXT_PUBLIC_POWERSYNC_ENABLED=true` and rebuild the Next.js app.

The app uses the existing Supabase access token for PowerSync authentication. Private tables are filtered with `auth.user_id()`. Public properties are subscribed by map viewport or individual property ID rather than downloading the entire MLS dataset.

## Local verification

Run from the repository root:

```powershell
npm run powersync:assets --workspace=apps/pulse
npm run test:unit --workspace=apps/pulse
npm run build --workspace=apps/pulse
```

The provider disconnects and clears SQLite on logout or account changes. The feature remains inert when either environment variable is absent.

## Phase 6 production gates

Do not enable the client flag until all gates pass:

- `npx supabase migration list --linked` shows the canonical and PowerSync migrations in both columns.
- `verify.sql` returns both migration versions, all four publication tables, and RLS enabled on all four tables.
- The PowerSync Sync Streams configuration deploys without validation errors.
- `/api/admin/mls/status` reports a non-stale completed run with an acceptable failure rate.
- An authenticated browser reaches `data-powersync-state="synced"` and reports zero queued writes after reconnecting.
- A bookmark created offline appears in `public.collections` after reconnection and is inaccessible to another user.

Transient canonical and client-upload writes use three bounded exponential-backoff attempts. Validation, constraint, and authorization failures are not retried. Concurrent operator MLS runs return HTTP 409 while a recent run is active.

Phase 6 P2 controls add a Postgres-backed 30-minute ingestion lease, a 600 KB request ceiling, a 500-listing hotsheet ceiling, strict provider parameter validation, one-at-a-time PowerSync uploads with bounded dead-letter diagnostics, and a 30-day/500-row recent-view retention policy.
