# Humanized Sunset Pulse experience

Updated October 14, 2026 from the user's direction: make the entire process more fluid, visual and human. Source baseline: `4eeb7c4a` on PR #80. This is the product-facing experience packet; the [release readiness plan](SELLER_RELEASE_READINESS_IMPLEMENTATION_PLAN.md) remains the supporting operational packet. The shared platform and domain plans still own their data and authorization.

## Experience direction

The app should make it easy to see who needs attention, understand where a relationship stands, and take one useful next step. People, appointments and reviewed progress become the organizing elements. Forms, activity records and technical diagnostics remain available when relevant.

The main interaction is: **see the person → choose the next step → review the details → act → see the saved result**.

- Start with a small daily focus, then reveal more work on demand.
- Use real names, optional authorized property imagery, initials, meaningful icons and a clear calendar. Never generate a customer's likeness or fabricate an address/photo.
- Use short action labels: “Read reply”, “Prepare consultation”, “Choose a time”, “Review update”.
- Explain consequences beside the action that needs them. Keep exact recipient, amount, publication audience and appointment time visible during review.
- Ask one coherent question at a time; preserve drafts when navigating or recovering from a failed save.
- Offer optional voice and contextual Jamie help. Clicking through should remain a complete path; typing a prompt or using a microphone is never required.
- Keep operator checks in Setup's advanced/operator view. End-user recovery offers an understandable next action without presenting SQL, job leases or environment names.
- Preserve truthful pending, saved, unknown and unavailable states. A smoother screen must not silently imply contact, attendance, delivery, agreement or closing.

## First implemented slice — H1

The current working change updates Today:

- `components/realtor/SellerNextActionCard.tsx`: reusable person card, meaningful action/icon, initials and expandable “Why now”. Existing validated priority IDs determine action labels; unknown kinds fall back to “Open action”. The destination comes from the existing authoritative read/ranking path.
- `components/realtor/SellerPriorityPanel.tsx`: one featured action, three next-up cards, additional loaded actions behind a native disclosure. Existing ranking, limits, missing-data notices, retry deduplication and stale-response fencing remain.
- `components/realtor/SellerDailyPanel.tsx`: weekly counters/campaign evidence under “This week’s progress”; detailed lists and direct scheduling under “All seller activity”. The focused entry appears first.
- Tests preserve exact planner/request navigation, expansion without another request/write, original response scheduling and read-recovery behavior.

This is the first screen slice, not a claim that the entire product has been redesigned. Broader journey and guided-action concepts remain planned below.

October 14 local verification: 20 focused tests across seller priority, daily scheduling/recovery and service boundaries pass; whole-app TypeScript and changed-component lint pass. The actual priority component, rendered with fictional fixture data and generated Tailwind styles, passes desktop/390px layout and native disclosure checks. The separate local-only design preview passes appointment/journey interaction checks without page errors. Screenshots were inspected. This does not establish hosted authenticated acceptance; the existing schema/configuration gates still apply.

The disposable real-auth seller-service suite also passes (214 seconds): responsive owner/client screens, Today priorities, exact-time booking/planner handoff, cancellation/rescheduling, synthetic signed email receipts, contact revocation, milestone correction and site-transfer privacy. Its synthetic accounts and project were removed. Existing acceptance selectors were updated for “Start here” and the new activity disclosure. All six CI jobs and Vercel pass for application candidate `b7578014`; follow-up acceptance/documentation changes have their own check identity.

## H2 — One visual relationship journey

Create `lib/realtor-workspace/sellerJourney.ts`, `components/realtor/SellerJourney.tsx`, and `tests/unit/seller-journey.test.ts`. Modify `SellerCaseWorkspace.tsx` to introduce the journey above its existing controls.

1. Write a pure `deriveSellerJourney(caseResult)` projection over the already-validated `SellerCaseResult`.
2. Distinguish request, conversation, consultation scheduled, consultation held, agreement verified, preparation, listing stages and recorded closing. Keep scheduled and happened separate.
3. Derive completed stages only from current authoritative events/milestones, respecting retraction. Do not infer agreement from checklist completion or closing from a drag action.
4. Return a typed list of `complete`, `current`, `upcoming` and `unavailable` stages plus the next existing action destination.
5. Render a labelled timeline/stepper with icons and dates; use text and shape as well as color. Later stages can be explored without moving the case.
6. Keep corrections available in the event detail, retaining their reason/history. On correction, reuse the existing publication/access invalidation behavior.

