# Guided Buying and Selling Journey

Status: ready for the first interaction prototype, November 4, 2026. The broader persistence/buyer rollout remains a working draft as references and integration checks continue. This document records visible behavior separately from proposed Sunset Pulse behavior. Sections 9–18 specify code changes, contracts, algorithms, animation, infrastructure reuse and delivery checks. Code fences are implementation specifications, not code already added to the application. No application change, provider setup, submission, migration, deployment or new PR is part of this planning delivery.

Confirmed preferences: the owner likes the small labels appearing one by one around photos, and reported that Next becomes Loading… during pending navigation. The other supplied layouts, questions, programs and marketing content are ideas for exploration. The detailed branches and contracts below are concrete implementation proposals for review, not approval to ship every reference question, financing feature or page section.

Planning branch starts at PR #103 commit `9b811213`. Product integration references were also read from feature-stack commit `042057e1` (`codex/profile-role-release-preflight`). Some scheduler and Daily focus files below exist only in that feature stack. Choose the integrated implementation base after reviewing its dependencies; do not overwrite the existing three-step form with the older main version. The installed dependencies in this worktree still match main; no application was started or dependencies changed for this plan.

## 1. Evidence Received

Use the screenshots as interaction references. Their displayed property address, personal answers, provider branding and artwork are not website content or approved Sunset Pulse test fixtures. Use fictional data in prototypes and tests.

| Area | Visible evidence | Proposed adaptation |
| --- | --- | --- |
| Overview | Persistent navigation for overview, search, selling, mortgage, checklist and financials; a contact panel; a benefits explanation and Get Started action | A client workspace linked to the selected home and its next action. Keep a visible human contact. Determine the final sections after the remaining dashboard screens arrive. |
| Address | One field, address suggestions, an explanation of the expected result | A focused address step with manual entry when suggestions are unavailable. State that Sunset Pulse prepares an agent-reviewed plan unless a real valuation service is separately verified. |
| Property confirmation | Map, persistent address, Edit Address action, progress strip and fixed navigation | Keep property context throughout the form. Map failure must not prevent address confirmation. |
| Home facts | Editable bedrooms, full/half baths, stories, year and area; some values already shown | Prefill only from a known authorized source and let the seller correct it. The screenshots do not establish where Orchard's prefill comes from. Unknown is not zero. |
| Transitions | Short introduction screens between property facts and personal questions | Use a short section explanation where it helps. Repeated images of a transition are not evidence of additional steps. |
| Improvements | Kitchen cabinets, primary bath, hard flooring, paint, lighting, None | Propose multi-select with None exclusive; selection semantics are not established by the screenshot alone. |
| Kitchen | Separate countertop, appliance and flooring questions with large choices | Small single-select steps, with Other and Not Sure kept distinct in stored answers. Proposed wording/options remain editable. |
| Other features | Garage count, pool type/access | Garage zero is a real answer; preserve 4+ as a category. Separate a private pool from community access. |
| Condition | Foundation history/concerns and a separate overall-condition question with short explanations | Store owner-reported observations as unverified input for agent review. No answer asserts a professional inspection or creates a pricing adjustment automatically. |
| Relationship | Owner, Agent, Other | Use for question routing and staff context only. An answer never proves ownership, grants a role or changes authorization. |
| Referral | Builder referral Yes/No | Add only if Sunset Pulse has a relevant verified referral process. This is not necessary just because Orchard asks it. |
| Selling timing | Next 3 months, 3–6, 6–12, 12+, no fixed timeline | Keep distinct intent in the new contract. Existing timing values differ and need an explicit compatibility mapping. |
| Selling preference | List, buy before selling, cash offer, explore options | Record a preference. Display actual supported services; do not imply that Sunset Pulse supplies cash offers or bridge financing without that capability. |
| Current mortgage | Yes/No/unknown and approximate balance with unknown path | Optional planning information. Propose showing balance only for Yes; unknown is not a zero balance. Do not request loan account numbers or documents in this intake. |
| Buying stage | Exploring, searching, found a home, under contract, not buying | Derive relevant follow-up questions and next actions; seller-only users skip buyer questions. |
| Buying location/type | Within DFW; new construction, resale, either | Use the location answer to ask useful destination details, not to reject a seller automatically. Buying preference should later carry into Explorer only when a matching filter exists. |
| Representation | Signed agent agreement Yes/No | Record self-reported representation for a human follow-up. It is not an agreement with Sunset Pulse and triggers no automatic reassignment or outreach. |
| Pre-approval | Yes/No and a separate approximate approved amount screen | Propose amount only for Yes, with Not Sure/Skip. One screenshot has No selected and another shows the amount question; their order does not prove Orchard's branch behavior. |
| Pending button | Owner reports Next changes to Loading… while the transition waits | Preserve this visible pending state for real asynchronous work. No artificial delay or implied successful save. |

Still unseen: contact/consent screen, final review, actual submitted result or valuation, subsequent appointment flow, return/resume behavior, later dashboard state, buyer-only onboarding and errors. Do not invent these as observed Orchard behavior.

## 2. Intended Sunset Pulse Experience

Use one shared journey with Sell, Buy and Both branches. The branch chooser and buyer-only flow are proposals, pending the remaining reference material and an audit of current buyer intake. Keep the current `/seller-plan` route as the initial selling entry; do not silently relabel seller records as buyer requests.

Proposed selling sequence:

`Address → Confirm Home → Home Facts → Home Details → Your Move → Review → Contact/Consent → Request Saved → Consultation/Workspace`

Home Details contains improvements, kitchen, garage, pool and condition. Your Move contains relationship, timing, relevant selling preferences and any buying/financing context. Group progress by these meaningful sections while showing one focused question at a time. The eventual number of question screens depends on applicable branches.

Keep a short route available for someone who wants a conversation now. Optional detail questions can be completed later. Test this against the full reference flow before deciding which details are required. Give short factual explanations instead of congratulations after every answer. Use Sunset Pulse's existing sans-serif italic heading conventions and its own visual language; body copy remains upright. No new Georgia fallback or unrelated page-wide font override.

After a successful save, the selected property and relevant answers should appear in the owner's existing workspace and the client's existing permitted journey. Use the existing Today/Daily focus, preparation, journey and client-sharing machinery. New answers must not become client-published content automatically.

## 3. Navigation and Loading Contract

