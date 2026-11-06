# Guided Seller Save Integration

This draft uses the seller feature stack at `042057e1` from PR #101. It carries the guided preview changes from PR #104 and connects a gated guided form to the existing receipt, case and consultation code. The short form continues to use version 2.

## Try the Guided Form

1. Use the [design preview](guided-home-journey-prototype-2026-11-04.md) for a walkthrough without saving anything.
2. Run the isolated browser and database walkthrough with `node apps/pulse/scripts/platform-disposable-auth-acceptance.mjs --suite seller-consultations --guided-seller`. The runner enables the v3 flag only for the generated local environment and uses fictional accounts and data.
3. With the flag enabled, **Start Guided Seller Plan** on `/seller-plan` opens `/seller-plan/start`. Enter a street address and confirm it. The guided form uses manual facts. Select **I’m Not Sure About These Details** to continue without them. The **Browse Homes** link opens Explorer.
4. Review the answers and choose whether the agent may reply. Optional marketing remains separate. After **Send Request** returns an accepted receipt, **Check Available Times** appears if the scheduler returned a valid offer. A time is booked only after the separate booking confirmation.

## Save and Retry

- `POST /api/lead-magnets` defaults to the existing version 2 schema. `SELLER_GUIDED_INTAKE_ENABLED=true` admits both versions for isolated testing. Keep the shared flag unset until the retention migration and scheduled cleanup are verified in the target environment.
- The existing writer saves v3 answers at `metadata.sellerPlan.journey` with the same server-resolved site, agent, contact grants and idempotency key. It uses the original v2 fingerprint order. For v3 it also hashes the normalized journey, so equivalent retries replay and a changed answer with the same ID conflicts.
- The route returns the existing accepted receipt. A newly saved request can receive an offer from the existing scheduler. A replay does not issue another offer, and a request can succeed when booking is unavailable.

## Owner Case

- Open **Seller Cases** and select a saved v3 request to see **Seller Request Details**. The case API verifies the signed-in owner, reads the lead through the existing owner-scoped RPC and returns the address, home facts, selling timeline and first priority. Unknown facts display **Not Provided**. A valid zero stays visible.
- The owner case response omits mortgage and preapproval amounts. The inbox and operator action responses omit the entire guided journey. Jamie still uses the existing case reader, and the client publication and milestone paths do not receive intake details.

## Retention

- Migration `20261105170000_guided_seller_intake_retention.sql` removes guided answers from existing internal action receipts. A trigger strips the same field from new or updated receipts while preserving their replay identity.
- The daily `/api/admin/agent-leads/cma-retention/cron` uses its existing `CRON_SECRET`. Each run removes detailed guided answers from up to 500 version 3 leads that are at least 90 days old. Eligible rows beyond the batch limit are picked up by subsequent runs. The lead, contact grants, request fingerprint and booking records remain available.
- Success reports `deletedCount` for expired CMA rows, `prunedJourneyCount` for guided seller answers and `prunedBuyerRequestCount` for guided buyer requests. Each operation can report a 503 independently and is safe to run again. Logs report error codes without including stored answers.
- Apply the migration before deploying the updated cron handler so its service-only cleanup function is available. Confirm a successful scheduled run before enabling guided intake in the target environment.

## Local Verification

Run the focused unit tests with the seller stack's locked dependencies. For the database authority check, use the existing disposable runner from the checkout root:

```powershell
node apps/pulse/scripts/platform-disposable-auth-acceptance.mjs --suite seller-service --database-only
```

It applies the existing migrations to a generated local Supabase project and cleans up that project. The seller lead packet verifies lookup by lead ID for the owning account, rejection for a second active owner and service-only RPC execution. The route tests cover fixture saves, retries, changed answers, invalid input, storage failure and accepted receipts without booking. The case tests cover the narrow projection, consent and an unauthorized request with a forged query actor.

The 93 focused tests passed with the lockfile's Zod 4.6.7, as did scoped TypeScript and ESLint. The disposable runner passed nine SQL test packets, including 24 seller-lead assertions, and removed its generated database. The API write tests used a mocked persistence adapter. The database checks used transactional fixtures in the disposable stack.

The guided acceptance checks the flagged entry, pricing intent and campaign, the persisted v3 metadata, stable replay, owner-only case details and the existing consultation picker. The separate v2 submission in the same suite exercises the short form. The gated form uses a manual address until the saved-record lookup is ready for public use.

The guided form passed 48 focused tests plus the disposable browser walkthrough. The browser verified the mobile receipt, one saved v3 row across replay, denial for a second owner, and a separate booking with one planner item and reminder. The form opens in its focused layout and keeps its controls disabled until React can handle input on a fresh page load.

The retention changes passed 39 focused tests and ten SQL test packets in a disposable Supabase project. The 14 retention assertions cover the 90-day boundary, active and legacy rows, service-only execution, receipt redaction and replay, and the 500-row batch limit. In the guided consultation walkthrough, an unauthenticated cron call was denied, the authenticated run pruned one aged fixture, and the next run pruned zero. The original v3 request replayed after cleanup and its consultation stayed confirmed.

The November 6 disposable rerun passed on Next.js 15.5.28 with the combined buyer and seller cron handler. It verified one booking, planner item and reminder after a lost response and retry, followed by owner cancellation and released capacity. The runner removed its generated accounts, database and containers. See the [shared release order](guided-buyer-requests-2026-11-05.md#shared-release-order) for the remaining hosted checks.