Proposed presentation contract:

```ts
type JourneyStep = {
  key: string;
  label: string;
  state: 'complete' | 'current' | 'upcoming' | 'unavailable';
  occurredAt: string | null;
  action: { label: string; href: string } | null;
};
```

The projection accepts validated domain data and returns presentation state. It never writes a milestone. Test retracted agreements, booked-but-not-held consultations, missing data, recorded closing prerequisites and non-linear correction histories.

## H3 — A focused case workspace with guided actions

Create `components/realtor/SellerActionDrawer.tsx`; refactor `SellerCaseWorkspace.tsx` into a journey header and contextual sections. Reuse `ModalSurface` from `components/realtor/ModalSurface.tsx` after confirming its existing exports and focus behavior.

1. Keep the selected person and next action visible. Present concise sections: Conversation, Appointments, Preparation, Documents and Shared progress.
2. Open one action at a time in an accessible drawer/dialog. Restore focus to the action when closed; support Escape and keyboard completion.
3. Use a discriminated presentation state instead of one giant form with mixed message modes:

```ts
type CaseActionView =
  | { kind: 'closed' }
  | { kind: 'reply'; leadId: string }
  | { kind: 'appointment'; bookingId: string }
  | { kind: 'prepare'; leadId: string }
  | { kind: 'share'; leadId: string };
```

4. Move existing save handlers into these focused views while preserving exact `requestKey`, expected revisions, in-flight guards and conflict recovery. Opening a drawer never mutates a case.
5. On uncertain save, retain the same payload/request identity and show “Check saved result” or the existing identical retry; do not create a fresh send attempt.
6. Preserve edited case fields when another action is requested. Offer save/discard/stay with explicit controls; never silently clear a dirty draft.
7. Use saved property references and authorized images when available; otherwise show a labelled neutral placeholder.

Exit: a person can reach the next action without scrolling through unrelated forms, and all existing privacy/replay/conflict tests remain valid.

## H4 — Conversation and appointments that feel natural

Create `SellerConversation.tsx` and `SellerAppointmentStep.tsx`; reuse `SellerLeadScheduleDialog.tsx`, the existing booking-to-planner bridge and message action contracts.

1. Show messages as a chronological conversation with sender/direction, actual time and concise receipt state. Expand long messages and receipt details on demand.
2. Separate “Write a reply” from “Record a conversation that happened”. Provide a local date/time picker with the saved timezone for actual events, then convert to the existing offset-aware contract. Reject invalid/ambiguous times; do not replace an exact timestamp with browser locale parsing.
3. Keep recipient and sender visible while composing. The review step shows the exact frozen message and a clear sending consequence. Changing recipient/content clears review.
4. Show accepted bookings as appointment cards. Use the existing authoritative exact-time handoff; never silently change the booking time.
5. Keep “Schedule”, “Contact recorded”, “Provider accepted”, “Delivered” and “Consultation held” distinct.
6. Replace technical status labels in the normal view with accurate copy such as “Waiting to send” or “Needs your review”; keep receipt evidence available through “Details”.

Test the same reviewed payload, contact revocation, delivery unknown state, saved-time equality, cancellations, lost-response replay and focused keyboard navigation. Real email activation remains a separate operational gate.

## H5 — Setup as a guided welcome

Create `components/realtor/SellerSetupGuide.tsx`; modify `SellerOverviewPanel.tsx` in setup mode and `app/seller-setup/page.tsx`.

1. Reuse the existing validated overview/health API; do not invent another setup store.
2. Present human steps: Your day/timezone → Your seller website → Your reminders → Your first seller request.
3. Derive each step from saved server state, with `ready`, `needs_action` or `unavailable`. No local checkbox can claim successful configuration.
4. Link each step to the existing setup/editor control. Preserve reminder opt-in and user timezone choices.
5. Keep sender/webhook, storage, schema and worker diagnostics under an operator section. Display understandable failure recovery without exposing credentials.
6. When email is disabled, provide the usable manual communication path. A setup wizard must not enable providers, consent or outbound sending implicitly.

Test partial setup, read failure versus empty, successful reread, disabled sending, and 390px keyboard/touch use.

## H6 — Jamie helps in context, with optional voice