- Keep the property context, content width and Back/Next locations stable. Reserve footer space and respect phone safe areas, zoom and the keyboard. The reference images include narrower captures, not proof of physical-device behavior.
- Use semantic radio groups for one choice, checkboxes for multiple choices, and labelled numeric inputs. A selected border must also have programmatic selected/checked state. Provide visible keyboard focus.
- Local Next validates and advances immediately. Do not make a network request solely to manufacture a loading state for every answer.
- A real address lookup or final save uses `Next → Loading…`, a stable-width button, disabled repeat submission and an accessible busy/status announcement. Final request saving may use the more specific `Saving…`; settle that label in the prototype.
- Advance only when the relevant operation succeeds. On failure keep the current answers and screen, show an inline error and restore the action. Ignore obsolete address responses after an edit or Back action.
- Back restores answers. Changing a branching answer clears inapplicable dependent fields from the final payload. Do not clear unrelated completed sections.
- Progress represents applicable steps/sections only. No fabricated valuation progress, unmeasured percentage or automatic completion of skipped financial questions.
- Move keyboard focus to the new question after navigation. Avoid slide animations for reduced-motion users.

Proposed state model:

```ts
type NavigationState =
  | { status: 'idle' }
  | { status: 'validating' }
  | { status: 'loading'; operation: 'address_lookup' | 'request_save' }
  | { status: 'error'; operation: 'address_lookup' | 'request_save'; message: string };

// deriveSteps(draft) returns applicable stable IDs, not positional page numbers.
// validateStep(stepId, draft) gates Next.
// normalizeDraft(draft) strips answers excluded by the current branches.
// serializeRequest(draft) includes only validated, reviewed contract fields.
```

Keep the current synchronous submission ref guard and stable request identity during uncertain delivery. A repeated identical save uses the same ID. Editing material answers creates a new fingerprint/ID. A successful save must not be duplicated by a failed consultation request.

## 4. Data and Persistence Changes Requiring Implementation Review

The current `SellerPlanRequestForm.tsx` and privacy copy intentionally exclude street addresses. `leadMagnetContract.ts` is strict and accepts offer version 2 with seller-plan/pricing-review kinds. Address, property, buyer and mortgage fields cannot be added only in the browser or hidden in free text.

1. Define a bounded version 3 contract while preserving valid version 2 requests and their existing response behavior. Keep current attribution sanitization and separate requested-contact versus optional marketing consent.
2. Model typed `property`, `movePreferences` and optional `financingContext` groups. Use bounded strings/enums, validated coordinates and numeric ranges. Missing/unknown/skipped are distinct from zero or No. Monetary values use a reviewed numeric representation, never a formatted currency string or floating-point calculation as financial authority.
3. Keep provider-suggested facts separate from seller-confirmed answers. A selected place/address does not establish title ownership, role or tenant identity.
4. Add the normalized version 3 fields to the server's request fingerprint. Store only approved bounded data on the existing tenant-resolved lead; inspect existing metadata size/permissions before selecting its exact shape. No new table, cloud bucket or migration is assumed.
5. Revise privacy copy before collecting an address or financial context. Keep raw addresses, balances, contact data and booking capabilities out of URLs, analytics and provider-error logs. Do not copy private intake fields into marketing attribution, messages, Jamie context or client sharing by default.
6. Initial anonymous prototype state stays in memory. Do not promise save/resume across reloads or persist addresses/balances in localStorage by default. Cross-device resume requires an authenticated owner-scoped reader/writer and explicit retention decisions. Do not add an anonymous lead-ID recovery endpoint.
7. Bound retained structured metadata; do not save each click, map response or image. Reuse existing retention/scheduling infrastructure if later needed. No new cron or continuous polling.
8. Treat financing and cash/bridge choices as requests for discussion. No valuation, equity estimate, underwriting, eligibility approval or confirmed appointment is fabricated from answers.

## 5. Existing Code and Proposed Files

Paths below are relative to `apps/pulse/`. New paths are proposals, not implemented files.

| Path | Planned responsibility |
| --- | --- |
| `app/seller-plan/page.tsx` (existing) | Keep the existing entry and surrounding seller context; introduce the guided experience after prototype review. |
| `components/lead-capture/SellerPlanRequestForm.tsx` (existing) | Integrate the wizard without losing the feature stack's contact consent, request identity, focus behavior, saved receipt and consultation offer. |
| `components/lead-capture/journey/GuidedJourneyShell.tsx` (new) | Shared property header, one question region, section progress, fixed responsive navigation, focus and reduced-motion behavior. |
| `components/lead-capture/journey/JourneyChoiceGroup.tsx` (new) | Radio/checkbox choice rows, selected/disabled/focus states and optional explanations. |
| `components/lead-capture/journey/AddressStep.tsx` (new) | Suggestions/manual entry, stale lookup cancellation and address confirmation. |
| `components/lead-capture/journey/HomeFactsStep.tsx` (new) | Editable known facts with numeric bounds, zero/unknown distinction and provenance. |
| `lib/marketing/guidedJourney.ts` (new) | Stable step IDs, branch derivation, validation, normalization and review summary. Separate this from React effects. |
| `lib/marketing/guidedJourneySchema.ts` (new) | Bounded draft/domain shapes and version 3 property/move/financing groups. |
| `lib/marketing/leadMagnetContract.ts` (existing) | Versioned submission schema and version 2 compatibility; deliberate timing/kind mappings. |
| `app/api/lead-magnets/route.ts` (existing) | Keep existing body/admission limits, server-controlled tenant resolution and saved/replayed/error semantics while validating the new request version. |
| `lib/marketing/sellerLeadIntake.server.ts` (existing) | Normalize and fingerprint the whole approved payload, persist bounded structured answers and preserve saved identity/idempotency. |
| `components/lead-capture/SellerConsultationPicker.tsx`, `lib/scheduling/sellerConsultationContract.ts` (feature stack) | Reuse saved-lead capability, authoritative slot/reservation states, expiry/retry/recovery and existing reminder cancellation. Do not create another scheduler. |
| `components/realtor/SellerJourney.tsx`, `lib/realtor-workspace/sellerJourney.ts`, `app/today/page.tsx` (feature stack) | Show only applicable next actions from the existing saved request; preserve planned versus held distinctions and owner/client publication boundaries. |
| Buyer intake/Explorer adapter (location to confirm) | Audit actual buyer contracts and supported search filters before defining a buyer writer or promising a preference transfer. |
| `tests/unit/guided-journey.test.ts` (new), existing seller intake/form tests | Cover branching, Back preservation, omitted hidden fields, unknown/zero, version compatibility, failed save and idempotent retry. |

Address lookup is not already solved by the existing geocoding helper. `lib/core/geospatial/geotagUtils.ts` performs a forward lookup with a 30-day cache and raw-address logging; it is not an autocomplete component and should not be plugged into private anonymous drafts unchanged. Confirm configured provider/access/usage first. Prototype manual entry and a placeholder map; later reuse the existing Explorer/Mapbox presentation where appropriate. A map is optional to completing the step. No new paid provider is provisioned by this plan.

## 6. Proposed Delivery Order

