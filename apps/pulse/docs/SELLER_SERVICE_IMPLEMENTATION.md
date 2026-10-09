# Connected seller service implementation

Started October 9, 2026 on `codex/seller-acquisition-2026q4`, baseline `89d67432`.

Implement all seven agreed opportunities using existing Supabase authentication,
owner-scoped seller requests, scheduling bookings, personal planner/reminders,
and the durable workflow worker. No additional scheduler or CRM.

## Delivery ledger

- [x] Seller case: private property/document references, evidence-backed milestones,
  preparation checklist, history, existing request and planner links.
- [x] Booking bridge: accepted bookings matched to the same lead, consultation
  receipt and planner handoff; cancellation/rescheduling updates linked work.
- [x] Communications: explicitly reviewed email queued in the durable worker,
  provider acceptance/delivery receipts, private conversation history, reply capture.
- [x] Measurement: consented visit/click events and cohort acquisition summary,
  alongside existing request, response, consultation, and closing counts.
- [x] Today: deterministic priority queue with an explanation and direct action.
- [x] Client progress: owner-published summary/checklist/documents, shared only
  with the verified signed-in account matching the seller's email; revocable.
- [x] Setup/health/navigation: guided website/workspace/reminder setup, delivery
  health, compact seller navigation and Today entry.
- [x] Verification: cross-owner/privacy/replay/database tests, focused UI/API
  tests, real-auth responsive acceptance, typecheck, lint, production build.

## Boundaries

Bookings are existing authoritative scheduling records, not evidence that a
meeting was held. Milestones require human-entered evidence. Public measurement
uses an explicit opt-in and contains no names, addresses, emails, or raw referrers.
Client access reveals only an owner-reviewed publication, never internal notes,
the conversation history, monetary records, or arbitrary case history.
Email is an explicit app action with a dedicated enablement gate; development
verification uses mocked provider calls. No live outreach, hosted migration,
provider provisioning, or production deployment is implied by implementation.

Provider reference: [Resend idempotency keys](https://resend.com/docs/dashboard/emails/idempotency-keys).
Provider retry protection is time-bounded; uncertain sends beyond that window
require review instead of another automatic send.

## Entry points and operating behavior

`/seller-business` opens `/today`. Today loads case/reply priorities in parallel
with its existing agenda, business, goals and seller reads. A failed priority read
preserves the loaded daily actions and offers a separate retry.
`/seller-cases` lists owner-scoped requests with pagination;
`/seller-cases/[leadId]` connects the private case, property shortlist, checklist,
reviewed HTTPS document links, existing contracts and planner, milestones,
bookings, messages and publication. `/business` includes the acquisition funnel.
`/seller-setup` guides setup and reports stored worker activity.
`/seller-portal` needs only the existing verified-email sign-in, not an agent
workspace; the server returns a whitelisted publication with no internal notes,
messages, email addresses or financial data.

Milestones are immutable evidence receipts with a separate correction action.
Retracting evidence updates the active milestone and cohort counts, clears the
publication and revokes client access. Dependent listing stages must be retracted
before the agreement they depend on. The active milestone read covers the entire
case history even though the message/event timeline displays its latest 100 rows.
Accepted bookings link only to the same lead, agent and site. Cancellation or a
time/lineage change invalidates the old consultation source; a new valid future
time produces a fresh source for explicit planner scheduling. The existing planner
stores whole-minute times. A booking with seconds stays recorded, and the UI
blocks rounding and asks the owner to review the authoritative booking.

Email approval resets when the draft changes. The server stores the exact sender,
recipient, reply-to, subject and body at queue time. Queueing creates an event job
on the shared worker and records no contact. Live leases fence preparation and
receipt persistence; the provider request uses the message UUID as its stable
idempotency key. Provider acceptance records actual contact when still permitted.
Signed delivery receipts are deduplicated and reconcile even when they arrive
before acceptance is committed. Bounces supersede delivery; older delivery cannot
erase a bounce. Unknown attempts remain blocked from automatic resend after
20 hours, inside Resend's documented 24-hour deduplication window. Failed jobs and
unknown receipts require operator/provider review. Incoming replies are captured
manually from the owner's verified reply-to mailbox; automatic mailbox sync is
not part of this first version.

Anonymous offer observation requires a per-visit checkbox. It uses an in-memory
visit UUID, a bounded normalized campaign label, the configured published tenant
and the existing distributed rate limiter. Disabling it detaches the listener;
already submitted anonymous observations remain stored. No contact form fields,
raw referrers or addresses enter this table. Old observations are removed
opportunistically on the next observation for that agent. Funnel outcomes follow
the same 30-local-day request cohort through today; opted-in visits and button
actions are separate observations, not a denominator for all seller requests.

## Release and configuration

The three October 9 migrations and matching app/worker are one candidate:

1. `20261009130000_seller_service_cases.sql`
2. `20261009131000_seller_service_email.sql`
3. `20261009132000_seller_service_measurement.sql`

Keep the existing worker/cron invocation and its authentication. Configure the
reviewed application target with `RESEND_API_KEY`, a verified
`RESEND_FROM_EMAIL`, and `SELLER_EMAIL_SEND_ENABLED=true` before enabling reviewed
email. Configure Resend's delivered/bounced webhook to
`/api/webhooks/seller-email` and store its signing secret as
`RESEND_SELLER_WEBHOOK_SECRET`. Until then the UI reports missing configuration
and does not offer sending. Existing intake still uses
`KELLER_WESTLAKE_AGENT_SITE` and the published tenant checks. No secret values
belong in source control or the client bundle.

Setup distinguishes runtime configuration from recorded activity; it does not
claim the hosted cron is healthy merely because configuration exists or a past
job completed. Apply target migration history, backups, deployment identity and
actual hosted cadence checks from `SELLER_BUSINESS_RELEASE_CHECKLIST.md` during
the separately authorized release. This implementation did not apply hosted SQL,
enable a provider or send seller email.

## Verification evidence

- Fresh disposable Supabase migration replay and authenticated browser flow:
  owner isolation, exact-payload replay, stale revisions, curated publication,
  verified-email access/revocation, booking → exact-time planner handoff,
  cancellation/rescheduling, synthetic provider acceptance and signed early
  delivery, expired-attempt suppression, contact revocation, conversation capture,
  cohort counts, milestone correction and site-transfer privacy. Passed in 160s.
- Phone/tablet/desktop case rendering at 390/768/1440px, private client progress,
  Today priorities, Business funnel and Setup health. Screenshots remain in the
  ignored local acceptance directory; test data and the isolated project were
  removed together.
- CI's PostgreSQL Docker harness includes `seller_service.sql` with 22 meaningful
  ownership/privacy/replay/booking/worker assertions; all pass. Existing scheduler,
  seller source, finance and reminder races still pass.
- Full unit sweep: 391 files / 1,636 tests; 1,621 passed on the first run.
  Fifteen failures across four existing filesystem suites were sandbox permission
  errors. All 39 tests in those files passed on targeted reruns using writable
  workspace temporary storage and, for atomic hard links, execution outside the
  sandbox. No unrelated production code was changed. The subsequently added
  consent/measurement file's three tests also pass (1,639 tests verified overall).
- Focused seller UI/API/worker suites, including anonymous opt-in, priority read
  recovery and exact booking-time precision, pass. Changed-source lint passes.
- Normal production build passes compilation, whole-app type validation,
  generation of all 271 pages, optimization and trace collection.
- Local compatibility preflight verifies all 27 reviewed source fingerprints
  and inventories 161 migrations; all nine preflight regression tests pass.
