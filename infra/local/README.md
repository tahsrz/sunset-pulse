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
and enqueue permissions. This is **not full Supabase migration or RLS acceptance**;
`npm run test:db --workspace=apps/pulse` and the existing `scheduler-db` CI job
retain that responsibility.

The Mongo suite covers competing appends/reviews, approval vs upload, reviewer
revocation, rejected/stale artifacts and preservation of revoked artifacts. It
does not exercise signed storage URLs or real browser authentication.

The `docker-acceptance` CI job runs these same commands. A local pass does not
establish a passing remote workflow. An abruptly killed runner may leave its
uniquely named project behind; inspect Docker Desktop and remove only that test
project. No command here prunes shared images or volumes.

Compose health checks and loopback publishing follow the
[Docker service reference](https://docs.docker.com/reference/compose-file/services/).
Images are major-line tags (`mongo:7.0`, `postgres:17-alpine`); pin tested digests
when repeatable release images become a requirement.