1. Finish the reference inventory as more images arrive. Record selected states, Next pending behavior, branch results and the final receipt. Keep observed behavior separate from proposed improvements.
2. Build a local interaction prototype using fictional fixture data. Cover address confirmation, facts, choice questions and Back/Next/Loading/error states, without hosted writes or simulated valuations presented as real.
3. Review desktop and narrow layouts. Check the existing heading/font rules and the number of questions actually needed. Freeze initial required/optional questions only after that review.
4. Implement/test the pure step model and versioned contracts. Preserve version 2 behavior, normalize hidden fields and include all material data in duplicate-request fingerprints.
5. Connect one seller path to existing intake and saved receipt, then to the existing consultation capability. Verify no extra lead on retry, reservation failure or Back navigation. No calendar activation is inferred.
6. Map authorized saved data into the existing Daily focus/journey/preparation views. Keep private mortgage/representation answers outside client publication unless explicitly selected and permitted.
7. Complete buyer/Both paths after the actual buyer persistence and search contracts are identified. Show combined buy/sell milestones without inventing dependent financing services.
8. Run local end-to-end acceptance with generated accounts/backends and no messages. Hosted mutation verification remains separate: production and preview share Supabase, and security PRs #102/#103 are release dependencies. Do not wait on pending CI to continue independent source/prototype work; do not bypass required checks for release.

## 7. Acceptance Checks

- The selected property stays attached through Next, Back, review, saved receipt and consultation.
- Manual address entry and missing lookup/map data still allow progress with honest status.
- Renovation None is exclusive. Radio choices are keyboard accessible. Unknown is never serialized as zero.
- No mortgage balance for No/unknown; no pre-approved amount for No/unknown; no buyer-only questions for not buying. Changing earlier answers removes stale dependent data.
- The observed No-preapproval/amount image sequence is reviewed explicitly; do not reproduce a possible branch mismatch by accident.
- Next becomes Loading… for actual pending work; double-click/Enter cannot advance or save twice. Failure restores control without losing answers. Labels do not claim a save that has not happened.
- Review allows editing a section and returning without replaying all prior questions.
- Contact/marketing choices stay separate. Existing tenant identity, authorization and saved-lead capability restrictions survive the new UI.
- Version 2 callers remain valid; version 3 is bounded and strict; retries preserve identity; a saved request survives unavailable booking.
- At phone width/zoom/keyboard/reduced-motion settings, the footer does not cover answers or errors and new-question focus is predictable.
- No account/role changes, image uploads, new storage collection, background polling or cron is introduced to implement this form.

## 8. Next Reference Material to Incorporate

Contact/consent, review, final result, post-submit dashboard and appointment states remain open. Also document whether clicking a choice advances automatically, what Back retains, whether closing/reopening resumes, and when the reported Loading… label appears. Keep these as observations to gather while the owner continues their walkthrough, not reasons to submit another real application or complete a financial transaction.

## 9. Exact Domain Types and Branch Rules

Create `lib/marketing/guidedJourney.ts`. Keep question answers as draft values until validated. Do not coerce a missing numeric field to zero with `Number('')`.

```ts
export type Answer<T> =
  | { state: 'unanswered' }
  | { state: 'unknown' }
  | { state: 'skipped' }
  | { state: 'answered'; value: T };

export type JourneyMode = 'sell' | 'buy' | 'both';
export type BuyingStage = 'exploring' | 'searching' | 'found_home' | 'under_contract' | 'not_buying';
export type Renovation = 'kitchen_cabinets' | 'primary_bath' | 'hard_flooring' | 'interior_paint' | 'lighting';
export type SellingWindow = 'within_3_months' | '3_to_6_months' | '6_to_12_months' | 'after_12_months' | 'not_set';
export type AddressDraft = {
  line1: string; unit: string; city: string; region: string; postalCode: string;
  coordinates?: { latitude: number; longitude: number };
  entryMethod: 'manual' | 'suggestion';
  confirmed: boolean;
};
export type GuidedJourneyDraft = {
  mode: JourneyMode;
  address: AddressDraft;
  facts: {
    bedrooms: Answer<number>; fullBaths: Answer<number>; halfBaths: Answer<number>;
    stories: Answer<number>; yearBuilt: Answer<number>; squareFeet: Answer<number>;
  };
  renovations: Answer<Renovation[]>; // [] means explicitly None, not unknown.
  countertop: Answer<'granite' | 'tile' | 'solid_surface' | 'quartz' | 'laminate' | 'other'>;
  appliances: Answer<'stainless' | 'black' | 'white' | 'mixed' | 'other'>;
  kitchenFloor: Answer<'tile' | 'laminate' | 'carpet' | 'hardwood' | 'mixed' | 'concrete' | 'other'>;
  garage: Answer<'0' | '1' | '2' | '3' | '4_plus'>;
  pool: Answer<'in_ground' | 'above_ground' | 'community' | 'none'>;
  foundation: Answer<'no_known_issues' | 'past_repairs' | 'possible_repairs'>;
  overallCondition: Answer<'ready' | 'normal_wear' | 'repairs' | 'major_repairs'>;
  relationship: Answer<'owner' | 'agent' | 'other'>;
  sellingWindow: Answer<SellingWindow>;
  sellingPreference: Answer<'list' | 'discuss_buy_before_sell' | 'discuss_cash_offer' | 'explore'>;
  mortgage: Answer<boolean>; mortgageBalanceCents: Answer<number>;
  buyingStage: Answer<BuyingStage>;
  destinationInDfw: Answer<boolean>;
  constructionPreference: Answer<'new' | 'resale' | 'either'>;
  represented: Answer<boolean>;
  preApproved: Answer<boolean>; preApprovedAmountCents: Answer<number>;
  contact: { name: string; email: string; requestedContact: boolean; marketingOptIn: boolean };
};
```

Create `createInitialJourneyDraft(mode)` explicitly populating every answer as unanswered and every contact field empty/false. Do not initialize the visual radio groups to an unchosen answer. Keep builder referral out of the first contract until an actual Sunset Pulse referral requirement is confirmed. Add source provenance for fetched facts in a separate display-only lookup object; the prototype starts with none.

Implement/export these helpers in the same pure module:

```ts
export const answered = <T>(value: Answer<T>): T | undefined =>
  value.state === 'answered' ? value.value : undefined;

export function includesBuying(draft: GuidedJourneyDraft): boolean {
  return draft.mode === 'buy' ||
    (draft.mode === 'both' && answered(draft.buyingStage) !== 'not_buying');
}

export function normalizeDraft(input: GuidedJourneyDraft): GuidedJourneyDraft {
  const draft = structuredClone(input);
  if (draft.mode === 'buy') {
    draft.mortgage = { state: 'unanswered' };
    draft.mortgageBalanceCents = { state: 'unanswered' };
  }
  if (answered(draft.mortgage) !== true) draft.mortgageBalanceCents = { state: 'unanswered' };
  if (!includesBuying(draft)) {
    draft.destinationInDfw = { state: 'unanswered' };
    draft.constructionPreference = { state: 'unanswered' };
    draft.represented = { state: 'unanswered' };
    draft.preApproved = { state: 'unanswered' };
    draft.preApprovedAmountCents = { state: 'unanswered' };
  }
  if (answered(draft.preApproved) !== true) draft.preApprovedAmountCents = { state: 'unanswered' };
  if (draft.renovations.state === 'answered') {
    draft.renovations.value = [...new Set(draft.renovations.value)].sort();
  }
  return draft;
}
```