Modify the existing personal Jamie handoff/rendering path only after locating its current request/response contracts; reuse `lib/ai/jamiePersonalContract.ts`, `lib/ai/jamiePersonal.server.ts` and existing proposal confirmation surfaces.

1. Place “Help me prepare” beside the selected appointment/case, passing only the current authorized personal scope and source ID.
2. Present a small editable action proposal: person, purpose, proposed time/content and one review action. Keep long explanations collapsed.
3. Preserve the existing distinction between a proposal and a committed action. Confirmation uses the normal planner/case API and server authority checks.
4. Reuse the existing shared `JamieAudioContext` only after verifying its actual path, supported capture/session behavior and private data handling. Require explicit microphone activation and visible stop state.
5. Show a transcript before using it as a proposal; users can edit or dismiss it. Speech never silently approves a recipient, publishes progress, records money or sends a message.
6. Keep all actions usable through clicks and normal controls if voice or AI is unavailable. Do not introduce a new agent runner, polling loop or scheduler.

Exit: context reduces what the person must type, while preserving scoped inputs, editable drafts and explicit consequences.

## H7 — Progress that can be seen

Create `SellerProgressSummary.tsx`; modify `SellerOverviewPanel.tsx`, `SellerPortal.tsx` and the existing weekly-review presentation.

1. Show a small weekly journey: requests → conversations → consultations held → verified agreements → recorded closings. Use exact cohort definitions from the existing funnel.
2. Do not treat opted-in visits as the denominator for all seller requests or infer campaign causation.
3. Provide a visual preview of the exact client publication beside its selected milestones/documents. Internal notes remain outside that preview.
4. Let the owner review/revoke the same whitelist and verified-email access already enforced by the server.
5. Present weekly reflection as a few visual choices with optional notes, preserving the existing weekly-review schema rather than writing a separate analytics ledger.

Exit: the owner and client can understand reviewed progress without reading an operational report; missing data never produces invented progress.

## H8 — Carry the same interaction into the rest of the platform

- **Vibe CMS:** one content/revision preview and one contextual action rail; reuse exact revision review/apply/rollback. Keep technical history behind details.
- **Praxis property work:** person/property context, capture thumbnail and real task/result state. Unknown delivery and unavailable reconstruction remain visible; no decorative animation implies a worker is running.
- **Business/finance:** readable money summaries with a focused correction/payment dialog. Exact amount/date and financial consequences remain explicit.
- **Shared checkpoint inbox:** concise question/approval cards with exact target previews and decisions; reuse the single checkpoint API and durable run engine.
- **Recovery:** short explanations, preserved drafts, one retry/review action and optional details. Technical diagnostics remain available to operators.

Implement these as later surface-specific slices under their existing plans; do not apply a generic visual wrapper that changes domain meaning.

## Scheduling and storage rules throughout

Reuse the existing personal planner, reminder jobs, hourly dispatcher and five-minute worker. A smoother UI does not create another calendar, job queue or notification mechanism. Visual progress is derived from saved records and receipts, not from a client-side checklist.

Do not store screenshots, generated avatars, recurring status snapshots or audio recordings merely to support the visual interface. Use existing authorized media references, initials and transient presentation state. The existing storage budget applies to every actual upload. New server state requires a specific domain need and a matching retention/reconciliation decision.

## Acceptance and build order

1. H1 Today slice: preserve known ranking/navigation, unloaded/error states, bounded expansion, direct scheduling and draft-preserving read recovery. Validate the real rendered component at 390px and desktop.
2. H2–H3 case journey and focused action surface: test truthful stage derivation before rearranging the forms. Verify no mutation on exploration, exact saved writes, dirty drafts, keyboard focus and stale/uncertain saves.
3. H4–H5 conversation, calendar and setup: reuse the already-tested APIs; verify real auth/ownership and accessible mobile flows.
4. H6–H7 contextual Jamie/voice and progress: prove explicit capture/confirmation and exact publication privacy. Keep provider admission separate.
5. H8 extends the approved pattern to CMS, Praxis and business surfaces using their existing release gates.

Success is less required reading and context switching, with the same accurate records. Measure actual clicks, time to find the next action, draft loss, misunderstood status and support friction in the operational pilot; do not invent a usability improvement percentage.

The conversation preview uses fictional sellers and local-only interactions. It explores Daily focus and Seller journey; it is not a screenshot of deployed journey/voice functionality. Next code packet after H1: the pure H2 journey projection and its recorded/scheduled/retracted-state tests.
