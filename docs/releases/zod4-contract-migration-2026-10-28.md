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
- Full application TypeScript passed after generating the normal local Prisma client and Next route types. A subsequent check includes the final byte-limit changes; record its result before marking this delivery ready.
- Focused ESLint passed across all changed source files and new tests.
- Broader unit-suite result: pending at the time this evidence record was first written. Update before publishing the PR.

Local dependencies are installed independently in this checkout. The original checkout's dependency directories were not mutated. Generated local files are ignored and are not part of the source change. No database migration, database connection for fixture setup, production write, provider activation, or deployment was performed.

## Follow-Up

Retarget this stacked PR after #88 merges, and verify its diff against current main. The Explorer work is the next product delivery. Production activation still requires the relevant deployment/build and release acceptance evidence; a clear package audit alone is not a complete security assessment.