`normalizeDraft` clears dependent data only, not unrelated Back history. The serializer additionally omits every seller-only group when mode is buy; local drafts may retain non-financial seller answers while a person compares modes, but they never enter a buyer submission. Never restore a cleared mortgage/pre-approval amount automatically after toggling the parent back to Yes.

Define `StepId` as a literal union matching these stable names and implement `deriveSteps(draft): StepId[]` in this order:

| Condition | Step IDs to append |
| --- | --- |
| All journeys | `intent` |
| Mode sell or both | `address`, `confirm-home`, `home-facts`, `renovations`, `countertop`, `appliances`, `kitchen-floor`, `garage`, `pool`, `foundation`, `overall-condition`, `relationship`, `selling-window`, `selling-preference`, `mortgage` |
| Mortgage is answered true and mode is not buy | `mortgage-balance` |
| Mode both | `buying-stage` |
| Mode buy | `buying-stage` (without the not-buying choice) |
| `includesBuying(draft)` | `destination`, `construction`, `representation`, `pre-approval` |
| Includes buying and pre-approval is answered true | `pre-approval-amount` |
| All journeys | `review`, `contact` |

The shell reads actual enabled IDs from this function. Do not keep a second hardcoded numeric progress index. For a step removed by an edit, choose the nearest earlier enabled step and focus its heading. `reviewReturnTo` lets Edit return directly to review after validation. Optional Home Details can be marked skipped as a group; skip actions are explicit, not fake answers.

Implement `validateStep(stepId, draft): { valid: true } | { valid: false; field: string; message: string }` with a switch over every StepId. Address requires manual/suggested structured fields plus explicit confirmation at confirm-home. Required choice steps must be answered, unknown or explicitly skipped according to the reviewed question policy. Contact requires the existing valid name/email and requestedContact true, never marketingOptIn true. Freeze the optional-question policy in one `stepPolicy` record after reference review; do not scatter it across JSX.

## 10. Exact Zod Schemas and Request Versions

Target the feature stack's existing Zod 4 integration; this plan adds no dependency migration. Create `lib/marketing/guidedJourneySchema.ts`. The following reusable schemas define the wire boundary; derive complete groups from the domain fields in section 9, not permissive `Record<string, unknown>` blobs.

```ts
import { z } from 'zod';

export const moneyCentsSchema = z.number().int().min(0).max(10_000_000_000);
export const addressSchema = z.object({
  line1: z.string().trim().min(1).max(180),
  unit: z.string().trim().max(40),
  city: z.string().trim().min(1).max(100),
  region: z.string().trim().regex(/^[A-Z]{2}$/),
  postalCode: z.string().trim().regex(/^\d{5}(?:-\d{4})?$/),
  coordinates: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
  }).strict().optional(),
  entryMethod: z.enum(['manual', 'suggestion']),
  confirmed: z.literal(true),
}).strict();

// An explicit unknown/skip is retained in submission; unanswered is not allowed
// for included required fields. This factory is for wire answers only.
export function wireAnswer<T extends z.ZodType>(value: T) {
  return z.discriminatedUnion('state', [
    z.object({ state: z.literal('answered'), value }).strict(),
    z.object({ state: z.literal('unknown') }).strict(),
    z.object({ state: z.literal('skipped') }).strict(),
  ]);
}

export const homeFactsSchema = z.object({
  bedrooms: wireAnswer(z.number().int().min(0).max(30)),
  fullBaths: wireAnswer(z.number().int().min(0).max(30)),
  halfBaths: wireAnswer(z.number().int().min(0).max(30)),
  stories: wireAnswer(z.number().int().min(1).max(100)),
  yearBuilt: wireAnswer(z.number().int().min(1600).max(2200)),
  squareFeet: wireAnswer(z.number().int().min(1).max(1_000_000)),
}).strict();
```

These are initial form/abuse bounds, not property eligibility rules. Also validate an answered year against the current calendar year plus two, using an injected `now` in tests. Unsupported property types need a human contact path rather than silently reducing their values.

Define three strict `guidedJourneySubmissionSchema` variants discriminated by mode:

- `sell`: address, homeFacts, homeDetails, relationship, sellingWindow, sellingPreference and optional currentMortgage. No buying or pre-approval group allowed.
- `both`: the seller groups plus buyingStage. Include buyerPreferences only when not-buying is not selected; include optional preApproval within that group.
- `buy`: buyerPreferences and buyingStage only. No existing-home address, seller condition or current-mortgage group allowed.

For financial groups, use a second discriminated union: `{state:'yes', amount: wireAnswer(moneyCentsSchema)}`, `{state:'no'}`, `{state:'unknown'}`, `{state:'skipped'}`. `superRefine` requires/removes groups consistently with the branch rules. Server rejects hidden extra groups even if a malicious caller bypasses client normalization. Freeze the exact group schemas before implementation commit P1.

In `leadMagnetContract.ts`, extract the current fields into `sellerPlanLeadV2Schema` without changing validation. Add a strict version 3 schema using the same top-level contact, consent, attribution, requestKind and coarse timing fields, plus the sell/both journey variant. Export:

```ts
export const sellerPlanLeadSchema = z.discriminatedUnion('offerVersion', [
  sellerPlanLeadV2Schema,
  sellerPlanLeadV3Schema,
]);
export type SellerPlanLeadInput = z.infer<typeof sellerPlanLeadSchema>;
```

Keep the existing top-level timing vocabulary for downstream compatibility. `toLegacyTiming(window)` maps within_3_months to one-to-three-months, 3_to_6 to three-to-six-months, 6_to_12 and after_12 to later, and not_set to exploring. Preserve the precise selected window in `journey.sellingWindow`; do not discard it after mapping. The existing separate within-30-days choice stays valid for v2 callers and can be retained in the new UI if desired.

The complete UTF-8 JSON body must remain at most **12,000 bytes**, matching the current streamed reader. Limit serialized journey data to **6,000 bytes** within that envelope. Use `TextEncoder` for bytes, not JS string length. Enforce on the server before persistence; never enlarge limits merely to fit raw provider responses. No freeform loan documents, place-provider payloads, image blobs or chat history enter these schemas.

