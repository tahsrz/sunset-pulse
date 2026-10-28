# Internal Seller Consultation Calendar

Branch: `codex/internal-seller-consultations`. Base: PR #92 (`codex/consultation-request-safety`). This implements the internal calendar selected by the user. No production migration, environment change or calendar activation was performed.

## Behavior

- Sign in at `/consultations` using the account that owns the active agent site. The personal planner must already be set up. The Seller workspace navigation includes Consultations.
- A new calendar starts disabled with no weekly hours. Set its IANA time zone, duration, minimum notice and booking horizon. Add weekly windows and acknowledge that these hours will be kept free before enabling booking.
- Sunset Pulse checks its Supabase scheduling resources. Google, Outlook, the separate legacy Prisma food/staff calendar and other external calendars are not synchronized. Keep offered hours free; disable new bookings during absences. This release does not implement date exceptions, external busy-time sync or public self-service rescheduling.
- A newly saved `/seller-plan` request can receive an optional 15-minute booking capability. The visitor chooses a real available time, which is revalidated in the reservation transaction. Intake replay does not mint another capability. Missing configuration or booking failure never discards the saved inquiry.
- A confirmed booking has one attendee derived from the saved inquiry, a seller case history link, a planner appointment and a same-day reminder intent. The existing reminder worker and preferences govern delivery. There is no new cron or notification system, and this flow does not promise an external calendar invite or confirmation email.
- Owner cancellation keeps history, releases the interval and supersedes the existing planner reminder. Disabling booking only stops new reservations; it preserves existing bookings and exact retry receipts.

## Reservation and Access Rules

`20261028120000_internal_seller_consultations.sql` adds private calendar settings and interval claims. Existing scheduling users, schedules, weekly availability, event types, bookings and attendees remain the underlying resources. The claim table has a PostgreSQL exclusion constraint across each configured resource. Triggers cover direct Supabase booking writes as well as the new reservation RPC. Configuration backfills existing bookings for the resource and fails atomically if they overlap. It cannot silently adopt another owner's private calendar.

Service-only RPCs revalidate active site ownership, current saved lead/funnel/site identity and contact permission. The browser cannot supply an owner or arbitrary lead identity. Public routes require same-origin JSON, a valid signed capability, bounded bodies and the existing distributed rate limiter. Settings use ownership checks, expected revisions and mutation receipts. Bookings use lead-scoped idempotency keys and immutable identity/time fields. Adjacent intervals are allowed; overlaps are rejected.

The booking transaction includes the attendee, case bridge, planner item and reminder intent. Unexpected transport errors return an uncertain outcome. The picker keeps the exact slot and request UUID in memory for retry and blocks selection of a different time. A cancelled retry cannot resurrect a booking. Tokens, contact details and reservation attempts are not written to URLs, browser storage or analytics by this flow.

Slots are generated in the configured local time zone, returned as absolute instants and displayed in the visitor's explicit browser time zone. Nonexistent spring-forward wall times and intervals crossing a clock change are omitted. Repeated fall-back wall times use PostgreSQL's canonical later instant, rather than offering duplicate wall times.

## Setup and Acceptance Before Activation

1. Review the stacked PRs and this migration. Verify the intended deployment's Supabase project mapping before applying anything. Use a dedicated disposable or non-production project for integrated acceptance.
2. Apply the prerequisite migrations and `20261028120000_internal_seller_consultations.sql` through the existing migration release process. Review the migration list; do not blindly push unrelated pending migrations to production. If configuration reports overlapping legacy bookings or an existing scheduling email/resource conflict, inspect and resolve those records rather than bypassing the constraint or changing ownership.
3. Set a separately generated random server-only `SELLER_BOOKING_CAPABILITY_SECRET` with at least 32 bytes in each intended environment. Store it as a secret, never a `NEXT_PUBLIC_*` value or a committed file. Its example value is blank. Ensure the existing Supabase server configuration, distributed limiter and `KELLER_WESTLAKE_AGENT_SITE` select the intended active/published agent site. A secret change invalidates outstanding 15-minute offers; it does not delete bookings.
4. Deploy the reviewed code to the intended non-production environment. Sign in as the actual site owner, finish personal planner setup if necessary, open `/consultations`, set real hours and acknowledge the internal calendar before enabling it. No hours are seeded by the migration.
5. Submit one synthetic consented seller request on `/seller-plan`. Verify the saved lead, pick a slot, check its booking/attendee/case link and planner appointment, and retry the exact operation after a simulated lost response. Confirm the existing reminder worker respects preferences. Avoid real customer email/SMS destinations during this exercise.
6. With a second synthetic saved lead, attempt the same interval. Expect one winner. Cancel from `/consultations`; verify the time is available again and the original reminder is superseded. Verify another signed-in account cannot read or change the owner calendar. Repeat the expired-token and withdrawn-contact checks through the deployed routes.
7. Confirm desktop and phone rendering on that environment, then activate the intended production calendar only after reviewing the environment mapping and the owner-chosen hours. Local evidence below does not establish production readiness.

Rollback: disable new bookings on each owner calendar first. Removing the signing secret stops public booking access but leaves existing bookings and reminders intact. Do not drop the settings/claim tables or interval triggers while managed bookings remain. Existing reservations require an explicit data-aware recovery plan; a blanket code/schema revert is not a cancellation process.

## Local Verification

Executed from this worktree:

- `node apps/pulse/scripts/scheduler-concurrency-acceptance.mjs --internal-consultations-only`: passed against a uniquely named disposable PostgreSQL 17 Docker container, removed after the run. Uses real scheduling, funnel, seller case, planner and reminder migrations; only unrelated bootstrap/notification relations are minimal harness fixtures. It covers owner-only setup, disabled defaults, explicit calendar acknowledgement, revisions, settings replay, browser grants, actual concurrent reservations with an observed lock barrier, exact reservation retry, lead-scoped keys, immutable resource/cancelled bookings, transactional rollback on attendee failure, direct-writer overlap rejection, cancellation/reminder cleanup, withdrawn consent, disabled calendars, ownership transfer and spring/fall DST.
- 35 application tests passed across seven suites for public HTTP/capability boundaries, authority failures, picker uncertainty/conflict/expiry/unmount behavior, owner settings and retries, intake replay, the existing request form and HMAC capability validation.
- The local mocked browser walkthrough passed at 320, 390 and 1440 pixels: owner weekly-hours setup and save, seller intake through confirmation, no horizontal overflow, no uncaught browser exceptions, no capability in URL/storage. Screenshots are in `apps/pulse/test-results/internal-consultations/{owner,public}-{320,390,1440}.png`. The local server used dummy database credentials; its branding lookup timed out and used default branding. Browser APIs were mocked, so this does not prove a live authenticated browser-to-database journey.
- Next route type generation, full application TypeScript, focused ESLint and `git diff --check` passed on the final implementation.

Reproduce browser checks from `apps/pulse` against a loopback dev server:

```powershell
node scripts/internal-consultation-browser-acceptance.mjs http://127.0.0.1:3007
```

The script rejects non-loopback targets. Its APIs are explicitly mocked and no real bookings/messages are sent. Use the installed Playwright browser path if the shell redirects its default browser cache.

Not performed: production build, production migration/activation, a deployed authenticated end-to-end reservation, external calendar synchronization, or hosted CI waiting. The Docker acceptance case is added to the existing CI Docker job for future runs.
