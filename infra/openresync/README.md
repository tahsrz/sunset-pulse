# Sunset OpenRESync Pilot

This pilot pins `tylercollier/openresync` at commit
`7fedd4e06558198645ec0659296edf301aafc432` (0.4.0). MySQL stores raw RESO
records; Supabase Postgres remains Sunset Pulse's canonical application store.

## Start safely

1. Copy `.env.example` to `.env` and supply the licensed provider endpoints and credentials.
2. Keep `OPENRESYNC_CRON_ENABLED=false` for the first run.
3. Start MySQL: `docker compose up -d mysql`.
4. Build and start OpenRESync: `docker compose up -d --build openresync`.
5. Verify both services and inspect raw table counts: `npm run openresync:doctor`.
6. Initialize destination tables and run one narrow sync:
   - `docker compose exec openresync bin/run-once sync-metadata -s sunsetPilot`
   - `docker compose exec openresync bin/run-once sync -s sunsetPilot`
7. Preview normalization: `npm run mls:openresync:normalize --workspace=apps/pulse -- --dry-run`.
8. Apply the canonical Supabase migration, then run normalization without `--dry-run`.

The admin UI is available at `http://localhost:4000`. Do not enable purge,
reconcile, or cron until the provider count, local count, display permissions,
and deletion behavior have been checked manually.

## Manual maintenance

- Incremental sync: `docker compose exec openresync bin/run-once sync -s sunsetPilot`
- Purge: `docker compose exec openresync bin/run-once purge -s sunsetPilot`
- Reconcile: `docker compose exec openresync bin/run-once reconcile -s sunsetPilot`

OpenRESync's runtime checkpoint and downloaded batches live in the
`openresync_runtime` volume. Raw RESO tables live in `openresync_mysql`.