## 11. Button, Choice and Form Implementation

`GuidedJourneyShell.tsx` takes typed step/section information and children. It owns no fetch, database identity or request fingerprint. The controller in `SellerPlanRequestForm.tsx` owns draft, step and request state. Reuse the existing heading ref/focus behavior and synchronous `submitting` ref.

```tsx
type FooterProps = {
  busy: boolean; canContinue: boolean; isFinal: boolean;
  onBack(): void; onNext(): void;
};

function JourneyFooter(props: FooterProps) {
  const label = props.busy ? 'Loading…' : props.isFinal ? 'Send My Request' : 'Next';
  return <footer className="journey-footer">
    <button type="button" onClick={props.onBack} disabled={props.busy}>Back</button>
    <button type="button" onClick={props.onNext}
      disabled={props.busy || !props.canContinue} aria-busy={props.busy}
      className="journey-next">{label}</button>
  </footer>;
}
```

This footer lives inside the existing form. Its form `onSubmit` must call the same `advance()` handler so Enter and click have identical validation/duplicate protection. Do not let Enter implicitly bypass the current step and save the whole request.

`advance()` does: reject if the synchronous busy ref is set; validate current step; display/focus field error if invalid; advance local steps immediately; call `submitRequest()` only on contact. An address suggestion lookup has its own cancellable state and never writes a lead. Use a monotonically increasing lookup sequence plus AbortController; only the latest response may update suggestions/coordinates. A failed lookup retains manual entry.

For every choice row, render a label wrapping an actual radio/checkbox, not a click-only div. Use a unique useId-based group ID, `fieldset`/`legend`, `checked`, `onChange` and `aria-describedby` for explanations. For renovations, selecting None writes `answered([])` and clears other selections; selecting a renovation replaces None. Put the None state in this reducer/helper, not a separate boolean that can contradict the array.

Create `GuidedJourney.module.css` alongside the shell. Set the content to `width:min(100% - 2rem, 36rem)`, make choice targets at least 48px tall, keep the action button at a stable minimum width, reserve bottom padding for the footer, and include `env(safe-area-inset-bottom)`. Use a normal document layout when the viewport/keyboard leaves too little space for fixed navigation. Use the existing heading token/class; never add `font-family: Georgia`. Under reduced motion disable transition animations. Verify at 390px, 1440px and 200% zoom before fixing exact tokens.

## 12. Serialization, Duplicate Requests and Persistence

Create `lib/marketing/guidedJourneyRequest.ts`. Export `serializeSellerJourney(draft, attribution): Omit<SellerPlanLeadV3Input, 'submissionId'>` and `buildClientFingerprint(inputWithoutSubmissionId): string`. The serializer reads only the normalized allowed branches and parses a dedicated version 3 payload schema excluding submissionId. Once the attempt ID is assigned, parse the complete request schema before sending. It never copies arbitrary draft keys into metadata.

In `SellerPlanRequestForm.tsx`, keep one attempt in a ref:

```ts
type PendingAttempt = { fingerprint: string; submissionId: string };
const pendingAttempt = useRef<PendingAttempt | null>(null);
const saving = useRef(false);

async function submitRequest() {
  if (saving.current) return;
  const payload = serializeSellerJourney(draft, readSanitizedAttribution());
  const fingerprint = buildClientFingerprint(payload);
  if (pendingAttempt.current?.fingerprint !== fingerprint) {
    pendingAttempt.current = { fingerprint, submissionId: crypto.randomUUID() };
  }
  saving.current = true;
  setNavigation({ status: 'loading', operation: 'request_save' });
  try {
    const response = await fetch('/api/lead-magnets', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, cache: 'no-store',
      body: JSON.stringify({ ...payload, submissionId: pendingAttempt.current.submissionId }),
    });
    const receipt = await readSellerReceipt(response);
    setReceipt(receipt); // Only a validated accepted receipt is success.
    pendingAttempt.current = null;
  } catch {
    // Keep answers and attempt ID: delivery may have completed before timeout.
    setNavigation({ status: 'error', operation: 'request_save', message: 'We could not confirm your request. Please try again.' });
  } finally {
    saving.current = false;
  }
}
```

The snippet assumes `serializeSellerJourney` returns payload excluding submissionId and `readSellerReceipt` throws on invalid/non-success core receipts. Define the receipt parser in `guidedJourneyRequest.ts`: accepted success requires `success:true` and `accepted:true`; duplicate is optional boolean. Validate bookingOffer independently with the existing sellerBookingOfferSchema; a malformed or absent optional offer leaves a valid saved receipt successful and booking unavailable. It must not cause another lead save. Keep the honeypot behavior unchanged on the server. Store success separately from navigation, and render success only from that receipt. Add a bounded timeout/unmount cleanup without clearing pending identity on uncertain failure. Do not print payloads or response bodies to the console.

In `sellerLeadIntake.server.ts`:

1. Extract the existing v2 fingerprint construction into `buildSellerLeadFingerprintFields` without changing its field order, normalization or old hashes.
2. For v3 only, append normalized validated `journey`. Canonicalize set-like renovation arrays before hashing on both client and server. Changed financial/property answers must change the fingerprint; changed object key order must not.
3. Keep `idempotencyKey = sha256(agentId + ':' + configuredSite + ':' + submissionId)` and the unique index already used by this intake.
4. Store the new groups at `metadata.sellerPlan.journey`, with offerVersion 3. Keep current requestedContact and marketingOptIn timestamps at their existing paths. Do not place address/balance into the generic message, logs or campaign.
5. Preserve server-controlled site/agent/funnel fields and identity verification after insert. Use the same saved/replayed/conflict/unavailable union and no browser-supplied agent ID.
6. Preserve v2 replay hashes exactly. For v3 a matching retry returns the existing saved identity; a reused ID with changed content returns conflict. Never return another person's identity by email lookup.

In `app/api/lead-magnets/route.ts`, retain current host/origin, content-type, streamed byte limit, distributed admission limit, honeypot and no-store response behavior. Route the parsed v2/v3 union to the same writer. Responses remain:

| Outcome | Status/body |
| --- | --- |
| Saved | 201, existing accepted response plus optional validated bookingOffer |
| Replayed | 200, existing accepted response with duplicate true |
| Reused ID with different normalized payload | 409, existing conflict response |
| Invalid/oversized payload | 400/413 before persistence |
| Configuration/storage unavailable | 503, no claimed successful save |

Do not remint a booking capability merely because a replay response lacks one. Keep that existing behavior until a separately authorized recovery design is implemented. The saved-request receipt remains valid when booking is unavailable or expires.

## 13. Exact Workspace and Buyer Integration

