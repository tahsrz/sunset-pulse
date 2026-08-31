# Vibe CMS Production Verification Record

Use this record only with a disposable Vibe and a controlled Launch Kit site. Do not use a customer-facing site. Preserve the original applied revision before testing so it can be restored at the end.

## Test target policy

PR #67 merged to production as commit `9507b766b5d440419abdfded49660088ca99aa4b`, and the save-validation fix from PR #68 merged as `77e985cfe3db307a1b4f8d6d9a1b35e60241507e`. Run the completion cycle from `https://sunsetpulse.app/vibes` using the existing authenticated Taz account. Use only a disposable Vibe and a controlled Taz Launch Kit site; never apply the test revision to a customer site. Record every observation here and put any corrective code in the next production-verification PR.

The protected `https://vibes-test.sunsetpulse.app` hostname remains available for validating follow-up PR fixes before they reach production. It must remain deployment-protected and must be refreshed to the newest successful follow-up deployment after each push. It is not a substitute for the production cycle requested after merge.

Read-only smoke verification on 2026-08-30 returned HTTP 200 for the Vibe list, new-Vibe screen, editor, draft preview, revisions, audit, protected application screen, taxonomy, and the Vibe/taxonomy/revision/audit GET APIs.

### Phase 0 access note — 2026-08-31

The authenticated Taz session successfully opened `/vibes`, but `/admin/launch-kit` returned **Operator Access — Access denied**. The regular `/dashboard` workspace did not expose a Launch Kit site or an applied Vibe pointer. No Vibe, revision, site pointer, or production content was mutated. Phase 0 remains blocked until Taz either provides the ID and original pointer of a confirmed controlled Launch Kit site or receives the operator entitlement required to read it. Do not infer a site ID from a public URL or proceed with the apply form while these fields are unknown.

## Session metadata

| Field | Value |
| --- | --- |
| Feature merge SHA | 9507b766b5d440419abdfded49660088ca99aa4b |
| Save-fix merge SHA | 77e985cfe3db307a1b4f8d6d9a1b35e60241507e |
| Follow-up PR head SHA | `976bcc2c` |
| Deployed URL | https://sunsetpulse.app/vibes |
| UTC start time | Not started — awaiting controlled production seed run |
| Operator account | Taz (existing authenticated account) |
| Controlled site ID | |
| Original site pointer / revision | |
| Disposable Vibe ID | |

## Preconditions

- [ ] Production includes save-fix merge commit `77e985cfe3db307a1b4f8d6d9a1b35e60241507e` and `/vibes` loads from `https://sunsetpulse.app`.
- [ ] The operator is signed in and can open `/vibes`.
- [ ] The controlled site ID and original applied revision are recorded above.
- [ ] The selected Launch Kit site is owned or controlled by Taz, is safe to change temporarily, and is not serving a customer.
- [ ] `VIBE_CMS_PUBLIC_WRITE_WIP` remains a temporary testing exception and no customer site will be applied.

## Cycle one: author, publish, and apply

1. At `/vibes/new`, create a disposable Vibe. Record its ID above.
2. At `/vibes/<vibeId>/edit`, save distinctive visual tokens and a distinctive Jamie primary voice tone.
3. Open `/vibes/<vibeId>/preview` while authenticated. Confirm the draft projection renders.
4. Submit the draft for review, then publish the resulting submitted revision. Record both revision IDs.
5. Open `/vibes/<vibeId>/apply`, enter the recorded controlled site ID and the exact published revision ID, and apply it.
6. Record the post-apply pointer, actor, and timestamp from the application/audit result.
7. Visit the public controlled-site URL. Record its `data-vibe-revision-id`, visible computed CSS token values, and the assistant tone.

| Cycle-one evidence | Value | Pass/Fail |
| --- | --- | --- |
| Submitted revision ID | | |
| Published revision ID | | |
| Post-apply pointer / actor / timestamp | | |
| Public revision ID | | |
| Public CSS token values | | |
| Public assistant tone | | |

## Draft/live isolation

1. Return to `/vibes/<vibeId>/edit` and change the mutable draft's visual and linguistic fields.
2. Do not submit, publish, or apply those edits.
3. Reload the public controlled site and confirm its revision ID, token values, and assistant tone still match cycle one.

| Isolation evidence | Value | Pass/Fail |
| --- | --- | --- |
| Public revision unchanged | | |
| Public tokens unchanged | | |
| Public assistant tone unchanged | | |

## Cycle two, rollback, and restoration

1. Submit, publish, and apply the changed draft as a second immutable revision. Record the IDs and public evidence.
2. At `/vibes/<vibeId>/revisions`, choose the earlier published snapshot and use the guarded restoration control with a reason and confirmation.
3. Publish/apply the newly created rollback revision, then verify the public site matches the earlier snapshot.
4. Apply the original site pointer/revision recorded in session metadata. Confirm the controlled site is restored.

| Recovery evidence | Value | Pass/Fail |
| --- | --- | --- |
| Second submitted / published revision IDs | | |
| Second public revision ID | | |
| Rollback revision ID and reason | | |
| Public revision after rollback | | |
| Restored original site pointer / revision | | |
| UTC completion time | | |

## Final decision

- [ ] Every required observation passed and has a value recorded above.
- [ ] The controlled site is restored to its original revision.
- [ ] The complete evidence record is committed or attached to the production-verification follow-up PR.
- [ ] `VIBE_CMS_PUBLIC_WRITE_WIP=false` is set before the WIP exception is considered released and this follow-up is closed.

Any missing evidence, unexpected public output, or failed restoration keeps the release gate open.

## Disposable seed-run evidence (PR #73)

Complete this section during the authorized seed workflow. Never record the seed token itself.

| Seed field | Value | Pass/Fail |
| --- | --- | --- |
| Run ID | | |
| Seed endpoint UTC start | | |
| Seed response status (`201` or idempotent `200`) | | |
| Site ID / Agent ID | | |
| Public URL | | |
| Original active Vibe revision pointer | | |
| Idempotent repeat returned same site | | |
| Revocation response/status | | |
| Seed flag disabled after run | | |
| Token removed or rotated | | |

The seed endpoint must be invoked only after its deployment is confirmed. The production run is incomplete until the disposable site is revoked, the flag is disabled, and the final public/control state is recorded.

## Local focused checks

| Check | Result | Notes |
| --- | --- | --- |
| Site-pointer authority suite | Pass — 11 tests | Covers fresher Mongo, stale Supabase writes, absent Mongo pointer, and Mongo-read failure fallback. |
| CMS test-site route suite | Pass — 4 tests | Covers disabled flag, token rejection, disposable provisioning, and revocation. |
| Combined focused total | Pass — 15 tests | Runner reported all tests passed; no production data was changed. |
| Expanded CMS safety set | Pass — 35 tests | Pointer authority (11), seed route (4), provisioning (15), and lifecycle notifications (5). |

## Seed-run incident note

The first controlled seed attempt reached `/api/internal/cms/test-site` but did not return within the bounded execution window. Runtime logs showed the request entered the route without a completed response, but did not identify the exact blocking operation. Review found one plausible unbounded wait in the lifecycle notification fetch. That request now carries a 10-second `AbortSignal` timeout; notification failure is handled as a warning after site persistence. Focused regression tests confirm the timeout signal is attached and timeout rejection produces a failed-notification result. No second live seed mutation was attempted, preventing duplicate provisioning while the cause remained uncertain.
