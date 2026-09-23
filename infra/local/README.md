# Local Docker services and acceptance

Run commands from the repository root with Docker Desktop's Linux engine running.
Node/npm remain on the host; Supabase continues to manage its own stack. This
Compose file does not replace Supabase Auth/Storage, the scheduling application's
separate database, or the existing OpenResync stack.

## Development Mongo

```sh
npm run docker:up
npm run docker:status
npm run docker:down
```

`docker:up` starts Mongo 7 on **127.0.0.1:27018**, waits for its healthcheck, and
keeps data in the `sunset-pulse-local_mongo-data` named volume. For local Pulse
development, set `MONGODB_URI=mongodb://127.0.0.1:27018/sunset_pulse_local` in
`apps/pulse/.env.local`, then run `npm run pulse:dev`. `docker:down` preserves that
volume. No application environment file is changed by these commands. The local
Mongo service has no authentication and is bound to loopback only; use local
fixtures. It is not a deployment configuration.

## Disposable acceptance

```sh
npm run docker:test
# Or individually:
npm run docker:test:scheduler
npm run docker:test:scans
```

Each command creates a unique `pulse-acceptance-<uuid>` Compose project, waits
for database readiness, runs assertions, then removes that project's containers,
network and temporary data. Postgres has no published port. Test Mongo uses an
ephemeral loopback port and memory-backed data. Development volumes and running
Supabase jobs are never selected or mutated. No `.env` files are read by the
acceptance configuration; Mongo's URL is generated from the new test container.
Only the Mongo test mocks the unused external shortlist dependency; its Mongoose
model and conditional mutation functions use the real database.

The scheduler fixture uses the repository's scheduler migrations with minimal
auth/legacy-table prerequisites in Postgres 17. It observes an open row lock
before running the competing claim and an actual lock wait during duplicate
enqueue. It also checks omitted-time replay, cross-owner event identity,
payload/time conflicts, expired-token rejection before recovery, result receipts
and enqueue permissions. Platform fixtures also cover JSON run admission/replay,
concurrent checkpoint responses, type-specific gate permissions, cancellation,
membership revocation and authenticated-role run/checkpoint read policies. They
check atomic rollback when resume admission is disabled or a worker lease expires
while waiting for the run lock. These use fixture JWT claims, not a real Auth
session. This is **not full Supabase migration or RLS acceptance**;
`npm run test:db --workspace=apps/pulse` and the existing `scheduler-db` CI job
retain that responsibility.

The Mongo suite covers competing appends/reviews, approval vs upload, reviewer
revocation, rejected/stale artifacts and preservation of revoked artifacts. It
does not exercise signed storage URLs or real browser authentication.

## Real local Supabase authentication acceptance

From `apps/pulse`, with the existing local Supabase stack running:

```sh
npm run test:platform:auth -- --stack <local-stack-id> --apply-local-migrations
```

Use the suffix of the local `supabase_db_<local-stack-id>` container name. The
runner is fixed to loopback ports 54321/3176, creates temporary real Auth users,
logs in through the browser form with mock auth disabled, and exercises workspace
start/checkpoint-answer/cancel/pagination plus foreign-user API and JWT/RLS denial.
It leases only its own fixture jobs; worker contention is tested separately by the
disposable scheduler suite. It removes its accounts/workspace and restores the
prior `platform_run` admission flag. It never loads an environment file or logs
credentials. The temporary Next process receives explicit local auth settings.

The migration flag applies reviewed missing platform migrations to the **local**
stack and retains them; it does not reset the database. Omit the flag to require
an already-migrated stack. Do not run alongside another build/dev server using
`apps/pulse/.next`. Browser screenshots go to the ignored
`apps/pulse/.pulse-local/platform-auth-acceptance` directory. This is real local
Supabase Auth/API evidence, not production acceptance or an inbox UI test.

The `docker-acceptance` CI job runs `npm run docker:test` (disposable scheduler
and Mongo suites), **not** the real-session Auth harness above. The `scheduler-db`
job separately runs Supabase database tests. A local pass does not establish a
passing remote workflow. An abruptly killed runner may leave its
uniquely named project behind; inspect Docker Desktop and remove only that test
project. No command here prunes shared images or volumes.

## Connector evidence retention and restore boundary

Connector health evidence currently has no automatic purge. The current health row is operational state; health history is diagnostic provenance; operation receipts preserve scheduler replay identity; audit rows preserve actor and result attribution. Keep all four available until the workspace owner selects a retention period for each class. Any later cleanup must retain a compact operation tombstone for every pruned receipt identity and must write its own audit record. Never replay scheduler jobs or external effects from a restored database automatically.

`npm run docker:test:scheduler` includes a disposable Postgres restore rehearsal. It copies one workspace's connector history, receipts, and audit rows into temporary fixture tables, removes the originals, restores them with their original IDs, and checks row counts, operation uniqueness, and foreign-workspace isolation. This validates the evidence chain in the isolated fixture database; it is not a production backup, point-in-time recovery, or retention-policy drill.

Compose health checks and loopback publishing follow the
[Docker service reference](https://docs.docker.com/reference/compose-file/services/).
Images are major-line tags (`mongo:7.0`, `postgres:17-alpine`); pin tested digests
when repeatable release images become a requirement.
