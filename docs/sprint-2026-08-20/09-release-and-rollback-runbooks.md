# Release and Rollback Runbooks

## Runbook 1: Current branch integration preflight

1. Confirm branch and record worktree state.
2. Inventory modified and untracked files.
3. Confirm the lead idempotency migration is included intentionally.
4. Inspect staged files by subsystem before any commit.
5. Run focused security suites.
6. Run the full unit suite.
7. Run targeted Jamie E2E.
8. Run the production build.
9. Record exact pass/fail results in the PR description.

Commands from repository root:

```powershell
npm run test:unit
npm run test:e2e
npm run pulse:build
```

For focused Vitest execution, run from `apps/pulse` with explicit test files. Do not describe focused tests as full CI coverage.

Stop conditions:

- Unexpected untracked source or migration files
- Build output differs between repeated runs without explanation
- Security regression failure
- Database migration not represented in the proposed release
- Required environment variable missing

## Runbook 2: Lead idempotency migration

Preflight:

- Inspect duplicate candidate keys.
- Confirm column/index names do not collide.
- Confirm application code tolerates the column before migration.
- Confirm migration is additive and nullable for historical rows.

Deploy:

1. Apply migration using the repository's approved Supabase deployment path.
2. Verify column and unique index.
3. Submit one lead with a stable key.
4. Repeat the same request.
5. Confirm one row and one side-effect chain.
6. Submit the same key under another tenant and confirm tenant-scoped behavior.

Rollback:

- Disable explicit-key generation only if application behavior is failing.
- Keep the nullable column and index unless the index itself causes a demonstrated incident.
- Do not delete lead rows created during verification; mark test records clearly and remove only through the approved data-cleanup process.

## Runbook 3: Tenant-domain schema release

Preflight:

- Run duplicate normalized hostname report.
- Audit browser-side `site_config` reads.
- Review RLS policy changes separately from table creation.
- Confirm custom domains have verification evidence.
- Confirm environment mapping for production, preview, and development.

Release phases:

### Phase A: Additive schema

- Create domain, outbox, and projection tables.
- Create service-role functions and RLS.
- No production resolver behavior changes.

### Phase B: Backfill

- Backfill platform subdomains.
- Backfill verified custom domains.
- Resolve conflicts manually.
- Generate initial desired revisions.

### Phase C: Shadow resolution

- Existing resolver remains authoritative.
- New resolver runs on sampled requests and logs discrepancies without changing responses.
- Exit after no actionable differences for the agreed window.

### Phase D: Feature-flagged authority

- Enable `TENANT_CONTEXT_V2_ENABLED` for preview.
- Run positive and negative tenant E2E.
- Enable for a small production tenant cohort.
- Expand after telemetry remains clean.

### Phase E: Retire old lookup

- Stop reading legacy `site_config` domain fields.
- Retain compatibility columns until a later cleanup migration.

Rollback:

- Disable `TENANT_CONTEXT_V2_ENABLED`.
- Leave additive tables and outbox records intact for diagnosis.
- Restore old resolver only if it still enforces host/path and publication checks.
- Never roll back by trusting browser/internal headers.

## Runbook 4: Edge Config projection enablement

Required configuration, without secret values in documentation:

- Edge Config connection/read configuration
- server-only Edge Config write credential
- projection worker authorization secret
- `DOMAIN_EDGE_PROJECTION_ENABLED=false` initially
- `TRUSTED_PROXY_HOST_HEADER=false` unless platform behavior is verified

Enablement:

1. Publish full current manifest from authoritative domain rows.
2. Record manifest version and digest.
3. Verify preview custom domain.
4. Enable projection reads in preview.
5. Mutate a test domain and confirm `pending_propagation` to `active`.
6. Force one write failure and confirm retry/reconciliation.
7. Enable production reads for a small cohort.

Rollback:

- Disable Edge projection reads.
- Platform subdomains use deterministic host resolution.
- Custom domains fail closed or use authoritative server resolution according to the release mode.
- Do not delete the manifest during an incident.

## Runbook 5: Projection drift repair

Symptoms:

