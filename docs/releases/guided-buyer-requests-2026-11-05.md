# Guided Buyer Requests

The Find a Home form reuses the guided seller layout. Requests use the existing Supabase project and personal realtor workspace. The private buyer table limits reads to the assigned owner of an active site.

## Open The Form And Inbox

1. In the disposable environment, open **Explorer** and select **Get Help Finding a Home**. The form is also available at `/buyer-plan/start` when intake is enabled.
2. Answer the five questions and review or edit any answer. Add a name and email, then give permission for a reply. The separate real estate updates checkbox is optional.
3. Select **Send Request**. The confirmation appears when the server accepts the request. **Open Explorer** returns to the property map.
4. Sign in as the assigned agent. In the personal workspace, open **Seller Inbox**, then **Buyer Inbox**. The inbox shows the latest 50 requests and distinguishes permission to reply from permission to send updates.

## Request And Owner Access

- `POST /api/buyer-requests` accepts buyer plan version `1`. It checks the origin, streams at most 12,000 bytes and uses the distributed rate limiter. Permission to reply is required and marketing is separate. The contract accepts preapproval status. It rejects amounts, seller addresses and browser-selected routing fields.
- `BUYER_GUIDED_INTAKE_ENABLED=true` and a valid `BUYER_REQUEST_AGENT_SITE` open the Explorer entry, form and POST. The site must be active and published for a save. The same site and submission ID replay when the normalized answers match. The form keeps the request ID when retrying unchanged answers after an uncertain save.
- `GET /api/realtor/buyer-requests` returns the signed-in owner’s latest 50 requests. The optional `requestId` selects one request. Another owner gets a 404 for a request they cannot read. The response excludes submission IDs, fingerprints, campaign data and internal ownership IDs.
- The migration denies direct client access to the table and RPCs. The read checks the owner at assignment and the current active site owner. A transfer removes the previous owner’s access and requires a separate handoff decision for historical requests.

## Retention

- Requests disappear from both the Buyer Inbox and the owner API exactly 90 days after submission. This applies even when cleanup is delayed.
- The existing authenticated daily CMA cron calls `purge_expired_guided_buyer_requests()` and reports `prunedBuyerRequestCount`. It clears the name, email, search answers, campaign and both contact and marketing permissions from up to 500 expired requests per run. A backlog carries over to later runs.
- A private replay record keeps the submission ID, fingerprint, site and owner IDs, and timestamps. An unchanged retry returns `410` after expiry and cannot restore the cleared details. The form offers to start a new request, which requires fresh answers and permission to reply.

## Test Locally

```powershell
node apps/pulse/scripts/platform-disposable-auth-acceptance.mjs --suite seller-service --guided-buyer
```

The runner uses fictional data and sets both rollout variables only for its disposable server. It opens the form from Explorer at a 390px mobile viewport, submits it and checks a replay. It verifies that a guest reaches Sign In without receiving buyer details and that only the assigned agent can read the request. It then ages the request and checks inbox expiry, the authenticated cron and the `410` retry. The database-only seller-service suite covers conflicts, table and RPC permissions, tenant-scoped identity and ownership transfer.

The retention pass verified 51 focused application tests, scoped TypeScript and ESLint, and 30 buyer pgTAP assertions on an isolated PostgreSQL WASM database. It also applied the migration to a preexisting request. One earlier mobile run timed out waiting for the first question to become interactive. Two subsequent disposable walkthroughs passed with real local Supabase Auth, API and storage, including all 11 database test files. Both runs verified removal of their temporary containers and data.

Apply `20261106140000_guided_buyer_request_retention.sql` before deploying the updated cron handler. Keep the intake switch off in shared environments until the target cron reports a successful buyer cleanup count. The owner inbox remains readable when intake is paused. Explorer filters and tour scheduling need separate verified mappings and permissions.
