# Guided Home Journey: P1 Request Contracts

P1 is implemented as pure validation, serialization, fingerprint/retry and receipt helpers. It prepares the guided flow for the existing intake and scheduler. The public `/api/lead-magnets` validator and writer still accept version 2 only; no frontend save, database change, deployment or calendar activation is part of this slice.

## Code Map

| File under `apps/pulse` | Responsibility |
| --- | --- |
| `lib/marketing/guidedJourneySchema.ts` | Exact version 3 groups, wire answers, byte limits, branch validation, timing/kind compatibility and a standalone v2/v3 compatibility specification |
| `lib/marketing/guidedJourneyRequest.ts` | Whitelist serializer, normalized fingerprint material, SHA-256 client fingerprint, stable pending attempt and accepted receipt parsing |
| `tests/fixtures/guidedJourneyFixture.ts` | Complete fictional Both draft for serialization tests, with no application fallback |
| `tests/unit/guided-journey-contract.test.ts` | 25 contract, privacy, compatibility, retry and receipt cases |
| `vitest.guided-journey-v4.config.ts` | Runs only those contract tests against the installed package's bundled Zod 4 runtime |

No dependency was installed or upgraded. The default app uses Zod 3.25.76 in this checkout; the compatibility run uses its bundled Zod 4.0.0. This proves the exercised runtime boundary, not a complete build of the newer feature stack or compatibility with every future Zod release.

## Frozen Wire Shape

Versions remain strings: `'2'` and `'3'`, matching the existing offer contract.

Version 3 keeps the existing contact, consent, attribution, request-kind and coarse-timing vocabulary. It adds a strict `journey` with Sell or Both. A separate pure buyer-domain variant exists for later work, but it cannot be serialized or admitted as a seller request. No buyer source, writer or booking capability is introduced.

- A wire answer is `answered` with a valid value, explicit `unknown`, or explicit `skipped`. `unanswered` cannot enter an included group. Zero and explicit None (`[]`) remain real answers.
- A confirmed street address is sufficient. City, region and postal code are optional resolved context; the contract does not require hidden fields after the owner requested single-input entry. `entryMethod` is manual or record, never proof of ownership.
- Home facts use the prototype's bounds, including current year plus two. The schema factory accepts an injected clock for year-bound tests. Property eligibility is not inferred.
- Home details are either a single skipped group or a complete included group. Included values come from the same options as the current UI: pricing, preparation, move and explore are supported priorities; no cash-offer/financing service is invented.
- Renovation sets are deduplicated and sorted. The prototype's actual IDs are retained (`kitchen`, `bath`, `floors`, `paint`, `lighting`).
- Mortgage and pre-approval groups have yes with an amount answer, no, unknown or skipped. No/unknown/skipped cannot carry a hidden amount. Money is bounded integer cents.
- Sell rejects buyer groups. Both requires buying details unless the explicit stage is Not Buying. Not Buying rejects hidden buyer preferences. Buyer-only domain data rejects current-home, seller-condition and mortgage fields.
- Detailed selling windows remain in the journey while mapping to legacy timing. The top-level timing and request kind must agree with the detailed selected answers. Older version 2 callers retain Within 30 Days.
- The journey is limited to 6,000 UTF-8 JSON bytes and the entire request to 12,000, matching the existing streamed admission limit. Arbitrary metadata, provider responses, photos, documents, roles and tenant identifiers are not wire fields.

`serializeSellerJourney` first normalizes hidden branches, validates the applicable questions/contact permission, explicitly projects approved fields and parses the complete payload boundary. It does not spread the draft or lookup object into metadata. Record IDs, source payloads, timestamps, raw aggregate facts and UI state are not submitted. Contact/campaign normalization reuses the existing campaign sanitizer. Public failures use generic messages without echoing personal answers.

## Retry and Replay Contract

`prepareSellerJourneyAttempt(draft, attribution, previousAttempt)` returns a validated candidate request and an in-memory `{fingerprint, submissionId}`. The SHA-256 fingerprint is stable for equivalent normalized names/emails, campaign key order, object order and renovation sets. Changed material property, timing, consent or financial answers produce a different fingerprint and request ID. Hidden discarded values do not. An uncertain identical retry retains its original valid UUID.

The frontend integration must acquire its synchronous submitting guard **before** awaiting fingerprint preparation. Retain the pending attempt after network uncertainty; clear it only after a validated accepted receipt. Do not persist anonymous addresses, financing or pending attempts in browser storage by default.