Create `lib/sites/sellerJourneyIntakeContext.ts` with `readSellerJourneyIntake(lead): OwnerJourneyIntake | null`. It reads only valid metadata.sellerPlan v3 data and returns null for v2/invalid data. Call it only after the existing owner-authorized lead fetch. Keep `readSellerLeadContext`'s consent/coarse timing projection intact; do not append every private intake answer to it.

Add an owner-only `SellerIntakeSummary.tsx` under `components/realtor/`. It presents confirmed versus unknown home facts and move priorities. Keep mortgage/approval amounts collapsed or absent by default and outside client-shared update payloads, notification text and Jamie prompts. Use the existing seller inbox/case reader; no new anonymous read endpoint. Completing intake does not complete a showing, consultation or listing milestone: `deriveSellerJourney` still uses recorded evidence only.

Reuse `SellerConsultationPicker` unchanged initially. Pass only the server-returned `offer` after accepted save. The new UI must not reconstruct a capability, bypass expiry, turn a tour preference into a confirmed booking, or schedule reminders independently. Existing availability/reservation APIs and reminder jobs own this work.

The buyer path needs its own explicit delivery rather than posting buyer fields to a seller-only writer:

| New/updated file | Exact responsibility |
| --- | --- |
| `lib/marketing/buyerJourneyContract.ts` (new) | Strict version 1 buyer request: offerKey `sunset-pulse-buyer-plan`, submissionId, name/email, requestedContact true, marketingOptIn boolean, sanitized campaign and the buy-only journey variant. No seller-plan requestKind, existing-home address or seller booking offer. |
| `app/api/buyer-requests/route.ts` (new) | Use the same bounded public admission pattern, server-configured agent/site mapping and no-store receipt; no arbitrary destination/agent fields. Body limit 12,000 bytes. Proposed configuration: `BUYER_REQUEST_AGENT_SITE`, validated as the existing bounded site slug and resolved through getTenantSite. Return 503 if absent/inactive. Do not infer it from KCD or silently use a seller account. |
| `lib/marketing/buyerJourneyIntake.server.ts` (new) | Reuse the reviewed server-resolved/idempotent `agent_site_leads` persistence pattern with source `buyer_request` and metadata.buyerJourney. Inspect source constraints, owner-reader allowlists and permissions before this commit; do not route through Mongo intelligence processing by default. Same-ID retries/conflicts must be tested. |
| `lib/sites/buyerJourneyIntakeContext.ts` (new) | Typed owner-only buyer projection and explicit requested-contact rules, not a call to canContactSeller. No automatic buyer outreach. |
| `lib/buyer-workspace/buyerJourney.ts` (new) | Pure buyer milestone presentation using actual saved/tour/offer/contract evidence. Self-reported searching or pre-approval is not a booked tour or accepted offer. Do not reuse seller milestones with renamed labels. |

`components/LeadCaptureForm.tsx` and `/api/leads` are a separate existing property-inquiry path. The inspected component logs raw watched/submitted fields, and its API performs intelligence processing plus Mongo persistence. Do not send the new private financing/address groups there. If that form is touched during later unification, remove its payload diagnostics and verify consent, bounds, ownership and idempotency first. Preserve its current published property-inquiry contract during the initial guided seller delivery.

Buyer reader prerequisite confirmed from source: `20261007100000_seller_lead_actions.sql` replaces the earlier broad role policy with an owner policy explicitly restricted to `source = 'seller_plan'`. Its `seller_lead_list_owned` RPC has the same source restriction. The existing seller planner source reader in `store.server.ts` also filters seller_plan. Inserting buyer_request alone will not create a usable buyer workspace. P5 must include an explicit owner-scoped buyer reader with source/site/actor validation and consent rules, plus two-owner isolation tests. Do not widen the seller policy/RPC to every source or disguise buyers as seller_plan. A separately reviewed database change may be required for authenticated direct reads/RPCs; no such migration is assumed or part of the initial prototype/seller delivery. Existing source TEXT accepts new labels, but that is not evidence of reader/permission compatibility.

Buyer-only booking is not implemented by calling `createSellerBookingOffer`: that authority is explicitly scoped to saved seller leads. Connect tours to the existing scheduler only after its buyer/listing resource authority is reviewed. Until then, a buyer receipt is a saved request, not a reserved appointment. Search preference transfer requires an explicit allowlisted mapping to the actual Explorer filter schema; unsupported preferences remain staff notes, not invented query parameters.

## 14. Test Files and Required Cases

| File | Required assertions |
| --- | --- |
| `tests/unit/guided-journey.test.ts` | Exact seller/buyer/both step order; not-buying skips buyer questions; mortgage No/unknown clears balance; pre-approval No clears amount; changing back to Yes does not resurrect it; None versus unknown renovations; Back and Edit-to-review preserve unrelated fields. |
| `tests/unit/guided-journey-schema.test.ts` | Strict variant/group keys, invalid coordinates, money integers/ranges, zero versus missing, set canonicalization, current-year bound, no seller financial group in buyer-only input, UTF-8 multibyte size at 6,000/12,000 byte boundaries. |
| `tests/unit/guided-journey-form.test.tsx` | Keyboard choices, Enter behavior, local advance without fetch, button width/state, delayed fetch shows Loading…, double click sends once, failed fetch keeps values, latest address response wins, focus/error recovery and consent. |
| Existing `seller-plan-lead-route.test.ts` | Keep all v2 fixtures; add v3 saved/replayed/conflict, changed nested answer fingerprint, storage/config failure, body limits, honeypot no-write, arbitrary tenant/role rejection, no private response/log leakage and booking unavailable after successful save. |
| Existing `seller-plan-request-form.test.tsx` | Keep the valid legacy short-path behavior or explicitly update only the reviewed new entry; retain its consent and saved-request/booking tests. |
| `tests/unit/seller-journey-intake-context.test.ts` (new) | Invalid metadata rejected, v2 returns no v3 details, contact grants unchanged, only requested owner projection fields exposed; no mutation of milestones. |
| `tests/unit/buyer-journey-intake.test.ts` (new, buyer delivery) | Buyer configuration/ownership, source contract, retries/conflicts, consent and no seller capability issuance. |
| Existing generated real-auth runner | Add opt-in guided-intake acceptance after unit/API work: fictional seller, buyer and both paths; one saved request after uncertain retry; hidden fields absent from stored/returned data; booking remains independent; cleanup owns all resources. |

Concrete regression example to add when domain types exist:

```ts
it('clears an amount when pre-approval changes to No', () => {
  const draft = createValidBothJourneyFixture();
  draft.buyingStage = { state: 'answered', value: 'searching' };
  draft.preApproved = { state: 'answered', value: true };
  draft.preApprovedAmountCents = { state: 'answered', value: 45_000_000 };
  draft.preApproved = { state: 'answered', value: false };
  const next = normalizeDraft(draft);
  expect(deriveSteps(next)).not.toContain('pre-approval-amount');
  expect(next.preApprovedAmountCents).toEqual({ state: 'unanswered' });
  expect(serializeBuyerContext(next).preApproval).toEqual({ state: 'no' });
});
```

