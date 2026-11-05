# Guided Seller Save Integration

This draft uses the seller feature stack at `042057e1` from PR #101. It carries the guided preview changes from PR #104 and connects a gated guided form to the existing receipt, case and consultation code. The short form continues to use version 2.

## Try the Guided Form

1. Use the [design preview](guided-home-journey-prototype-2026-11-04.md) for a walkthrough without saving anything.
2. Run the isolated browser and database walkthrough with `node apps/pulse/scripts/platform-disposable-auth-acceptance.mjs --suite seller-consultations --guided-seller`. The runner enables the v3 flag only for the generated local environment and uses fictional accounts and data.
3. With the flag enabled, **Start Guided Seller Plan** on `/seller-plan` opens `/seller-plan/start`. Enter a street address and confirm it. The guided form uses manual facts. Select **I’m Not Sure About These Details** to continue without them. The **Browse Homes** link opens Explorer.
4. Review the answers and choose whether the agent may reply. Optional marketing remains separate. After **Send Request** returns an accepted receipt, **Check Available Times** appears if the scheduler returned a valid offer. A time is booked only after the separate booking confirmation.

## Save and Retry

- `POST /api/lead-magnets` defaults to the existing version 2 schema. `SELLER_GUIDED_INTAKE_ENABLED=true` admits both versions for isolated testing. Leave the flag unset on shared preview and production until the public form and privacy copy have been verified.
- The existing writer saves v3 answers at `metadata.sellerPlan.journey` with the same server-resolved site, agent, contact grants and idempotency key. It uses the original v2 fingerprint order. For v3 it also hashes the normalized journey, so equivalent retries replay and a changed answer with the same ID conflicts.
- The route returns the existing accepted receipt. A newly saved request can receive an offer from the existing scheduler. A replay does not issue another offer, and a request can succeed when booking is unavailable.

## Owner Case

- Open **Seller Cases** and select a saved v3 request to see **Seller Request Details**. The case API verifies the signed-in owner, reads the lead through the existing owner-scoped RPC and returns the address, home facts, selling timeline and first priority. Unknown facts display **Not Provided**. A valid zero stays visible.
- The owner case response omits mortgage and preapproval amounts. The inbox and operator action responses omit the entire guided journey. Jamie still uses the existing case reader, and the client publication and milestone paths do not receive intake details.
- The existing generic lead-action RPC freezes metadata in an internal receipt table. The app removes the private journey from returned receipts, but the frozen copy remains in storage. The current CMA retention cron only deletes expired rows in `seller_cma_private_details`. Before enabling v3 on shared environments, minimize the action receipt at the write boundary and extend the existing retention schedule to expire guided answers and remove any retained copies while keeping replay and consent records.

## Local Verification

Run the focused unit tests with the seller stack's locked dependencies. For the database authority check, use the existing disposable runner from the checkout root:

```powershell
node apps/pulse/scripts/platform-disposable-auth-acceptance.mjs --suite seller-service --database-only
```

It applies the existing migrations to a generated local Supabase project and cleans up that project. The seller lead packet verifies lookup by lead ID for the owning account, rejection for a second active owner and service-only RPC execution. The route tests cover fixture saves, retries, changed answers, invalid input, storage failure and accepted receipts without booking. The case tests cover the narrow projection, consent and an unauthorized request with a forged query actor.

The 93 focused tests passed with the lockfile's Zod 4.6.7, as did scoped TypeScript and ESLint. The disposable runner passed nine SQL test packets, including 24 seller-lead assertions, and removed its generated database. The API write tests used a mocked persistence adapter. The database checks used transactional fixtures in the disposable stack.

The guided acceptance checks the flagged entry, pricing intent and campaign, the persisted v3 metadata, stable replay, owner-only case details and the existing consultation picker. The separate v2 submission in the same suite exercises the short form. The gated form uses a manual address until the saved-record lookup is ready for public use.

The guided form passed 48 focused tests plus the disposable browser walkthrough. The browser verified the mobile receipt, one saved v3 row across replay, denial for a second owner, and a separate booking with one planner item and reminder. The form opens in its focused layout and keeps its controls disabled until React can handle input on a fresh page load.

## Before Enabling Guided Intake

1. Add a migration that removes `{lead,metadata,sellerPlan,journey}` from new `agent_site_lead_action_receipts.response` snapshots and scrubs any existing copies. Leave the response ID, action hash and consent fields available for replay.
2. Add a service-only, bounded cleanup function for expired `agent_site_leads.metadata.sellerPlan.journey` data. Call it from the existing authenticated CMA retention job. Keep the lead, requested-contact and marketing grants, fingerprint and booking links intact. Record only counts and error codes in the cron response and logs.
3. Test an active and expired lead, an action replay after cleanup, a v3 submission replay after cleanup and a denied anonymous cleanup request. Run these checks in a disposable stack before changing the shared flag.
