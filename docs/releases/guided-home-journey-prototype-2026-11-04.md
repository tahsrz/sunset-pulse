# Guided Home Journey: Local Prototype

The first implementation is a local walkthrough at `/seller-plan/preview`. Visitors choose Sell My Home, Find a Home or Buy and Sell, then move through one question at a time. The existing public seller form has not changed.

This is P0 of [the implementation plan](../guided-home-journey-plan-2026-11-04.md). Answers live only in React memory. Nothing is submitted, subscribed, valued or booked. Refreshing clears the draft. Use fictional contact and property details.

## Run It

From this repository checkout, with the existing dependencies installed:

```powershell
npm run preview:home-journey --workspace apps/pulse
```

The launcher prints a fresh `http://127.0.0.1:<port>/seller-plan/preview` URL. Open that exact URL. It selects a free port, binds only to loopback, and starts Next in development mode with a small allowlist of OS environment variables and dummy backend configuration. It refuses runtime `.env` files in `apps/pulse`; use this isolated checkout instead of moving or deleting another checkout's environment files. No Docker service is needed.

Keep the terminal open while reviewing. Enter `quit` in that terminal to stop its server. The route returns `notFound()` outside development mode and has noindex/nofollow metadata. This is not a hosted preview or an access-control mechanism for other routes.

## Walk Through It

1. Choose **Buy and Sell**, then **Next**. Select **Use a Fictional Sample Home** on the address screen.
2. Confirm the home. Change a fact, move forward and Back, and check the value survives.
3. Choose **Add Home Details** to see the optional property questions. Choose **None** after selecting an improvement to check that the choices are exclusive. Each question also permits **Not Sure**. Starting again and choosing **Leave These for Later** skips this group.
4. Answer the mortgage question **Yes** to reveal an approximate balance. Enter plain dollars such as `250000` or choose **Not Sure**. Zero is distinct from unknown. This does not calculate equity or eligibility.
5. Continue through the buying questions. Pre-approval **Yes** reveals its amount question. At review, edit pre-approval to **Not Yet**; the amount disappears and is cleared. Editing it back to **Yes** requires a fresh amount or explicit **Not Sure** before returning to review.
6. Continue to contact with an example name and `taylor@example.test`. Response permission is separate from optional marketing. Neither choice sends anything here.
7. Open **Preview Controls**, choose **Show Loading, Then an Error**, and press **Preview My Request**. The disabled button reads **Loading…** during the deliberate simulation. Answers survive the error. Choose **Show Loading, Then Complete** to try recovery. Normal question navigation is immediate.
8. Refresh or use **Reset Preview** to clear the draft. Try **Find a Home** to see the shorter buyer path without seller property questions. **Sell My Home** leaves out the buyer questions.
9. On a phone, choices remain full-width and the footer retains Back/Next. On entry, labels wrap below the illustration. Reduced motion shows them immediately. Ordinary edits do not replay their reveal.

Completion explicitly says no request was sent and links to the current seller form or existing Explorer. Following those links leaves the fixture walkthrough. The map is a labelled placeholder and the home is an original SVG illustration. Approved photography and the existing map integration belong to the later public integration.

## Code Map

| File under `apps/pulse` | Responsibility |
| --- | --- |
| `lib/marketing/guidedJourney.ts` | Typed answers, conditional steps, bounded facts, integer-cent parsing, hidden-answer cleanup, validation and review projection |
| `components/lead-capture/journey/GuidedJourneyPrototype.tsx` | In-memory controller, property/facts/questions, review editing, contact and deliberate loading/error controls |
| `components/lead-capture/journey/GuidedJourneyShell.tsx` | Property context, section progress, heading focus and Back/Next footer |
| `components/lead-capture/journey/JourneyChoiceGroup.tsx` | Native radio group with separate accessible names and descriptions |
| `components/lead-capture/journey/GuidedJourney.module.css` | Scoped sans-serif italic headings, responsive layout, focus and reduced motion |
| `components/marketing/SequentialPhotoLabels.tsx` and `.module.css` | Stable decorative labels, 180/320/460ms delays, 240ms reveal, static narrow-screen chips |
| `app/seller-plan/preview/page.tsx` | Development-only fixture entry |
| `lib/navigation/focusedSurfaces.ts` | Reuses the lightweight/minimal root layout for this exact path, avoiding unrelated branding/database providers |
| `scripts/guided-journey-preview*.mjs` | Isolated launcher and real-browser acceptance walkthrough |

