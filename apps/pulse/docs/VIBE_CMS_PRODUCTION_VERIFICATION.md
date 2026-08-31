# Vibe CMS Production Verification Record

Use this record only with a disposable Vibe and a controlled Launch Kit site. Do not use a customer-facing site. Preserve the original applied revision before testing so it can be restored at the end.

## Test target policy

Use `https://vibes-test.sunsetpulse.app` for all Vibe CMS browser testing on this PR. It aliases the current `codex/vibe-cms-baseline` Vercel preview deployment rather than `main`, and Vercel deployment protection must stay enabled. Because Vercel aliases point to one deployment, refresh it after each successful PR deployment before browser testing. Sign in to Vercel in the browser before navigating to `/vibes`; use `vercel curl` for protected automated reads. Do not use a production or customer-site hostname as a substitute.

Read-only smoke verification on 2026-08-30 returned HTTP 200 for the Vibe list, new-Vibe screen, editor, draft preview, revisions, audit, protected application screen, taxonomy, and the Vibe/taxonomy/revision/audit GET APIs.

## Session metadata

| Field | Value |
| --- | --- |
| PR head SHA | |
| Deployed URL | https://vibes-test.sunsetpulse.app |
| UTC start time | |
| Operator account | |
| Controlled site ID | |
| Original site pointer / revision | |
| Disposable Vibe ID | |

## Preconditions

- [ ] The deployed build is the recorded PR head and is reached through `https://vibes-test.sunsetpulse.app`.
- [ ] The operator is signed in and can open `/vibes`.
- [ ] The controlled site ID and original applied revision are recorded above.
- [ ] `VIBE_CMS_PUBLIC_WRITE_WIP` is enabled only for this WIP session and no live customer site will be applied.

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
- [ ] The complete evidence record is attached to PR #67.
- [ ] `VIBE_CMS_PUBLIC_WRITE_WIP=false` is set before any production release.

Any missing evidence, unexpected public output, or failed restoration keeps the release gate open.
