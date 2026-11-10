# Zod 4 Contract Migration

Prepared October 28, 2026. Branch: `codex/zod4-contract-migration`. Base: PR #88 at `58388aaf2d214c4c0f58412be6f7d543c83bb61e`.

## Purpose

The production audit reported GHSA-mrhx-c7xc-m3w5 against Zod below 4.6.6. The app now declares Zod `^4.6.7`; the lockfile resolves one Zod copy at 4.6.7. Existing peer ranges accept Zod 4, so a forced transitive override is unnecessary. The application's schemas continue to import the patched `zod` API; this change does not route them through the v3 compatibility subpath.

Sources: [GitHub advisory](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5) and [upstream migration guide](https://zod.dev/v4/changelog).

## Review Guide

- Explicit string keys replace single-argument records. Existing dictionary value validation and defaults remain in place.
- Existing UUID-shaped identifiers use `guid()` to retain the prior 8-4-4-4-12 hexadecimal acceptance. This does not introduce a new identifier format. Zod 4's stricter RFC-variant UUID validation would reject some previously valid database IDs and fixtures.
- Unreachable defaults inside outer optional fields were removed. Under Zod 3 these fields stayed absent when omitted. The migration preserves that behavior, particularly for consent flags, rather than inserting new values into saved requests.
- Bare unknown/any object fields remain explicitly optional where Zod 3 already accepted omission. Domain-level requiredness is not silently tightened in a dependency migration.
- The discovery helper accepts numeric-output schemas with unknown input. The lead form narrows watched budget input before comparison. Jamie's optional transformed inputs retain optional output properties.
- The SMS consent literal uses the current error option and still requires literal `true`. Safe-parse success narrowing uses TypeScript's discriminated result rather than a removed Zod type name.

Most touched files contain only the identifier or record signature update. Review behavioral changes in `lib/core/validation.js`, `lib/data/listingDiscovery.ts`, `lib/ai/jamieTools.ts`, `app/api/sms/opt-in/route.ts`, and `components/LeadCaptureForm.tsx` separately from that mechanical diff.

## Bounded Public Input

The legacy public lead endpoint now counts actual streamed request bytes before parsing JSON, with a 128 KiB maximum. It does not trust an absent or misleading Content-Length header. Oversized streams are cancelled; malformed JSON returns 400 and oversized JSON returns 413. Both are rejected before opening the Mongo connection. Existing rate limiting remains in place.

Lead tags are limited to 100 entries of at most 120 characters each, so the patched validator can reject an oversized collection before validating every element. This is an intentional, bounded input policy change. It is not a claim that every endpoint or every unbounded schema in the site has been audited.

The existing seller intake and chat stream byte limits, purpose-specific capabilities, tenant checks, saved request identity, scheduler behavior, and storage budgets remain in their existing infrastructure.

## Evidence

- Before upgrading, 53 checks across nine suites passed on Zod 3, including seven new characterization cases committed separately.
- On the fresh Zod 4 installation, the expanded initial selection passed 76 checks across 12 suites.
- After the byte-limit repair, 22 checks across four suites passed, including six streamed-body/public-route cases, the characterization cases, the existing lead processor, and the marketing draft editor.
- `npm run security:audit:prod`: zero vulnerabilities.
- Full application TypeScript passed after generating the normal local Prisma client and Next route types, including a final check with the byte-limit and AI SDK integration tests.
- Focused ESLint passed across all changed source files and new tests.
- Broad unit run: 1,813 passed and 15 failed. The failures came from four filesystem suites (private scan artifacts, MLS ledger, terminal intent persistence, and Wikipedia fixtures) under sandbox atomic link/rename restrictions. A focused rerun of all four suites with normal local filesystem permissions passed all 39 tests. No source changes were needed to clear those failures. This records the broad run and its targeted recovery rather than claiming a single all-green full run.
- Two additional checks passed for early collection rejection and the real AI SDK tool-schema conversion/validation path. The final focused byte-limit/integration run passed eight tests.

Local dependencies are installed independently in this checkout. The original checkout's dependency directories were not mutated. Generated local files are ignored and are not part of the source change. No database migration, database connection for fixture setup, production write, provider activation, or deployment was performed.

## Follow-Up

This delivery is in [PR #89](https://github.com/tahsrz/sunset-pulse/pull/89), stacked on #88. Retarget it after #88 merges, and verify its diff against current main. The Explorer work is the next product delivery. Full production build and deployed browser review were not performed. Production activation still requires the relevant deployment/build and release acceptance evidence; a clear package audit alone is not a complete security assessment.
