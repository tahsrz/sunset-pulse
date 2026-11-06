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

## Optimized Build

Run `node apps/pulse/scripts/production-build-acceptance.mjs` in a checkout without runtime environment files. The November 6 run passed on the lockfile's Next.js 15.5.28. The same build served both flag states in Chromium. With the flags off, Explorer hid the buyer entry and the short seller form remained available. With the flags on locally, the buyer's first question worked at 390px and the seller form advanced to the street address at desktop width. Production-mode buyer POST requests from loopback were rejected in both states. The disposable Supabase walkthrough above covers actual saves.

## Shared Release Order

The November 6 read-only audit found 163 of 169 checkout migrations in the shared Supabase ledger, with no unrecognized versions. The existing private CMA table and seller action receipts were present. The consultation migrations, role guard and three guided migrations below were pending. The signup routine and role guard still failed the source checks.

1. Review the seller base and security dependencies. The latest [PR #102 audit job](https://github.com/tahsrz/sunset-pulse/actions/runs/41727832223/job/126237145503) failed on DOMPurify, Next.js and Zod before unit tests ran. The November 6 production dependency audit found zero vulnerabilities on the guided checkout. Recheck the standalone security PR after bringing in the dependency fixes. The role migration has identical contents in both branches. A trial merge with [PR #103](https://github.com/tahsrz/sunset-pulse/pull/103) found conflicts in `.mex/ROUTER.md`, the disposable runner and the three role preflight files. Preserve the stricter signup and role trigger checks from the security branch when reconciling those files.
2. Recheck the shared project after the security release. The six pending versions at the November 6 check were `20261028120000`, `20261028123000`, `20261103150000`, `20261105170000`, `20261105180000` and `20261106140000`. Apply the reviewed migrations that remain pending in that order. Production and previews share this database.
3. Deploy the matching app with the guided flags off. Confirm that the existing daily CMA cron returns `deletedCount`, `prunedJourneyCount` and `prunedBuyerRequestCount` on a successful run.
4. Enable buyer intake only after the cron check and confirmation of the intended active, published `BUYER_REQUEST_AGENT_SITE`. The owner inbox remains readable when intake is paused. Explorer filters and tour scheduling require their own verified mappings and permissions.

Rehearse the six-migration packet on the prior schema in Docker with `node apps/pulse/scripts/platform-disposable-auth-acceptance.mjs --suite guided-migration`. The runner inserts a synthetic seller receipt before applying the seller cleanup migration, then saves a buyer request before applying buyer retention. The November 6 run verified that the receipt kept its other fields, the existing buyer request still replayed, and the calendar read grants were present. All 62 role and retention database assertions passed. The runner removed its temporary project and fixtures.
