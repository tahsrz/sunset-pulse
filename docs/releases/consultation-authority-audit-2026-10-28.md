# Consultation Requests and Scheduling Authority

Prepared October 28, 2026. Branch: `codex/consultation-request-safety`. Base: PR #91 at `dbaedc8b`. This delivers the first scheduling repair and authority discovery, not automatic reservations.

## Findings and Fixes

The old `/schedule` form accepted any typed date/time, interpreted it in the browser's timezone while labeling the attendee America/Chicago, and posted to `/api/scheduling/public`. That anonymous endpoint accepted lead/funnel identifiers without the newer booking capability and inserted an accepted Supabase booking without an availability or overlap check. A saved row was presented as a confirmed consultation. Browser retries could submit another lead when the booking step failed.

The form now sends one consultation inquiry through the existing `/api/sites/leads` intake, with explicit email contact permission recorded in the request text. It uses the existing tenant resolution, lead storage and configured notification path. Its success message says that the request was saved and no time has been booked. A bounded saved-identity receipt is required before showing success. Invalid links do not render a submission form.

The in-memory request snapshot keeps the same body and idempotency key across uncertain responses. The user cannot edit that uncertain snapshot into a different retry. A known rejection permits edits and a new request key. Double submission is fenced, stalled saves time out after 20 seconds, and navigation/unmount aborts pending work. No capability or contact data is put in URLs, browser storage or analytics by this component.

The legacy anonymous booking endpoint now returns a private, uncached 503 with `CONSULTATION_BOOKING_NOT_CONFIGURED` and performs no database operation. This is an intentional compatibility change. Actual reservations must use the planned capability-scoped routes after the authority is verified. Jamie's existing action ID and destination remain compatible; the visible label now says Request a consultation.

The existing commercial helper also looked up idempotency keys globally, allowing another lineage's booking to be reused and its attendee list changed. Both the initial replay lookup and duplicate-insert recovery are now scoped to lead, funnel, agent and site. This repairs that replay boundary; it does not prove caller authorization, payload-equivalence, capacity, or atomic booking/attendee creation for every legacy caller.

## Source Inventory

| Store or path | Observed behavior | Implication for internal reservations |
| --- | --- | --- |
| `lib/scheduling/commercialBooking.ts` | Supabase `scheduling_bookings` is authoritative for commercial lineage; attendee is a later write | Reservation and attendee creation need a shared transaction; a persisted row is not proof of exclusive capacity |
| `app/api/scheduling/route.ts` | Commercial POST projects to Mongo TourRequest and Prisma Booking; GET can generate staff shifts; PATCH reassigns/swaps/updates shifts | Do not use its GET as a read-only calendar probe. Audit resource assignment and all writers before sharing capacity |
| `app/api/orders/route.ts` | Scheduled food pickups create Prisma bookings | Food operations and agent consultation resources must remain distinguishable |
| `scheduling/predict`, `bulk`, `staff`, `sms/incoming`, `approve`, and `scripts/seed-roster.ts` | Create, modify, approve, reassign or remove Prisma bookings | These writers do not automatically participate in a new Supabase reservation transaction |
| `app/api/bookings/route.ts` | Mongo property-stay bookings | Separate lodging domain, not seller consultation authority |
| `apps/pulse/prisma/schema.prisma` | Simplified legacy User/EventType/Booking model; no availability schedule or event-type owner relation | The full Cal.com source elsewhere in the monorepo does not establish that this runtime is a complete Cal.com booking engine |
| Supabase scheduling-core migration | Existing users, schedules, availability, event types, hosts, selected calendars and bookings | Reuse these resources. The inspected source migrations do not enforce an interval exclusion across all booking writers |
| Seller service booking bridge | Linking an accepted booking creates consultation history; booking changes drive cancellation/reconfirmation | Reuse this bridge and existing reminder fencing. Do not equate a booked consultation with one already held |

The inventory covers Pulse runtime writers and its roster script; it is not an audit of every upstream Cal.com module. Live database constraint coverage, external calendar connections and provider-wide concurrency were not certified.

## Read-Only Preflight

Run from the repository root:

```powershell
node apps/pulse/scripts/seller-consultation-preflight.mjs --env-file <local-env-file> --include-local-db
node --test apps/pulse/scripts/seller-consultation-preflight.test.mjs
```

The script reads only the selected site's public scheduling configuration, a matching scheduling owner and that owner's consultation event types. It never reads provider credentials, enumerates unrelated owners, calls the write-capable scheduler GET, seeds, reserves or sends messages. Local Prisma inspection is optional, loopback-only and runs in a read-only transaction. The output omits contacts and credentials. A calendar link or event-type record alone never marks an authority verified.

Observed against the existing local environment and its configured Supabase project: the local seller-site selector was absent, so the script explicitly used the repository's fallback agent. That active profile had no calendar URL; no scheduling owner matched its public agent email. Owner event types were therefore not enumerated. The local legacy Prisma query was unavailable. This is not a claim about Vercel's deployed environment variables or all external calendar accounts.

Docker's local Supabase containers are available when accessed with normal Docker permissions. No production or shared-database records were changed by this delivery.

## Verification

- 47 focused application tests passed across eight suites for the request flow, legacy route, existing lead consent/notifications, consultation contract and capability.
- A further six replay-lineage tests passed, alongside the existing eight commercial contract tests. Both normal and racing lookups are covered.
- Seven Node preflight tests passed for scoped reads, redaction, unavailable/ambiguous sources, selector validation and local-only inspection.
- Next route type generation, full application TypeScript and focused ESLint passed.
- The browser walkthrough now checks request receipt and zero calls to the old booking writer; it was updated but not run. No production build or deployed browser acceptance was performed. Pending hosted CI was not awaited.

## Internal Authority Decision

The user selected building on Sunset Pulse's scheduler. The next delivery will implement owner-configured availability and a transaction that claims real resource/time intervals, using the existing Supabase scheduling tables, booking lineage and reminder/cancellation bridge. Configuration must start disabled with no invented working hours. External Google/Outlook busy-time synchronization is a distinct connection and must not be claimed until implemented and verified.

Before enabling public slots, prove concurrent requests cannot claim one interval, retries return the same booking without changing its payload, attendee/lineage persistence is atomic, cancellation releases capacity and invalidates reminder intent, and timezone/DST boundaries are handled correctly. Audit legacy writes into the same resource so they cannot bypass the invariant. Do not add a second cron or notification system.
