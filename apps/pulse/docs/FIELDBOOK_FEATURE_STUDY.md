# Fieldbook feature study

October 14, 2026. Fieldbook carries the working-notebook concept across the seller operating experience and the related platform surfaces. This packet contains an interactive design study, not production route changes. Existing application behavior, server authority and scheduling remain the implementation foundation.

## Copy

Use plain names such as Business, Planner, Publishing and Property work. Use supporting text only for useful context, consequences or instructions. Avoid subject-plus-quip headings, slogans, motivational filler and em dashes.

## Review the concept

Open [the study source](prototypes/fieldbook-feature-study.html) in a browser. Use **Open a chapter** to switch screens; desktop also has a contents index. All people, records and appointments are fictional. Buttons keep changes within the current preview, with no network calls, uploads, microphone use or database writes. Refreshing resets transient drafts and preview records.

In Codex's inline preview, use the host's design controls to adjust:

- Heading type: Georgia, Palatino or Sans.
- Ink accent: Rust, Forest or Navy.
- Paper appearance: System, Light or Dark.
- Entry spacing: 12–28px.
- Reading size: 14–17px; mobile editable controls remain at least 16px.

Those five controls belong to the preview host and are optional. Opening the source directly in a browser still provides the product interactions, but does not supply the host's design controls. The study has no production navigation links or external game launch.

Try a concrete path: Daily page → Ari's folder → edit a note → open Morgan's folder → return to Ari → open conversation → write and review a reply → change the text. The note survives folder navigation, conversations retain their selected person, and editing clears prior message review. Client progress offers a selected-field preview and a review gate; changing its selection removes the previous preview approval. Property capture displays only local file metadata and requires input review before its next step.

## Feature coverage and implementation destinations

These destinations identify existing sources to reuse; they are not claims that the source already uses Fieldbook.

| Study chapter | Familiar object and useful interaction | Existing implementation destination |
| --- | --- | --- |
| Daily page | A dated page with three people and the next appointment | `components/realtor/SellerPriorityPanel.tsx`, `SellerDailyPanel.tsx`, `/today` |
| Seller inbox | Incoming requests and a handled-requests disclosure | `components/realtor/SellerInbox.tsx`, `SellerInboxLead.tsx`, `/seller-inbox` |
| Seller folders | A relationship record, next conversation, preparation and private notes | `components/realtor/SellerCaseWorkspace.tsx`, `SellerCaseList.tsx`, `/seller-cases` |
| Planner | An appointment book, day selection, preparation and reminders | `/planner`, `components/realtor/SellerLeadScheduleDialog.tsx`, `PlannerReminderActions.tsx` |
| Conversation | Correspondence, exact recipient/message review and distinct receipts | Existing conversation/email actions in `SellerCaseWorkspace.tsx` |
| Client progress | A selected-field client page with review and revocation | `components/realtor/SellerPortal.tsx` and case publication controls |
| Business ledger | Received income, paid expenses and expected income kept distinct | `/business`, `/api/realtor/financial-records`, `/api/realtor/business-summary` |
| Goals | A small tally and a reviewed goal target | `/goals`, `components/realtor/GoalEditor.tsx`, `ProgressPanel.tsx` |
| Weekly review | Recorded cohort counts and a personal reflection | `components/realtor/WeeklyReview.tsx`, `SellerOverviewPanel.tsx` |
| Setup | Four practical steps, with operator configuration in details | `/seller-setup` and its existing readiness/setup controls |
| Review inbox | Exact draft revision, explicit approval and a human checkpoint | `components/platform/CheckpointCard.tsx` and existing revision review routes |
| Publishing | Editorial drafts, revision review, application and rollback | `/vibes`, `vibes/_components/VibeApplyConfirmation.tsx`, `VibeConfirmDialog.tsx` |
| Property work | An assignment, private capture, sourced notes and unavailable model state | `components/agent-workspace/PropertyContextCapture.tsx`, existing property/scan task flows |
| Jamie | A contextual editable proposal and a sample transcript | `components/realtor/JamieProposalCard.tsx`, `lib/ai/jamiePersonalContract.ts`, `jamiePersonal.server.ts` |
| Working log | Run steps, waiting-for-a-person state and recorded receipts | `components/platform/RunDetail.tsx`, existing durable engine/checkpoint APIs |
| Play Jamie | A quiet game index and per-game guides | `/play-jamie`, its existing chess/tetris/poker/volley/crash-bash routes |
| Public seller page | A personal request with separate contact and measurement choices | `/seller-plan` and its existing request/measurement handlers |

