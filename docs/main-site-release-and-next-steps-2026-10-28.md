# Sunset Pulse: Next Release Implementation Plan

Prepared October 28, 2026. Status: implementation in progress. Unmarked deliveries below remain proposed work.

Implementation progress: group A is implemented on `codex/marketing-admin-drafts`, based on PR #87 at `740757ed`. The marketing endpoint now checks global access, validates its read response, and refuses filesystem publication. The editor exports validated local drafts. Eighteen focused route/schema/editor checks, focused ESLint, and a scoped TypeScript check pass. Full build and deployed browser review are pending. See [marketing admin release evidence](./releases/marketing-admin-drafts-2026-10-28.md).

Group B is implemented in [PR #89](https://github.com/tahsrz/sunset-pulse/pull/89), stacked on [PR #88](https://github.com/tahsrz/sunset-pulse/pull/88). Zod resolves to 4.6.7 throughout the installed dependency tree, the production audit reports zero vulnerabilities, and full TypeScript and focused lint pass. Existing identifier acceptance, optional-field omission, record values, coercion, and consent behavior are covered by migration checks. The public lead endpoint now has a streamed 128 KiB limit and bounded tags. The broad unit run and filesystem-only recovery are recorded in the [Zod migration evidence](./releases/zod4-contract-migration-2026-10-28.md).

Groups C/D/E are implemented in [PR #90](https://github.com/tahsrz/sunset-pulse/pull/90), stacked on #89. Explorer now validates public response shapes, cancels stale requests, distinguishes unavailable data from empty results, and keeps a usable listing list outside the map boundary. Missing coordinates do not break markers. Bounded public GeoJSON replaces the synthetic-metric worker. Map and chunk retry, control/listener cleanup, and current navigation callbacks have focused regression coverage. Sixty-six tests across seven suites passed that delivery. See [Explorer release evidence and manual acceptance](./releases/explorer-recovery-2026-10-28.md). The [production follow-up](./releases/production-explorer-acceptance-2026-10-28.md) verifies the optimized build and actual Mapbox rendering and fixes a reproduced CSP failure in optional routing. The original hosted exception remains unattributed, and deployed acceptance remains open.

Group F's readiness tooling (section 4A) is implemented on `codex/publication-readiness`, stacked on #90. The protected read-only report and `/admin/marketing/readiness` distinguish required content, optional media, expired evidence and unavailable sources using the existing publication gates. Fifty-five focused tests pass. See [readiness release evidence and operator directions](./releases/publication-readiness-2026-10-28.md). Sections 4B/4C remain in progress: the existing seller identity and email have been found and prefilled, while the source location of the existing biography and neighborhood assets is still being resolved. No new content was published.

Group G is implemented in PRs #92 and #93 using the selected internal scheduler. PR #94 applies Daily focus to the existing Today workspace. The follow-up `codex/consultation-auth-acceptance` verifies real local password/cookie sessions, public intake, reservation replay, conflict, cancellation and reminder cleanup using disposable Supabase and Mongo. It also repairs missing server read grants, a dependency on an absent optional tenant column and loopback origin normalization. See [real-auth acceptance and migration directions](./releases/consultation-real-auth-acceptance-2026-10-28.md). Production activation and deployed acceptance remain open.

Group H's owner/client sharing path now has real local browser acceptance on `codex/seller-sharing-pilot`, stacked on #95. Two separately authenticated accounts exercise exact preview, draft preservation, renewed approval after editing, explicit publication, separate access confirmation and revocation. The client receives only selected publication fields; private notes, conversations and unselected document links remain absent. See the [sharing pilot directions and evidence](./releases/seller-sharing-pilot-2026-10-28.md). The follow-up below covers the preparation, journey and setup slices.

Group H's automated preparation, journey and setup walkthrough is completed on `codex/seller-journey-setup-acceptance`, stacked on #96. It verifies explicit draft decisions, saved notes, planned versus held appointments with local-date evidence, forward-only next actions, owner/no-site setup, saved reminder preferences and failed-read recovery. The development warning was traced to closed-dock Jamie history loading; that read now waits for Jamie to be visible. Two generated Next handler type errors were repaired. See [journey/setup evidence and remaining work](./releases/seller-journey-setup-2026-10-28.md). Legacy cloud chat history still needs its own schema, account-storage and retention review; no new chat storage was added. Production verification follows below; human/device and deployed review remain separate.

The next release-verification delivery, `codex/production-explorer-acceptance`, is stacked on #97. The optimized production build passes with mock mode disabled. Actual Mapbox tests cover coordinate navigation, polygon search/clear, layers and failure/retry under the unchanged production CSP; homepage and KCD layouts and the KCD property photo pass at 390px/1440px. A legacy routing template evaluation failure is isolated from the map with an external-directions recovery path. The six fixture Explorer regressions and 69 focused tests pass. See [production acceptance, reproduction and scope](./releases/production-explorer-acceptance-2026-10-28.md). Current-build resource measurements are a baseline, not a measured improvement over a previous build. Repeated Atlas/worker lifecycle measurements, approved publication content, deployed acceptance and physical-device review remain open.

This plan follows the homepage and seller-experience work in PR #87. It replaces the old execution queue for deciding what to build next; the October 19 specification remains useful background. Work is sequential, by one agent. Pending CI is not a reason to wait before doing independent source work. Do not use subagents.

## Starting Point and Delivery Order

PR #87's last inspected head is `740757ed8149c55ead0c671389d5ffcb31596114`. The local branch is older and contains uncommitted work. The first implementation task is to reconcile that difference, preserving the local edits. Do not publish entire local files over newer PR files without comparing their content first.

The homepage composition, three-step seller request, sample seller plan, neighborhood presentation contracts, optional Atlas launcher, seller journey, and preparation editor already exist. This plan finishes their release gaps and then adds the next useful capabilities.

| Order | Delivery | Result | Dependency |
| --- | --- | --- | --- |
| 0 | Checkout and release evidence | One trustworthy source snapshot | None |
| 1 | Marketing administration controls | Authorized, truthful content editing behavior | Current source snapshot |
| 2 | Zod 4 migration | Patched validation dependency with preserved application contracts | Current source snapshot |
| 3 | Explorer reliability and map accuracy | Recoverable map failures, accurate listing data, no invented yields | Error capture for the crash-specific fix; other work can proceed |
| 4 | Content publication workflow | Reviewed seller identity and one complete neighborhood guide | Approved content only for publication |
| 5 | Seller consultation availability | Real slots and reliable reservation through the existing scheduler | Confirmed calendar/reservation authority |
| 6 | Seller pilot and release evidence | Verified owner/client workflow and measured usability | Disposable accounts and isolated database |

Keep release repairs narrowly scoped. Open subsequent product PRs from current main after their prerequisites merge, or explicitly record a stacked dependency. Do not add another large product feature to PR #87 merely because it remains open.

## 0. Reconcile the Checkout

1. Record local HEAD, the remote PR head, changed files, and applicable repository instructions.
2. Save a patch and copies of untracked authored files outside the working changes. Do not discard or automatically stash unrelated work.
3. Fetch the PR branch in a writable checkout. If this checkout's Git metadata remains unwritable, use an attached managed worktree from the verified remote commit. Check existing attachments before creating one.
4. Compare the existing local FAQ, configuration, and documentation edits against the PR versions. Many are already represented in PR #87; apply only missing changes.
5. Normalize new GitHub-bound text to LF before committing. Prefer normal local Git commits from the synchronized checkout. If the connector/API is necessary, preserve the exact current parent and compare the resulting PR diff.
6. Record the latest completed check results against their commit. Leave pending checks alone. A previously green commit does not validate the current head.

Deliverable: `docs/releases/pr-87-release-evidence.md`, containing commit, routes reviewed, completed results, unresolved defects, and deployment mapping. Keep tokens, private customer information, and temporary preview-bypass URLs out of this file.

## 1. Make Marketing Administration Safe and Honest

### Observed code

`apps/pulse/app/api/admin/marketing/route.ts` reads a repository JSON file and writes it with `fs.writeFileSync`. The handler itself has no authorization or payload validation. The admin page treats an HTTP success as a saved configuration. This is a source finding; deployed access behavior still needs verification against the current branch and hosting configuration. A deployment filesystem write is also not a durable publishing mechanism.

### Implementation

| File | Change |
| --- | --- |
| `app/api/admin/marketing/route.ts` | Require existing route authorization; enforce the actual global marketing permission; remove filesystem mutation |
| `app/admin/marketing/page.tsx` | Replace misleading save success with a reviewed draft export or the existing authorized CMS revision flow, after confirming it supports this resource |
| `lib/marketing/marketingCopySchema.ts` (new) | Strict schema matching the actual existing JSON keys and limits |
| `lib/marketing/marketingCopy.server.ts` (new) | Load and validate the repository file on the server |
| `tests/unit/admin-marketing-route.test.ts` (new) | Anonymous, wrong-role, allowed-role, and mutation-disabled cases |

Start by searching all `/api/admin/marketing` consumers. If public rendering needs part of the config, expose a deliberate public projection rather than making an admin response public. Inventory the actual roles in `lib/core/operator_access` before choosing the global permission; `requireOperatorRouteAccess` alone must not grant every realtor global-site editing privileges.

Proposed handler shape, after that permission mapping is established:

```ts
export async function GET(request: NextRequest) {
  const access = await requireOperatorRouteAccess(request);
  if (isAuthResponse(access)) return access;
  // Enforce the existing global-marketing permission here.
  return NextResponse.json(loadMarketingCopy(), {
    headers: { 'Cache-Control': 'private, no-store' },
  });
}

export async function POST(request: NextRequest) {
  const access = await requireOperatorRouteAccess(request);
  if (isAuthResponse(access)) return access;
  // Apply the same global permission before returning resource details.
  return NextResponse.json({
    code: 'MARKETING_PUBLISH_UNAVAILABLE',
    message: 'Publish this change through a reviewed content revision.',
  }, { status: 409 });
}
```

For the first delivery, make repository-backed fields read-only and support a local draft export after validation. Use ordinary labels such as “Marketing Content,” “Download Draft,” and “Draft downloaded.” Downloading must not say the live site was updated. Do not introduce a new Supabase content table to replace this route during the repair.

Completion: anonymous and unauthorized callers cannot access privileged configuration or mutate it; authorized users can inspect it; a UI action never claims a durable publication that did not occur.

## 2. Migrate Zod Without Changing Saved Contracts

### Scope and branch

Use a dedicated `codex/zod4-contract-migration` branch after step 0. The known audit finding covers Zod below 4.6.6. Recheck the current upstream advisory and registry before selecting the patched Zod 4 release. Keep the existing Next.js and DOMPurify patch updates. Do not suppress the advisory, lower the audit threshold, or switch to `zod/v3` merely to make the package audit green. The v3 compatibility subpath is not evidence that the affected parsing behavior is fixed.

The earlier direct upgrade produced specific compiler errors in records, coercion, consent messages, form inputs, and a safe-parse type guard. Resolve those as an intentional migration, not by adding `any` or casting the failures away.

### Commit 1: Lock the contract behavior

Extend existing schema tests for seller intake, public listings, scheduling, invitations, financial events, and publication. Record accepted input, rejected input, normalized output, and HTTP error behavior. Use synthetic records. Include omitted fields, `null`, empty strings, coercion, defaults, unknown keys, enum records, dates, and maximum collections. Do not snapshot unstable error prose as the only assertion.

### Commit 2: Dependencies and explicit record keys

Change `apps/pulse/package.json` to the selected patched Zod 4 range. Regenerate the root lockfile from the current branch's lockfile. Inspect all installed Zod copies; update compatible transitive consumers and use a justified override only after inspecting their supported API. Keep the diff limited to the dependency and its required integration changes.

Change every one-argument `z.record(value)` to an explicit key schema, preserving existing map semantics:

```ts
// app/api/admin/prompts/route.ts
abidanPrompts: z.record(z.string(), z.string().max(40_000)).default({}),
modelMatrix: z.record(z.string(), z.string().max(200)).default({}),
operationalSettings: z.record(
  z.string(),
  z.union([z.string().max(200), z.number(), z.boolean()]),
).default({}),
```

Also inspect `app/api/admin/profit/outcomes/credit/route.ts`, listing-intake routes, `lib/agent-workspace/attentionDecisionSchema.ts`, `lib/platform/contracts/appManifest.ts`, `lib/profit/*`, and seller lead/service contracts. Enumerate usages with a syntax-aware search. Enum-key records need separate review because exhaustiveness behavior may change; use `z.partialRecord` only where the old contract actually permits missing keys.

### Commit 3: Coercion, forms, and parsing results

In `lib/data/listingDiscovery.ts`, let the helper accept numeric-output schemas whose input is unknown:

```ts
function optionalNumber<T extends z.ZodType<number, unknown>>(schema: T) {
  return z.preprocess(
    value => value === '' || value === null ? undefined : value,
    schema.optional(),
  );
}
```

Verify query types still permit omitted numeric filters. Keep `z.input` for unparsed form/query input and `z.output` for validated values. In `components/LeadCaptureForm.tsx`, make the form/resolver input and output generics explicit; use parsed output in submission logic. Do not compare an unknown coerced input directly with a number.

In `app/api/sms/opt-in/route.ts`, migrate the custom consent error while retaining literal-true consent:

```ts
consent: z.literal(true, { error: 'SMS consent is required.' }),
```

In `lib/sites/launchKit.ts`, replace the removed `z.SafeParseSuccess` annotation with control-flow narrowing, retaining the existing invalid-record handling:

```ts
const validEvents: LaunchKitProvisioningAuditEvent[] = [];
for (const raw of rawEvents) {
  const result = launchKitProvisioningAuditEventSchema.safeParse(raw);
  if (result.success) validEvents.push(result.data);
}
```

The names in this snippet are proposed; wire them to the actual schema and source collection. Search for `.errors`, `errorMap`, `ZodEffects`, `.default`, `.catch`, `.transform`, discriminated unions, and JSON-schema conversion. A successful compile does not establish equivalent validation. Review whether `zod-to-json-schema` is used directly; remove an unused direct dependency only after checking scripts and downstream imports. If a conversion is used, migrate that integration deliberately and compare its generated schema.

### Commit 4: Bound work before validation

Inspect public JSON routes for actual byte limits and bounded collections. Add domain-specific `.max()` limits where missing and reject oversized request bodies before parsing. Do not rely only on `Content-Length`, which can be absent or incorrect; reuse the repository's existing bounded-body reader where available. Bound nested record key counts and depth where the route accepts arbitrary structured data. Keep error output bounded.

Completion: the production audit clears, no vulnerable nested Zod copy remains, TypeScript and the relevant contract suites pass, and representative API fixtures preserve their documented behavior. Resolve local typecheck heap failure separately from a type error. Use a suitable supported Node runtime and a bounded larger heap if the machine supports it; do not ship a memory-setting workaround as the security fix.

## 3. Repair Explorer and Remove Invented Map Metrics

### Separate the crash from source hardening

The hosted Explorer has shown a client exception after initial rendering, but its stack is not yet captured. Do not name a cause until a trace identifies it. In parallel, the checked-in worker contains confirmed accuracy problems: a `5.42` yield fallback, rent-derived mock property values, and a made-up rent equal to 0.5% of a valuation. `mapLayers.ts` weights a heatmap with a synthetic `trend` field. These are independent, actionable source findings.

### 3A. Capture a minimal incident

Record deployed commit, route without sensitive query values, browser, first exception stack, failing chunk/network request, and whether the worker or map emits an error. Prefer local reproduction from the synchronized branch; use the approved preview if the issue is deployment-specific. Existing protected-preview authorization is already provided. Check the corresponding map token's public configuration and allowed origins without exposing it. Server logs alone cannot establish the cause of a client exception.

Add no new analytics table or continuous browser recording. Keep incident evidence local and temporary. The actual crash fix must cite the captured cause in its PR.

### 3B. Establish typed search state

Create `lib/explorer/searchState.ts` and `lib/explorer/readPublicSearch.ts`. Reuse `PublicListing` and `publicListingSchema` from `lib/data/publicInventory.ts`. If importing that module would pull repository code into the browser, extract only its pure public schema/types into a shared contract module and preserve server-only repository imports in the server module.

```ts
export type ExplorerSearchState =
  | { status: 'idle' }
  | { status: 'loading'; previous: PublicListing[] }
  | { status: 'ready'; listings: PublicListing[] }
  | { status: 'empty' }
  | { status: 'unavailable' };
```

The current search endpoint returns `{ success, data, metadata, timestamp }`, with `data` as an array and `metadata.source === 'unavailable'` on a repository failure. Parse that envelope explicitly. The current client fallback `(data.properties || [data])` can turn an unexpected response into a fake property; remove it.

```ts
const response = await fetch(url, { signal });
if (!response.ok) return { status: 'unavailable' } as const;
const envelope: unknown = await response.json();
// Validate the envelope, its bounded data array, and metadata before use.
const parsed = publicSearchEnvelopeSchema.safeParse(envelope);
if (!parsed.success || parsed.data.metadata.source === 'unavailable') {
  return { status: 'unavailable' } as const;
}
return parsed.data.data.length
  ? { status: 'ready', listings: parsed.data.data } as const
  : { status: 'empty' } as const;
```

In `app/explorer/page.tsx`, use one request controller and monotonically increasing request ID for initialization and selection changes. Abort superseded requests and on unmount. Commit state only for the current request, including in `finally`. Validate latitude, longitude, radius, and polygon values before generating a request. Clear a previous area's summary on selection change; stale results must be visibly marked or cleared, not presented as current.

Keep this endpoint's public inventory policy in the server repository/projection layer. Inspect provenance and tenant-scoping behavior before changing search eligibility; do not copy the homepage provider guard into a second inconsistent client filter.

### 3C. Keep a list usable when the map fails

Add `components/explorer/ExplorerMapBoundary.tsx`, `ExplorerMapPanel.tsx`, and `ExplorerResultsList.tsx`. Mount the map through a client dynamic import. Add `app/explorer/error.tsx` for route-render failure. The list, filters, and retry action must remain outside the map boundary.

Handle these error sources explicitly: React render failure, chunk load failure, Mapbox `onError`, worker construction failure, `worker.onerror`, and `worker.onmessageerror`. React boundaries do not catch arbitrary async callbacks. In `ExplorerMap.tsx`, terminate the worker and remove listeners during cleanup. A failed worker can use a bounded synchronous GeoJSON conversion for the capped result set, or disable that overlay with a useful message. Reuse the same conversion function for both paths.

Use text such as “The map could not load. You can still browse these properties.” Provide a deliberate retry. Do not retry continuously on every render. A map failure must not reset the search or discard an open property selection.

### 3D. Build GeoJSON only from real values

Extract `lib/explorer/buildPublicListingGeoJson.ts`; use it in `utils/workers/geojson.worker.js` or migrate the worker to TypeScript if the current bundler supports that path. Accept only finite, in-range coordinates. Use stable listing IDs. Remove fabricated rent, value, yield, and trend values.

```ts
const coordinates = listing.location_geo?.coordinates;
if (!coordinates || !isValidLngLat(coordinates)) return [];
return [{
  type: 'Feature' as const,
  id: listing.id,
  geometry: { type: 'Point' as const, coordinates },
  properties: {
    id: listing.id,
    name: listing.name,
    category: listing.type,
    dataType: 'property',
    priceType: listing.price_type,
    price: displayPriceForIntent(listing),
  },
}];
```

Define `displayPriceForIntent` using explicit sale/lease semantics. Missing data yields `null` and a useful label, not zero dollars. In `constants/mapLayers.ts`, either remove the synthetic trend overlay or replace it with a documented listing-density heatmap using uniform listing weights. Label that “Listing Density”; separate valuation points from listing density. Update `explorer/MapControls.tsx` and popup consumers of `yield`/`trend` together.

In the Explorer sidebar, separate sale prices from monthly rents. Averages must show their sample count and apply only to the returned sample; do not call them a market-wide average. Remove the “clockwise route may make the best use of daylight” recommendation unless a real route calculation supports it. Review the Lifestyle Pulse calculation and labeling separately; a heuristic score is not a verified market fact.

Completion: malformed responses are not listings, empty differs from unavailable, quick filter changes cannot show stale results as current, the list survives map failure, and no fabricated yield/rent/value appears in map features or popups. The captured crash has its own reproduced and verified fix.

## 4. Publish Useful Content Through Existing Gates

### 4A. Show publication readiness to the operator

Create `lib/marketing/publicationReadiness.server.ts`, a pure readiness contract, and `components/marketing/PublicationReadiness.tsx`. After step 1's authorization repair, add a read-only admin readiness route or a protected server page that reuses existing profile and guide loaders. Handle loader failure as `unavailable`, not as an empty draft.

```ts
type PublicationReadiness = {
  key: 'seller_profile' | 'old_town_keller' | 'west_bursey_ranch' | 'westlake';
  state: 'published' | 'needs_content' | 'unavailable';
  missing: Array<'identity' | 'contact' | 'photo' | 'credit' | 'evidence' | 'coordinates'>;
  reviewHref: string;
};
```

Use the existing guide slug `westlake-overview` in implementation; readiness keys are internal display keys. Distinguish required publication fields from optional enhancements: a portrait is optional under the current seller schema, and a text guide can be published without map/photos. Do not label a valid published text guide as broken just because optional photography is absent.

### 4B. Publish the seller introduction

Populate `content/marketing/seller-introduction.v1.json` with approved identity, a short biography, and the public seller-response contact. KCD's `8174668007` and `wahidmc6@gmail.com` are approved for KCD only and must not become the main-site seller contact by inference. Verify the contact against the response configuration.

Store the optional approved portrait under `public/images/seller-profile/` as WebP; preserve intrinsic dimensions and meaningful alt text. Validate with `sellerIntroductionSchema` before changing `status` to `published`. Review the existing `SellerIntroduction.tsx` at mobile and desktop widths. Use one concrete paragraph and direct contact actions. Retain uppercase main-site section headings, sans-serif italics, and upright body text.

### 4C. Complete one neighborhood before expanding

Start with `old-town-keller` in `content/neighborhoods/presentation.v1.json`. Use the existing photo, place, evidence, and local-note schema. Add 2–4 licensed photos with captions/credits, up to 4 checked places, verified coordinates, and an approved local note if available. Do not invent a personal visit. Keep evidence IDs joined to the existing guide source records; verify dates before publication.

The existing loader already filters expired place evidence and hides the map when no current places remain. Preserve that behavior. Add useful photo fallbacks and a textual places list. Use the current requested map launcher; do not mount the map during the initial page render. Repeat for the other guides only after this one is complete.

Completion: the operator sees why content is pending; the profile shows a real approved contact; one guide offers a useful visual visit with licensed images and current sourced places. No new media collection is uploaded to Supabase.

## 5. Connect Consultation Booking to the Existing Scheduler

Authority discovery and the first repair are implemented in PR #92, stacked on PR #91. The old public flow saves a consultation request without pretending to reserve an unchecked time; the anonymous direct booking writer is disabled, and commercial replay lookups are lineage-scoped. See [scheduling authority evidence](./releases/consultation-authority-audit-2026-10-28.md) for the writer inventory and checks. The user selected extending Sunset Pulse's scheduler. PR #93 implements its owner-controlled internal reservation layer and existing reminder bridge. The [real-auth follow-up](./releases/consultation-real-auth-acceptance-2026-10-28.md) closes the local UI/API/data gap and records required fixes. Automatic production slots remain disabled pending reviewed migrations, environment mapping, signing secret, owner hours and deployment acceptance.

### Authority decision before provider code

`sellerConsultation.server.ts` already defines `listSlots` and `reserve`. `sellerConsultationContract.ts` already validates saved identity, windows, and results. `sellerBookingCapability.server.ts` already signs a short-lived purpose-specific capability. Reuse all three.

First inspect the scheduling application's configured event type, calendar owner, tenant/agent mapping, availability reader, reservation writer, cancellation path, and timezone rules. Identify all existing booking writers. The booking helper in `commercialBooking.ts` persists lineage and attendees; that alone does not prove exclusive slot reservation.

### Implementation files

| File | Responsibility |
| --- | --- |
| `lib/scheduling/sellerConsultationAuthority.server.ts` (new) | Resolve a configured authority from server-owned agent/site mapping |
| `lib/scheduling/adapters/<confirmed-authority>.server.ts` (new after discovery) | Implement the existing interface against the actual scheduling authority |
| `app/api/seller-consultations/availability/route.ts` (new) | Bounded same-origin availability using a signed saved-lead capability |
| `app/api/seller-consultations/reservations/route.ts` (new) | Revalidate and reserve with idempotent request ID |
| `components/lead-capture/SellerConsultationPicker.tsx` (new) | Timezone-aware slots after the request is already saved |
| `sellerLeadIntake.server.ts` and existing intake receipt | Attach a scoped booking capability only when the authority is configured |

The public routes must verify signature, purpose, expiry, same-origin policy, body limit, and rate limit; reload the saved lead to verify current agent/site/tenant and state. Derive all authoritative identity on the server. Token possession is a narrow booking capability, not general seller-case access. Keep it out of URLs, storage, analytics, logs, and referrers; hold it in form memory and send it in the request body.

The existing capability lasts 15 minutes. If it expires, offer the normal contact path and preserve the saved-request confirmation. Do not build an anonymous refresh route that can recover booking privileges from a lead ID alone. Any refresh requires its own proven authorization design.

```ts
const authority = await resolveSellerConsultationAuthority(savedIdentity);
if (!authority) return unavailable('not_configured');
const outcome = await authority.reserve({
  identity: savedIdentity,
  slotId: parsed.slotId,
  requestId: parsed.requestId,
});
// Return confirmed only after an authoritative reservation exists.
```

Use a provider atomic reservation when available. If the existing local scheduler is the authority, design the invariant around actual resource/time overlap, not merely unique slot IDs. Audit every writer and enforce one shared transactional invariant, with an idempotency key scoped to the saved lead and request. Reuse the existing booking lineage, attendee, retry, and cancellation contracts.

If a provider call times out, treat the outcome as uncertain and reconcile by the same request key before reserving again. If a provider reservation succeeds but local persistence fails, retain a recoverable reconciliation path through the existing scheduling/workflow infrastructure. Do not claim failure and invite a new independent reservation. Provider-specific implementation is conditional on verified recovery capabilities.

After confirmed persistence, reuse existing reminder jobs and `realtor_reminder` handling. Cancellation must invalidate pending reminder intent and retain booking lineage. Do not create another cron, queue, or notification table. A missing authority leaves the picker disabled; independent content and Explorer work continue.

Completion: a disposable end-to-end run proves two concurrent callers cannot claim one resource interval, an uncertain retry returns the same booking, timezone/DST display is correct, cancellation suppresses reminders, and booking failure does not lose the saved seller request.

## 6. Run a Small Seller Pilot and Finish Release Evidence

The owner/client publication, access, preparation, journey and setup flows have been exercised through real local browser controls; see the [sharing pilot record](./releases/seller-sharing-pilot-2026-10-28.md) and [journey/setup record](./releases/seller-journey-setup-2026-10-28.md). Keep the human and physical-device checks separate from these automated results.

Use `apps/pulse/docs/HUMANIZED_EXPERIENCE_ACCEPTANCE_CHECKLIST.md` as the existing walkthrough. Add a short pilot record to `docs/releases/`, using fictional contacts and an isolated database. Prepare a verified owner and a separate verified client whose address matches the disposable request. Do not send email/SMS or use real sellers to exercise mutation paths.

Perform the complete path: request saved once, owner finds the next action in `/today`, preparation draft survives close/reopen, planned appointment differs from held consultation, exact client-update preview is published, client access is enabled separately, and revocation removes visibility. Confirm private sentinel notes and unselected documents never appear in client progress or Jamie's context. Optional microphone capture still needs a physical-device check.

Record actual friction: task completed, clicks, approximate time, lost drafts, misleading status, and recovery difficulty. Use those observations to select the next UI patch. Do not add another status card or rewrite completed H1–H8 surfaces in advance of a specific observed problem.

For performance, capture a baseline and changed result from the same production build profile at 390px and 1440px. Verify map/Atlas chunks load on request, failed chunks recover, and repeated open/close does not accumulate workers/listeners. Check KCD as a regression route because Explorer and global heading changes can affect it. Keep screenshots and request traces local; retain only approved review artifacts and summarized measurements.

Completion: release evidence identifies the exact commit, observed outcomes, unresolved defects, and required owner decisions. Update the PR description around final behavior and current verification. Production merge/deployment readiness depends on resolved security findings and completed required checks, even though independent implementation does not wait on pending jobs.

## Implementation Queue and Verification

| Commit group | First concrete change | Relevant verification when implemented |
| --- | --- | --- |
| A | Repair admin marketing authorization and filesystem-save behavior | Route authorization and misleading-save regression cases |
| B | Zod contract fixtures, then dependency/API migration | Production audit, TypeScript, schema/API contract tests |
| C | Explorer typed reads and request cancellation | Existing listing-read/discovery tests plus stale/empty/unavailable cases |
| D | Extract GeoJSON builder and remove synthetic metrics | Deterministic geometry/price cases and worker parity |
| E | Map boundary and async error recovery | Failed chunk, worker, Mapbox, retry, and list-survival checks |
| F | Publication readiness and one approved content package | Draft omission, loader error, evidence expiry, photo/coordinate validation |
| G | Real availability adapter and capability-scoped routes | Auth, replay, overlap, provider timeout, cancellation, reminder lifecycle |
| H | Owner/client pilot and measured corrections | Existing manual acceptance checklist and narrow tests for observed defects |

Useful existing commands and suites, to run only at the corresponding implementation step:

```powershell
npm run security:audit:prod
npm run typecheck --workspace=apps/pulse
npm run lint --workspace=apps/pulse
npm run test:unit --workspace=apps/pulse -- tests/unit/listing-contract.test.ts tests/unit/listing-discovery.test.ts tests/unit/listing-read-surfaces.test.ts
npm run test:unit --workspace=apps/pulse -- tests/unit/seller-consultation-contract.test.ts tests/unit/seller-booking-capability.test.ts
git diff --check
```

New test filenames above are planned. Existing suites must be inspected for their real fixtures before extending them. Do not run every test after each documentation or styling edit. Re-run broader checks only when changed contracts, failures, or unresolved concerns justify them. No tests, runtime changes, database writes, provider activation, or production publication were performed while writing this plan.

## Immediate Next Session

1. Preserve the review dependency order: #87, then #88, then #89, then #90, then the publication-readiness branch. Refresh branch/base state before new work; merging and deployment require their own release decision.
2. Review group G's internal scheduling migrations, including `20261028123000_internal_seller_calendar_read_grants.sql`. Complete environment mapping and deployed non-production acceptance before any production activation. Local real-auth verification and SQL concurrency evidence are recorded separately from deployment readiness.
3. Locate and connect the existing biography and neighborhood assets for sections 4B/4C; reuse the verified seller name and main-site email already prefilled. Use the readiness page's review directions and preserve optional media gates.
4. Complete repeated Atlas/map worker and listener lifecycle measurements and capture the original hosted exception if it recurs. The local production CSP failure now has a diagnosed fix and actual Mapbox coverage; do not attribute the earlier hosted crash to it without its trace.
5. Complete deployed acceptance and human/device review before declaring release readiness. Local production build, four production browser checks and the six fixture Explorer checks are now recorded. Use the current-build baseline for a future same-profile performance comparison. Complete the publication operator walkthrough as well.

The first four deliveries require no new Supabase schema, cloud file uploads, or cron jobs. Booking may require a narrowly justified migration only after the actual reservation authority and invariant are established.