- Valid custom domain returns 404.
- Projection lag alert fires.
- Desired revision exceeds applied revision.
- Edge manifest tenant differs from Supabase.

Procedure:

1. Resolve hostname and environment exactly.
2. Read authoritative domain status/revision.
3. Read projection desired/applied revision.
4. Inspect latest outbox state and lease.
5. Do not manually change the tenant assignment in Edge Config first.
6. Enqueue/replay the current authoritative revision.
7. Confirm stale jobs become superseded.
8. Verify server context and public page.
9. Record repair event and root cause.

Security rule:

If Edge and Supabase disagree, Supabase wins and the site remains unavailable until reconciled.

## Runbook 6: Tenant isolation incident

Trigger:

- Tenant A sees Tenant B branding, listing, lead, alert, or notification.

Immediate actions:

1. Disable affected tenant-facing feature flag or route.
2. Suspend implicated custom domain if domain mapping is uncertain.
3. Preserve logs, request IDs, manifest versions, revisions, and database rows.
4. Stop notification dispatch for affected tenant/event class if wrong-recipient risk exists.
5. Determine whether exposure is routing, RLS, cache, listing assignment, or event enrichment.
6. Purge affected caches only after evidence is captured.
7. Verify negative isolation test before re-enable.

Do not broadly delete logs, leads, notifications, or projection rows during containment.

## Runbook 7: Public inventory V2 rollout

1. Introduce `PublicListing` schema and service behind `PUBLIC_INVENTORY_V2_ENABLED`.
2. Run old/new comparison offline or on a small sample.
3. Confirm all differences are understood, especially visibility differences.
4. Migrate detail/search routes first.
5. Migrate rent/recon/games.
6. Migrate tenant featured/hot-list after TenantContext.
7. Enable import-boundary enforcement preventing public Mongo reads.
8. Monitor public rejection and legacy fallback rates.

Rollback:

- Disable V2 only if the old path has received the same private-data protections.
- Never roll back to a path known to expose `display_public=false` rows.

## Runbook 8: RLS remediation

Preflight:

- Inventory direct Supabase client queries by table.
- Identify routes using service role.
- Build Realtor A/Realtor B integration fixtures.

Release:

1. Add owner/agent relationships where available.
2. Add restrictive replacement policies.
3. Test with anon, consumer, Realtor A, Realtor B, and service role.
4. Drop broad policies in the same migration where safe.
5. For legacy tables without ownership, remove realtor client access and route through authorized server APIs.

Rollback:

- Restore only the narrow policy required for a known workflow.
- Never restore `USING (true)` or all-realtor access as a generic availability fix.

## Runbook 9: Notification unknown delivery

1. Stop automatic resend for the row.
2. Inspect provider message ID and request correlation metadata.
3. Query provider status only when supported.
4. If status is confirmed delivered, mark delivered with reconciliation evidence.
5. If confirmed not delivered, return to retryable.
6. If unknowable and high impact, require operator decision.
7. Record manual action and actor.

## Runbook 10: TAH crawler and hydration release

Preflight:

- Checkpoint is readable and recent.
- Latest cartridge has a ready manifest and checksum.
- Remote object version is immutable or revisioned.
- Previous known-good manifest remains available.

Release:

1. Publish cartridge payload.
2. Publish/check ready manifest only after payload completion.
3. Hydrate in preview and verify checksum.
4. Run retrieval evaluation.
5. Promote manifest pointer.
6. Observe cold and warm metrics.

Rollback:

- Restore previous manifest pointer.
- Keep failed cartridge for forensic inspection.
- Do not mark a partial payload ready.

## Final release checklist

- [ ] Branch scope and PR dependencies documented
- [ ] All required migrations included
- [ ] Environment variables listed without values
- [ ] Full unit result recorded
- [ ] Security regression result recorded
- [ ] Targeted Jamie E2E result recorded
- [ ] Production build result recorded
- [ ] RLS verification recorded
- [ ] Tenant A/Tenant B negative E2E recorded
- [ ] Projection failure drill completed
- [ ] Rollback flags tested in preview
- [ ] Operator dashboard exposes propagation and delivery failures