Add `createValidBothJourneyFixture` in `tests/fixtures/guidedJourneyFixture.ts` during P1 with fictional, fully valid required answers; this lets the regression exercise serialization rather than fail on unrelated missing fields. `serializeBuyerContext` is the shared buy-preferences serializer used by both the sell+buy and buyer-only request serializers. Test the server separately with a forged hidden amount so client cleanup is not the only protection.

## 15. Commit-by-Commit Work Order

| Commit | Files/action | Done when |
| --- | --- | --- |
| P0: reference and fixture prototype | Shell, choice group, address/facts screens with fictional in-memory state; no public route or server writer change | Owner can inspect screenshots/clickthrough and approve question grouping/style; loading/error states are labelled as prototype behavior. |
| P1: pure domain/contracts | guidedJourney, guidedJourneySchema, guidedJourneyRequest plus pure tests; add v2/v3 compatibility | Every branch normalization rule is tested; wire groups and timing mapping are frozen. |
| P2: seller frontend | Existing SellerPlanRequestForm and focused new components; optional detail path and review editing | Consent, Back, Enter, busy/error and request identity tests pass without changing public persistence yet. |
| P3: seller save integration | Existing lead-magnets route/writer, owner projection and route regressions | One bounded request persists with correct server identity; old v2 replay hashes and response contract are preserved; private fields stay private. |
| P4: scheduling/workspace | Existing saved receipt/picker and owner inbox/case view | Saved request survives absent/expired booking and no extra reminder infrastructure is introduced. |
| P5: buyer delivery | Dedicated buyer contract/route/writer/projection; existing property inquiry remains separate | Audited source/permissions and real buyer ownership/consent/idempotency tests pass; no seller capability is issued. |
| P6: integrated verification | Generated local accounts/backends, optimized build, phone/desktop/reduced-motion review | Actual UI→API→storage→receipt works, duplicate/uncertain paths are exercised and fixtures are removed. Hosted rollout remains separate. |

Do not implement P3 against the older main seller file just because it is currently installed: first choose the reviewed integrated feature base. Keep security PRs #102/#103 separate and do not pull the whole feature stack into either security diff.

## 16. Open Decisions With Bounded Defaults

The missing final/contact/dashboard screenshots may change presentation and question order. They do not postpone the concrete schema/branch design above. Initial defaults for prototype review: one focused question, Next rather than auto-advance, explicit optional detail skip, no exact valuation promise, manual address support, in-memory draft only, and no photo/document uploads. Any service eligibility, financing partner, provider setup or persistent resume feature requires its own verified contract before activation. These remain proposed implementation instructions, not a report that application code has been built or tested.

## 17. Specific Visual Preference: Labels Appearing One by One

The owner specifically likes the small labels that pop into place around the property and people photos. The other homepage sections in this reference batch remain optional inspiration. Keep this motion detail as a separate small prototype so it can be reviewed without committing to a homepage redesign or the entire questionnaire.

### Files and Integration

1. Add `components/marketing/SequentialPhotoLabels.tsx` and `SequentialPhotoLabels.module.css`.
2. Add a fixture-only example around a photo slot in the local prototype. The eventual integration candidate is the existing `components/marketing/SellerAcquisitionHero.tsx`; first confirm an approved main-site photo. Do not borrow KCD-only contact/media approvals or competitor artwork for the main seller hero.
3. Keep positioning anchors separate from the animated label element. Animate opacity and transform only, once per mount, with stable keys. No continuous floating, looping offers, timers, map/backend requests or animation package is needed.
4. Proposed timing: first label after 180ms, following labels 140ms apart, each reveal 240ms. These values are prototype parameters, not inferred Orchard timing.
5. A label may describe a real service such as Pricing Review or Home Preparation. Actual prices, offer counts, appointments or completed milestones must come from approved evidence. Do not animate invented offers or fake live progress.
6. Labels are decorative duplicates of nearby readable service text. They use aria-hidden, no live region, no keyboard focus and no interaction. If a label becomes the only source of important information, give that information an ordinary accessible text representation before shipping.

Proposed server-renderable component; no useEffect or client runtime is required for an above-the-fold one-time reveal:

```tsx
import styles from './SequentialPhotoLabels.module.css';

type PhotoLabel = {
  id: string;
  text: string;
  anchor: 'upperRight' | 'middleLeft' | 'lowerRight';
};

export default function SequentialPhotoLabels({ labels }: { labels: readonly PhotoLabel[] }) {
  return <div className={styles.labels} aria-hidden="true">
    {labels.map((label, index) => <span key={label.id}
      className={`${styles.anchor} ${styles[label.anchor]}`}>
      <span className={styles.label} style={{ animationDelay: `${180 + index * 140}ms` }}>
        {label.text}
      </span>
    </span>)}
  </div>;
}
```

Use a reviewed static list with at most three unique anchors and short labels. Validate CMS-sourced labels against the existing content publication contract if this later becomes editable; never render arbitrary submitted intake answers here. Keep photo dimensions/aspect ratio reserved before it loads. The photo can be clipped in its own inner wrapper, while the label overlay's outer wrapper remains unclipped.

```css
.labels { position: absolute; inset: 0; pointer-events: none; }
.anchor { position: absolute; max-width: 12rem; }
.upperRight { top: 10%; right: 0; }
.middleLeft { top: 42%; left: 0; }
.lowerRight { bottom: 6%; right: 5%; }
.label {
  display: block;
  padding: .5rem .75rem;
  border: 1px solid currentColor;
  border-radius: .6rem;
  background: var(--photo-label-background, #effaf8);
  color: var(--photo-label-color, #123b36);
  font: inherit;
  line-height: 1.25;
  animation: label-in 240ms cubic-bezier(.2, .8, .2, 1) both;
}
@keyframes label-in {
  from { opacity: 0; transform: translateY(6px) scale(.96); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
@media (prefers-reduced-motion: reduce) {
  .label { animation: none; opacity: 1; transform: none; }
}
@media (max-width: 40rem) {
  .labels { position: static; display: flex; flex-wrap: wrap; gap: .5rem; margin-top: .75rem; }
  .anchor { position: static; }
}
```

The narrow layout puts labels under the photo so they cannot cover a face, form input or CTA. Do not key the photo/overlay by current form answers: normal rerenders should not replay the reveal. If the pattern is later reused below the fold, add one scoped IntersectionObserver with disconnect-on-trigger/unmount; no scroll polling or per-label observer. That later variant should be tested independently rather than increasing the initial component's behavior.

### Prototype Checks

