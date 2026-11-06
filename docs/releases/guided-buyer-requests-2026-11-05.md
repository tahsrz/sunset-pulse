# Guided Buyer Request Backend

The buyer request backend uses the existing Supabase project and personal realtor workspace. It stores buyer requests in a private table because the shared agent lead inbox can query across sites. This slice adds the API and database boundary. The Find a Home form and owner-facing screen are the next UI work.

## Request And Owner Access

- `POST /api/buyer-requests` accepts buyer plan version `1`. It checks the origin, streams at most 12,000 bytes and uses the distributed rate limiter. Permission to reply is required and marketing is separate. The contract accepts preapproval status. It rejects amounts, seller addresses and browser-selected routing fields.
- `BUYER_REQUEST_AGENT_SITE` selects an explicit published site. The database confirms that its slug and agent match an active owner. The same site and submission ID replay when the normalized answers match. Changed answers with the same ID return a conflict. The receipt only confirms the save.
- `GET /api/realtor/buyer-requests` returns the signed-in owner’s latest 50 requests. The optional `requestId` selects one request. Another owner gets a 404 for a request they cannot read. The response excludes submission IDs, fingerprints, campaign data and internal ownership IDs.
- The migration denies direct client access to the table and RPCs. The read checks the owner at assignment and the current active site owner. A transfer removes the previous owner’s access and requires a separate handoff decision for historical requests.

## Test Locally

```powershell
node apps/pulse/scripts/platform-disposable-auth-acceptance.mjs --suite seller-service --guided-buyer
```

The runner uses fictional data and sets a buyer site only for its disposable server. It checks a save, replay, conflict and signed-in access from two accounts. The database-only seller-service suite also covers table and RPC permissions, tenant-scoped identity and ownership transfer.

The 53 focused tests, scoped TypeScript and ESLint, and all 11 disposable SQL packets passed. The HTTP walkthrough was interrupted before it reported a result. Rerun it with the Docker Linux engine available before treating the live HTTP path as verified.

Keep buyer-site configuration unset in shared environments until the form, owner view and buyer-specific retention are ready. The first form should reuse the guided choice and review components. Explorer preferences and tour scheduling need separate verified mappings and permissions.