The study uses a broader chapter index to expose the complete concept during review. Production navigation should retain the existing user's available destinations and scope; a client portal and public intake page do not acquire owner navigation merely because the study shares a shell.

## Code sequence

1. Create `components/realtor/Fieldbook.module.css` for scoped paper, ink, muted text, rules, accent and heading tokens. Convert the study's CSS tokens to the app's existing theme mechanism. Keep light/dark contrast and responsive field sizes.
2. Create `FieldbookShell.tsx` with a title/date header and optional main/margin slots. Take the date from the existing saved timezone. Keep navigation in its existing component; do not hardcode the study's date or 17-chapter menu into the app.
3. Create `SellerNextActionRow.tsx` from the current typed action-card contract. Preserve priority IDs, action destinations, ranking, loaded limits, disclosure behavior and recovery in `SellerPriorityPanel.tsx`; substitute only its presentation. The daily margin uses authoritative agenda records.
4. Build `lib/realtor-workspace/sellerJourney.ts` as the pure projection described in [H2](HUMANIZED_OPERATING_EXPERIENCE_PLAN.md#h2-one-visual-relationship-journey). Test booked-but-not-held, retracted evidence, missing records and closing prerequisites. Render its result as ruled records in `SellerJourney.tsx`.
5. Introduce `SellerActionDrawer.tsx` around existing case actions using `ModalSurface.tsx`. Preserve person/source identity, per-action drafts, dirty-close handling, focus return and unknown-save replay. Reuse the existing exact booking, email, milestone and publication handlers. Editing reviewed values invalidates approval.
6. Move the same composition into planner, weekly review, goals and business one screen at a time. UI checkboxes never substitute for authoritative attendance, money received or milestone records. Preserve correction and privacy controls.
7. Restyle client progress and public intake separately under their existing authorization/public contracts. Use the exact publication whitelist; exclude internal notes, correspondence and finance. Keep optional measurement separate from contact permission.
8. Apply the concept to Jamie proposals, checkpoints, Vibe revision actions, property capture and run details under their existing scope/revision/receipt contracts. Real voice capture requires explicit activation and reviewed transcript; the sample transcript is not a voice implementation.
9. Carry the visual shell into the game hub while leaving the existing game engines, controls and external Crash Bash identity intact.

All runtime work reuses the current personal planner, reminder jobs, hourly dispatch and five-minute worker. The study introduces no schema, cron, queue, provider call or storage requirement. Existing target readiness gates still apply to implementation.

## Evidence and limits

Native Chromium checked all 17 default screens at desktop, 390px and 320px. It also checked 17px reading size with 28px entry spacing at 320px. No horizontal overflow or browser page errors occurred. Checks cover notes, per-person conversation drafts, exact message review invalidation, client whitelist/access, preview appointments, ledger totals, goal targets, approval gating, local capture gating, Jamie context, game guides, complete public request review, native dialog Escape and widget-state restoration without writes on load/state events. Every available generic review action opens and closes through local confirmation.

The local collection contains 36 individual PNG screenshots: 17 desktop, 17 mobile and two dark/forest alternatives. Two overview PNGs and a browsable screenshot gallery accompany them. Screenshots were captured from the actual prototype in Chromium and visually inspected; they are not generated images or deployed app screenshots. They remain local and are not uploaded to Supabase. Application CI, live backend acceptance and production usability are separate from these concept checks.

Next implementation packet remains the scoped Fieldbook shell and next-action rows, followed by the truthful journey projection. [The full experience plan](HUMANIZED_OPERATING_EXPERIENCE_PLAN.md) retains the corresponding domain boundaries and acceptance work.