- In a local browser, capture three moments showing labels 1, 2 and 3 becoming visible in order, then the stable final composition.
- At reduced motion, all labels are immediately in place. With JavaScript unavailable, CSS still works and primary service text stays readable.
- At 390px and 200% zoom, labels wrap beneath the photo with no horizontal overflow or overlap with Next/Get Started.
- A routine parent rerender does not restart the sequence. There is no autoplay loop or new network request.
- Keep label text, imagery and claims original to Sunset Pulse. Retain the user's existing sans-serif/italic heading preferences; this reference does not reintroduce Orchard's serif typography.

Add `tests/unit/sequential-photo-labels.test.tsx` when implementing: stable ordering/keys, expected delay props, no controls/live region and no rendering of extra unapproved data. Use a browser for actual animation and reduced-motion verification rather than asserting animation timing with unit-test sleeps. Planning alone runs no application tests.

## 18. Planning Exit and Infrastructure Reuse Decisions

Planning is complete for P0 and the interaction contract. Start a clickable local prototype next. More general brainstorming is not needed before seeing and testing the flow. Persisted version 3 intake and buyer/financial features still have explicit integration gates; prototype readiness is not production readiness.

### Reuse Map Verified Against Source

| Need | Existing implementation to reuse | Smallest extension |
| --- | --- | --- |
| Main seller entry | `SellerAcquisitionHero.tsx` → `/seller-plan#request` | Keep the route/link and existing campaign handling; add the new question presentation within that entry. No second seller landing funnel. |
| Questions and request state | Feature-stack `SellerPlanRequestForm.tsx` | Keep consent, focus, request identity, successful receipt and bookingOffer handling. Extract a presentation shell and pure step model rather than replacing the submission stack. |
| Save/retry | `saveSellerPlanLead` → `agent_site_leads`, existing unique idempotency key | Add versioned bounded structured answers and corresponding fingerprint coverage. No duplicate CRM, intake table or per-step write log. |
| Owner identity/read permission | `seller_lead_list_owned`, `requirePersonalRealtorWorkspace`, active `site_config.owner_id` mapping | Reuse the authenticated owner reader. Parse the v3 projection at this boundary; do not create a public address/lead lookup. |
| Owner next action | Existing `deriveNextBestAction`, seller inbox and `/today` | Add relevant context to the current lead/case presentation. Do not add a second dashboard or a new task-generation service. |
| Consultation | `createSellerBookingOffer`, `SellerConsultationPicker`, existing availability/reservation handlers | Pass the saved receipt's capability unchanged. Preserve uncertain/conflict/expired states and the original request receipt. |
| Reminder/cancellation | Existing scheduler claims and realtor reminder infrastructure | Reuse the reservation/reminder lifecycle; no added cron, queue, provider or polling loop. |
| Client progress | `readClientProgress` → `seller_client_progress`; existing publication/sharing controls | Render the existing approved publication. Do not expose raw lead metadata or private financing answers to make the screen look complete. |
| Preparation/documents | Existing seller case checklist/documents/actions and `deriveSellerJourney` | Carry the saved property/request into the existing case. Collect documents only in the established authorized workflow, not in initial public intake. |
| Buyer browsing | `/explorer`, `ExplorerContent`, `listingDiscoveryInputSchema` | Reuse map/list/recovery; initially link to Explorer. Only send supported, explicitly selected search criteria. Do not add a second map/search engine. |
| Photo-label reveal | Existing hero slot and CSS modules | One small server-renderable overlay plus CSS; no animation service/library or backend dependency. |

### First Prototype: Exact Scope

1. Keep the prototype private/local and clearly separate from the active public seller route until review. Use an isolated fixture view rather than changing production flags or infrastructure.
2. Implement the pure draft/step helpers, shared shell, choice group, facts controls, simple review editing, and the sequential labels. Use fictional data and manual address entry; a map slot may remain a neutral placeholder.
3. Include Sell, Buy and Both at entry. Selling shows the screenshot-inspired property flow; Both exposes relevant buying context; Buy links the user into existing Explorer and demonstrates preference questions in memory. No buyer record is persisted in P0.
4. Required prototype checks: the same property context survives Back/Next; choice changes are visible; financial child questions hide/clear correctly; Enter/click cannot double-advance; the footer works at phone width; and reduced-motion labels are immediately present.
5. Preview the existing name/email/contact-consent structure and existing saved-request language. Missing Orchard contact/result screenshots are not a blocker because these Sunset Pulse contracts already exist. A fixture submission is explicitly labelled a demo and is never presented as a real saved request or valuation.
6. Demonstrate Loading… and failure only through a clearly identified prototype control. In the eventual live flow, ordinary local question changes remain immediate; only real lookup/save work triggers pending state.
7. Produce desktop/narrow screenshots and a clickable walkthrough. Review question count, optional detail placement, navigation, and label motion before expanding persisted data collection.

Do not wait for approved photography to test form navigation: use a neutral reserved photo slot and original service labels in P0. Approved property/person imagery is required before public visual integration, not before interaction review. Keep the current sans-serif italic heading tokens throughout.

### Decisions Closed for the Prototype

- Reuse the current seller entry, intake, receipt, scheduler and workspace; build the new presentation around them.
- Use one focused question with explicit Next. Preserve answers on Back and keep the property header visible.
- Keep the staggered photo labels; other referenced marketing sections remain optional.
- Use optional detail/Not Sure paths so a visitor can still request a conversation without completing every property or financial question.
- Keep unsupported cash-offer/financing services out of active promises. No calculated offer or financial eligibility result is required to make this flow useful.
- Use in-memory prototype state, no uploads, no new cloud collection and no new scheduled jobs.

### Gates Before Real Data Integration

| Gate | Required evidence |
| --- | --- |
| Implementation base | Choose the reviewed integrated feature snapshot; preserve the existing scheduler and sharing fixes. Do not copy old main files over the newer form. |
| Version 3 intake | Complete exact strict groups, privacy copy, normalization, v2 replay compatibility, byte bounds and owner-only projection tests before writing new personal/financial fields. |
| Buyer persistence | Explicit owner reader/access contract and consent-aware next actions. Prove two-owner isolation; review any required migration separately. Reusing the table does not remove this work. |
| Maps/suggestions | Confirm configured provider/usage and safe address handling. Manual entry remains available, so this does not hold the form prototype hostage. |
| Client return/resume | Use authenticated owner/client access and approved publication boundaries. Do not promise anonymous cross-device recovery. |
| Hosted release | Review security dependencies #102/#103, shared-production migration/deployment state, configured authority and required checks. Local prototype approval alone does not activate a calendar or release a data contract. |

Next action: implement P0 and evaluate the actual interaction. Update this plan only for concrete observations from that walkthrough, newly supplied reference screens or a verified integration constraint.
