# Guided Seller Save Integration

This draft uses the seller feature stack at `042057e1` from PR #101. It carries the guided preview changes from PR #104 so the form and save contract can be reviewed together with the newer receipt, case and consultation code. The current seller form continues to use version 2.

## Save and Retry

- `POST /api/lead-magnets` defaults to the existing version 2 schema. `SELLER_GUIDED_INTAKE_ENABLED=true` admits both versions for isolated testing. Leave the flag unset on shared preview and production until the public form and privacy copy have been verified.
- The existing writer saves v3 answers at `metadata.sellerPlan.journey` with the same server-resolved site, agent, contact grants and idempotency key. It uses the original v2 fingerprint order. For v3 it also hashes the normalized journey, so equivalent retries replay and a changed answer with the same ID conflicts.
- The route returns the existing accepted receipt. A newly saved request can receive an offer from the existing scheduler. A replay does not issue another offer, and a request can succeed when booking is unavailable.

## Owner Case

- Open **Seller Cases** and select a saved v3 request to see **Seller Request Details**. The case API verifies the signed-in owner, reads the lead through the existing owner-scoped RPC and returns the address, home facts, selling timeline and first priority. Unknown facts display **Not Provided**. A valid zero stays visible.
- The owner case response omits mortgage and preapproval amounts. The inbox and operator action responses omit the entire guided journey. Jamie still uses the existing case reader, and the client publication and milestone paths do not receive intake details.
- The existing generic lead-action RPC freezes metadata in its service-only receipt table. The app removes the private journey from returned receipts. Review retention for those internal snapshots before enabling v3 in production.

## Local Verification

Run the focused unit tests with the seller stack's locked dependencies. For the database authority check, use the existing disposable runner from the checkout root:

```powershell
node apps/pulse/scripts/platform-disposable-auth-acceptance.mjs --suite seller-service --database-only
```

It applies the existing migrations to a generated local Supabase project and cleans up that project. The seller lead packet verifies lookup by lead ID for the owning account, rejection for a second active owner and service-only RPC execution. The route tests cover fixture saves, retries, changed answers, invalid input, storage failure and accepted receipts without booking. The case tests cover the narrow projection, consent and an unauthorized request with a forged query actor.

The 93 focused tests passed with the lockfile's Zod 4.6.7, as did scoped TypeScript and ESLint. The disposable runner passed nine SQL test packets, including 24 seller-lead assertions, and removed its generated database. The API write tests used a mocked persistence adapter. The database checks used transactional fixtures in the disposable stack.

The next walkthrough should submit a fictional guided request through the form in a disposable environment, then open it as the owner and try the same case as another account. Use the existing consultation picker and verify booking separately from the saved receipt.