No dependency, API, schema, storage bucket, queue, cron or provider was added. The newer seller form in the feature stack was not replaced with the older main-based form. Integration must carry this presentation onto the reviewed feature base.

## Verification

Completed locally on November 4, 2026:

- **32 unit tests pass** across the model, form, development gate and label component. Coverage includes hidden-answer cleanup, unknown versus zero, amount parsing, optional consent, required review-edit children, loading recovery and timer cleanup.
- **Scoped TypeScript passes** for the new model/components/route/tests and focused navigation helper. This is not a full-project typecheck.
- **Scoped ESLint passes** for those TypeScript files; both scripts pass Node's syntax check.
- **Browser acceptance passes** for all three modes, optional details, review edits, 390px layout, reduced motion and 720px CSS reflow equivalent to 200% on the 1440px desktop viewport.
- The browser recorded **zero page exceptions, zero application API requests and zero write requests**. The fixture route returned HTTP 200 with the isolated configuration.
- Figure captures sample the actual CSS animation at 280/450/720ms, showing one/two/three visible labels. A separate normal-flow assertion checks no reveal replay during question rerenders.

Run browser acceptance while the owned launcher is running, substituting its printed origin:

```powershell
npm run test:home-journey:preview --workspace apps/pulse -- http://127.0.0.1:PORT
```

The check blocks external HTTP requests. Gitignored evidence under `apps/pulse/.pulse-local/guided-journey/` includes `result.json`, `dev.log`, `server-signals.json`, desktop/mobile/review screenshots and three label captures. Test answers are fictional; the result file records aggregate checks only.

Run the unit tests with:

```powershell
npm run test:unit --workspace apps/pulse -- tests/unit/guided-journey.test.ts tests/unit/guided-journey-form.test.tsx tests/unit/guided-journey-preview.test.tsx tests/unit/sequential-photo-labels.test.tsx
npm run typecheck:home-journey --workspace apps/pulse
```

No production build, hosted acceptance, real submission, booking or deployment was performed for this local-only slice. Required release checks still apply before public integration.

Repository conventions checklist:

1. Worker routing phrases: not applicable; no worker changes.
2. Relay provenance/modes: not applicable; no relay changes.
3. Operator route guards: not applicable; no operator routes added. The fixture's development-only gate and exact lightweight path pass unit checks.
4. Ledger disable flags/paths: not applicable; no application ledger writes. Launcher evidence uses gitignored `.pulse-local` paths.
5. API Zod bounds: not applicable; no API contract added. Draft numeric bounds and choice values pass model tests; persisted validation remains a later gate.
6. Test environment restoration: passes; route tests restore environment mocks, form tests clean globals and pending timers.
7. Redacted Langfuse observations: not applicable; no tracing changes or personal-data observations added.

## Next Integration Slice

1. Select the reviewed seller-feature base and preserve its request identity, duplicate protection, consent, receipt and consultation capability. Keep the current public entry until integration passes.
2. Implement the plan's strict version 3 contract and privacy projection in the existing intake. Test v2 replay compatibility and changed-answer fingerprints before real writes. Never route the financial group through the legacy lead logger.
3. Connect the seller path to the existing save/receipt and consultation picker. Reuse availability, reservations and reminder claims. No second calendar or background job is needed.
4. Keep buyer persistence gated until its owner reader and two-owner isolation work. The current policy/RPC/planner select `source = 'seller_plan'`; adding a new source alone is insufficient.
5. Carry approved request context into the existing seller inbox, Today and case progress. Keep financing out of public/client-shared publication. Use Explorer for buyer browsing and the configured map provider for optional address context.

Public rollout remains separate from this interaction review and from the pending security release dependencies.
