---
name: profile-role-release-audit
description: Verify a profile-role release using private approval input, aggregate read-only SQL and generated local drift fixtures.
triggers:
  - "profile role preflight"
  - "role security release"
last_updated: 2026-11-03
---

# Profile Role Release Audit

## Context

Production and previews share Supabase project `xlyfhiafactxahhvikyv`. Treat either as production. The audit compares the migration inventory and routine bodies in the current checkout, so choose the release branch before running it. See `docs/profile-role-hotfix-implementation-plan-2026-11-03.md` and `docs/releases/standalone-profile-role-hotfix-2026-11-03.md`.

## Steps

1. Require an explicit expected project ref, an already-linked directory and a private approved-address JSON file. Confirm the link before reading approval input and again after the query. Never load runtime env files or relink a project automatically.
2. Normalize and hash approved emails locally. Execute only the fixed aggregate SQL in `profile-role-release-preflight.mjs`, in a read-only transaction with a statement timeout and rollback. Forward only the CLI's OS/network/authentication environment allowlist. Suppress raw provider output on failure.
3. Compare complete source/history inventories, routine fingerprints and security attributes. Verify the signup trigger and the profile guard are active on the expected tables/events/functions. Reject trigger conditions, arguments and column-restricted role updates.
4. Reproduce mutation scenarios only with `npm run test:profile-roles:db --workspace=apps/pulse`. It owns a generated `pulse_auth_*` project and uses the existing disposable runner for setup/teardown. Never point these fixtures at a linked project.
5. Record the report's exact source inventory and time. Keep private input/reports ignored. A database pass does not verify deployed callback code, Vercel operator-email overrides or overall release readiness. Applying migrations, changing account roles and deploying remain separate reviewed actions.

## Gotchas

- An applied version alone cannot establish that a routine or trigger is repaired.
- An enabled trigger with a WHEN predicate or restricted UPDATE columns can skip the role write being protected.
- Preserve literal carriage returns when normalizing routine hashes; normalize checkout CRLF only.
- A standalone hotfix inventory excludes the feature branch's older calendar migrations. If the hotfix lands first, review the complete later packet without renaming versions.
- CLI failure must not print provider output that may contain credentials or identities. Do not treat a previous report as the result of a failed invocation.
- In generated local projects, the Auth table is owned by `supabase_auth_admin`. Use that local database role for deliberate signup-trigger drift instead of changing table ownership or production grants.
- For named audit options on Windows, invoke the Node script directly. This machine's npm invocation removed named arguments; the CLI rejected it before querying.

## Verify

- Run the offline preflight tests and the disposable database packet.
- Verify deliberate trigger drift returns BLOCKED, restored fixtures return DATABASE_CHECKS_PASS, and generated resources are removed.
- Check syntax and whitespace. Reuse existing optimized application evidence only when runtime/dependency files are unchanged.
- Hosted reports contain counts, versions, hashes and routine attributes, never account emails/IDs or routine bodies.

## Debug

For target mismatch, stop before querying. For CLI access failure, verify the existing link/authentication without dumping env files. For routine drift, compare the selected branch's exact source and migration packet. For Vercel environment 403, report the missing access; database counts do not substitute for that review.