The server integration can reuse `canonicalSellerLeadFingerprint` with its existing SHA-256 implementation. Version 2 retains the original property order and normalization. A fixed regression checks the historical digest:

```text
db463d03fc0add088beb882305ca0da40d5a19bb6b358910ce67e2a7eed43e26
```

Version 3 uses canonical normalized approved data, including the entire journey. The existing server-controlled tenant resolution, idempotency key and unique index remain the authority. This P1 helper is not yet wired into the writer. Canonical material contains private answers; keep it internal and store only the digest in the existing fingerprint field during the later integration.

## Saved Receipt and Scheduling Reuse

`readSellerReceipt` requires `success: true` and `accepted: true`; it strips unrelated response fields and defaults duplicate to false. The transport integration must also check the HTTP status before calling it.

Optional booking validation is injected from the existing feature-stack `sellerBookingOfferSchema`. Missing, malformed or throwing optional booking data leaves the accepted receipt intact, so it cannot trigger another lead save. P1 defines no competing booking schema or scheduler. On the reviewed feature base the adapter is:

```ts
const receipt = readSellerReceipt(body, value => {
  const result = sellerBookingOfferSchema.safeParse(value);
  return result.success ? result.data : null;
});
```

The current main-based checkout lacks that newer scheduling contract, so injection keeps this pure slice independent. The feature-stack picker will continue receiving its existing validated capability in P4.

## Verification

Completed locally on November 4, 2026:

- 55 focused tests pass across the new contract suite and existing journey model/form regression files. The new suite contributes 25 cases.
- The same 25 contract cases pass against the bundled Zod 4.0.0 runtime.
- Scoped TypeScript and ESLint pass for the new schema/helpers/tests/fixture/configuration.
- The unchanged live v2 validator explicitly rejects the candidate v3 request in a regression. Existing v2 normalization/hash behavior is frozen. No runtime route, writer or form was edited.
- An initial compatibility configuration merged the broad base include pattern; that run was stopped and is not acceptance evidence. The corrected configuration replaces the include array and the completed log shows one file/25 cases.

Commands from the repository root:

```powershell
npm run test:unit --workspace apps/pulse -- tests/unit/guided-journey-contract.test.ts tests/unit/guided-journey.test.ts tests/unit/guided-journey-form.test.tsx
npm run test:home-journey:contracts:v4 --workspace apps/pulse
npm run typecheck:home-journey --workspace apps/pulse
```

No browser, hosted acceptance or production build was run for these pure, inactive helpers. The previous prototype/address-lookup walkthrough remains documented in the [P0 guide](guided-home-journey-prototype-2026-11-04.md). This is not a claim that version 3 can already be saved or scheduled.

Repository conventions checklist:

1. Worker phrases: not applicable; no worker changes.
2. Relay provenance/modes: not applicable; no relay changes.
3. Operator guards: not applicable; no route or authorization change.
4. Ledger writes: not applicable; no new ledger or database write.
5. Zod bounds: passes; strict groups, exact enums, conditional rejection and UTF-8 envelopes are tested.
6. Environment/global cleanup: passes; crypto stubs are restored after each test. No runtime env files or hosted credentials were loaded.
7. Trace redaction: not applicable; no tracing added. Serializer/receipt errors exclude raw personal answers/capabilities.

## Frontend Integration

The [P2 rehearsal](guided-home-journey-frontend-2026-11-05.md) exercises these contracts locally. The following steps cover attaching the live form after the writer and owner reader support v3.

1. Select the reviewed seller-feature base at or beyond the recorded `042057e1` snapshot. Preserve its existing consultation, sharing and security fixes. Do not overwrite the newer form with main's older implementation.
2. Integrate the new presentation with the existing form's synchronous submit guard and pending identity ref. Acquire the guard before any async fingerprint work; keep answers/identity on uncertain failure.
3. Stage the new transport until its writer is ready, keeping the existing v2 submission operational. Do not send a v3 body to today's endpoint or silently downgrade it and claim nested answers were saved. Activate the versioned endpoint only with the P3 writer/projection regressions.
4. Refresh the address/financial privacy explanation before real collection. Keep current requested-contact permission separate from optional marketing.
5. In P3, activate the v2/v3 union, append the validated journey only to owner-authorized metadata, preserve old replay hashes and prove no private context reaches generic messages, Jamie, analytics or client sharing. Keep existing receipt and scheduler/reminder authority.

P1 deliberately stages its compatibility union in the new schema module instead of changing `leadMagnetContract.ts` now. The current writer would otherwise accept a new version without safely retaining its answers. Buyer persistence and hosted rollout remain separate gates.
