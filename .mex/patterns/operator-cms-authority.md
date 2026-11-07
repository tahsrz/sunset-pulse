---
name: operator-cms-authority
description: Keep global CMS authority separate from public realtor registration and development shortcuts.
triggers:
  - "CMS authorization"
  - "operator bypass"
last_updated: 2026-11-03
---

# Operator and CMS Authority

## Context

Use `lib/core/operator_access.ts` and `routeAuth.ts`. The generic operator helper historically permits realtors; global CMS must additionally require admin/operator authority or the existing configured operator-email match. The profile-role security migration/callback repair in PR #102 is a release prerequisite, not proof of deployed access.

## Steps

1. Trace every read/write of the backing collection, including legacy aliases. The Vibe collection is used by `/api/vibes/*` and `/api/jamie/vibes`; both must use CMS authority.
2. Gate before reading request bodies, opening databases or invoking services. Keep published public projections separate from editorial records; never expose a full draft as a public fallback.
3. Production ignores development and E2E host shortcuts. An explicit WIP identity is limited to development loopback. Preserve local development convenience and unrelated realtor policies deliberately; do not infer global CMS rights from realtor registration.
4. Retain existing configured-email precedence. Compare deployed values with the owner's approved addresses through authorized environment access; never print secret env files or substitute profile counts for this check.
5. Exercise actual handlers with denied accounts before mocked data effects, then verify real local sessions in an optimized build. Use invalid mutation bodies to reach authorized validation without writing CMS content. Reuse the generated Supabase lifecycle and cleanup.

## Gotchas

- Disabling a flag by convention leaves a default-open path when the variable is missing. Enforce the production boundary in code.
- An E2E shortcut that checks only a loopback Host can survive production even if ordinary local access is disabled.
- Protect collection/taxonomy reads as well as detail/mutation handlers; they expose draft metadata and editorial counts.
- A legacy upsert into the same collection is part of the boundary even if its URL sits outside the CMS namespace.
- Record whether bypass flags were deliberately true or false in acceptance. Never describe a bypass-enabled UI run as real authorization evidence.

## Verify

- Public signup claiming admin remains consumer after real callback; CMS denies that account, anonymous browsers and unapproved realtors.
- Trusted admin/operator fixtures reach validation; invalid requests stop before MongoDB or publication.
- Generic realtor access elsewhere is preserved; forwarded/loopback Host values cannot grant production operator access.
- Runtime changes receive an optimized build and production-mode acceptance. Remove generated resources and keep credentials/tokens out of reports.

## Debug

For 403, check the actual authoritative profile and configured email, not user metadata. For apparent bypass, inspect NODE_ENV, actual Host, route classification and every legacy writer. A local pass is not a hosted repair; no production role, flag, schema or content change is implied by these steps.
