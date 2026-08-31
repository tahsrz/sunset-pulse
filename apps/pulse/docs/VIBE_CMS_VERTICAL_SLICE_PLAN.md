# Vibe CMS Vertical Slice Plan

This plan is the execution companion to `VIBE_CMS_LUNA_BASELINE.md`. It covers the remaining work from authorized seed configuration through production evidence and Sol handoff.

## Phase 1 — Seed configuration validation (45–60 minutes)

Require `CMS_TEST_SEED_ENABLED`, `CMS_TEST_SEED_TOKEN`, `CMS_TEST_SEED_OWNER_EMAIL`, and `CMS_TEST_SEED_OWNER_USER_ID`. Fail closed for missing/invalid controls, bind both owner fields to the configured user, and pass deterministic IDs plus truthful audit metadata. Test missing controls, wrong owner, wrong token, disabled mode, and valid configuration. Existing Stripe provisioning must remain unchanged.

## Phase 2 — Dedicated disposable-site service (60–90 minutes)

Extract `provisionDisposableCmsSite`, `inspectDisposableCmsSite`, and `revokeDisposableCmsSite` around shared persistence utilities. Seed and revoke audits must use `cms.test-site.seeded` and `cms.test-site.revoked`, with the run ID and internal actor. No Stripe action, actor, or message may appear in CMS seed audits.

## Phase 3 — Real idempotency (45–60 minutes)

For an existing deterministic run ID, return the existing site and pointer without extending expiry, changing timestamps, adding audits, sending mail, or writing either store. Reject ownership conflicts and customer-record adoption. Test first request, repeat request, unchanged expiry, unchanged pointer, and conflicts.

## Phase 4 — Structured diagnostics (60 minutes)

Instrument request, configuration, lookup, each store write, summary, notification, and response stages with operation, run ID, site ID, correlation ID, elapsed time, status, stores, and error class. Never log secrets, headers, connection strings, or private profile details. Return the correlation ID for reconciliation.

## Phase 5 — Bounded seed operation (45–60 minutes)

Keep the 10-second notification timeout and add an overall seed deadline. Return a structured timeout with stage and correlation ID. If a persistence stage began, report `reconciliationRequired: true`. Cover stalled notification, Supabase, Mongo, summary, and partial-write paths.

## Phase 6 — Partial-store reconciliation (90 minutes)

Define behavior for every Supabase/Mongo success, failure, timeout, freshness, ownership, and pointer disagreement. Never report complete success after a partial write. Add a protected reconcile action that verifies the disposable marker and owner, applies the established freshness rule, and writes only missing/stale state without changing the Vibe pointer.

## Phase 7 — Read-only inspection (45 minutes)

Add a protected inspection operation returning run ID, site ID, owner, status, URL, original/current pointer, timestamps, expiry, seed/revoke audits, store presence/freshness, and reconciliation state. It must never mutate or return secrets.

## Phase 8 — Strong revocation (60 minutes)

Require the exact run ID, disposable marker, and configured owner. Suspend the site, cancel/expire test billing, preserve pointer history, prevent public serving, record truthful audit metadata, and return per-store results. Make repeat DELETE safely idempotent and cover partial failures.

## Phase 9 — Automatic expiry (60–90 minutes)

Persist an explicit disposable marker, run ID, and expiry. Extend the existing expiry process or add a narrow cleanup job that targets only marked expired verification sites, revokes through the tested service, and records `cms.test-site.expired`.

## Phase 10 — Operator application UI (60–90 minutes)

Let the apply screen discover authorized disposable sites and display name, ID, URL, status, expiry, current pointer, actor, and timestamp. The confirmation panel must show the exact Vibe, published revision, site, current pointer, new pointer, expiry, and disposable warning. Customer sites must not be selectable in test mode.

## Phase 11 — Local verification (60 minutes)

Run seed-route, provisioning, site-config, notification, Vibe service, apply, rollback, TypeScript, lint, and build checks. Record commands, totals, and environment limitations. The existing 35-test safety set and all new ownership/idempotency/audit/reconciliation tests must remain green.

## Phase 12 — Controlled production verification (90–120 minutes)

After deployment, record SHA, UTC start, four controls, run ID, owner ID/email, disabled-state proof, and temporary-access state. Enable the flag for one run, provision one site, capture site ID/URL/original pointer/expiry/audit/store results, repeat the same POST to prove no-write idempotency, then execute the full Vibe lifecycle: create, preview, submit, publish, apply, draft/live isolation, second cycle, rollback, and restoration.

## Phase 13 — Cleanup and access closure (30–45 minutes)

Revoke the disposable site, verify both stores agree on suspended state, disable the seed flag, remove or rotate the token, confirm the endpoint fails closed, and set `VIBE_CMS_PUBLIC_WRITE_WIP=false`. Re-test authenticated editorial access and anonymous denial.

## Phase 14 — Evidence and Sol handoff (45–60 minutes)

Complete `VIBE_CMS_PRODUCTION_VERIFICATION.md` with all IDs, pointers, actors, timestamps, public markers, CSS values, Jamie tone, isolation results, rollback lineage, restoration, revocation, store agreement, credential shutdown, final tests, and residual limitations. The feature is complete only when the disposable site is revoked, controls are disabled, temporary public write is closed, and Sol receives a ready/conditional/blocked recommendation.

## Global stop conditions

- Never use a customer site or fabricate an ID.
- Preserve state before every mutation.
- Do not treat preview evidence as production evidence.
- Stop on ambiguous pointer, failed apply, partial write, failed rollback, failed restoration, or failed revocation.
- Keep fixes narrowly scoped to the Vibe CMS vertical.
