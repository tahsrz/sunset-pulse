# Sunset Pulse Main Site: Implementation Plan

Prepared October 19, 2026. Scope: the first six recommendations from this conversation. Work is planned for one agent, sequentially, with no subagents.

Execution companion: [Main Site Execution Plan](./main-site-execution-plan-2026-10-19.md). Use its task queue and PR completion rules when building this specification.

This is an implementation specification, not a report of completed features. Code below is proposed code. Existing behavior is identified separately. Snippets show the intended interfaces and important implementations; imports, surrounding markup, and integration must be checked by TypeScript and the existing tests when the feature is built. The booking section explicitly identifies work that cannot safely be reduced to a button or an unverified provider call.

## 1. What This Release Should Achieve

A first-time visitor should be able to answer three questions quickly:

1. Who will help me?
2. What will I receive if I ask about selling?
3. Where can I look at properties and learn about the area?

The homepage should answer those questions through people, photographs, examples, and a small number of useful actions. The interactive atlas remains part of Sunset Pulse, with a deliberate way to open it.

### The Six Workstreams

| Workstream | Visitor outcome | Primary implementation |
| --- | --- | --- |
| 1. Homepage order | Understand the site and choose a next step | Recompose `app/page.tsx`; relocate technical content |
| 2. Personal introduction | Know who will respond | Reviewed public profile, portrait, contact links |
| 3. Visual seller request | Make a request with clear expectations | Choice cards, stepped form, confirmation, scheduling handoff |
| 4. Seller examples | See what seller assistance actually involves | Sample preparation plan, pricing review outline, property presentation |
| 5. Neighborhood guides | Learn something useful about Keller and Westlake | Photo-led guide layouts, reviewed places, map, dated evidence |
| 6. Optional interactive features | Browse comfortably and launch richer tools intentionally | Static previews, explicit imports, ordinary navigation, performance checks |

The seventh suggestion from the brainstorm, a general credibility cleanup, is not a separate workstream here. Relevant checks for the six changes are included in their acceptance criteria. A sitewide FAQ rewrite or voting redesign would be separate work.

### Decisions Already Established

- Main-site hero and section titles retain the current uppercase presentation.
- Titles inherit sans-serif italics. Body text remains upright.
- Do not reintroduce Georgia overrides.
- Do not change KCD's Title Case hero as part of main-site work.
- Avoid em dashes, heading-plus-quip formulas, and paragraphs made from lists of marketing claims.
- Use approved real photographs for people, neighborhoods, and property examples.
- Keep the food / Explorer banner at the bottom of the homepage content.
- Preserve existing operator access checks and tenant isolation.
- Reuse existing intake, listing, scheduling, and workflow infrastructure.
- Put reviewed marketing content and small images in the repository. Do not upload another media library into Supabase.
- Do not promise response times, market results, appointment availability, or pricing that the operating process does not support.

## 2. Verified Starting Point

This plan is based on the checked-out repository at `c334bd76`. PR #86 was previously confirmed merged. Before implementation, fetch current `origin/main`, inspect subsequent changes, and rebase this file inventory against that checkout. These are code findings, not claims about the current production deployment.

### Homepage

`apps/pulse/app/page.tsx` currently renders:

1. `SellerAcquisitionHero`
2. `HomeHero`, loading `CinematicHero`
3. `HomeWorldHub`, loading `VirtualWorldHub`
4. `ValuePropositionGrid`
5. `AnimalOfDaySection`
6. `StagedPropertiesPocket` / `UnifiedPropertyStage`
7. `SunsetHistorySection`
8. `InfoBoxes`
9. `FAQSection`
10. `ArchitectureOverview`
11. `CounterScanActions`

`app/home.module.css` uppercases headings. The global stylesheet already sets the sans-serif italic heading default.

### Seller Intake

- `components/lead-capture/SellerPlanRequestForm.tsx` already sends requests to `/api/lead-magnets`.
- `lib/marketing/leadMagnetContract.ts` defines a strict input schema with `offerVersion: '2'`.
- The form already has separate response consent and optional marketing consent.
- It already keeps an idempotency key after uncertain delivery and rotates it when details change.
- The API already bounds request size, checks host/origin, applies distributed rate limiting, and implements a honeypot.
- `sellerLeadIntake.server.ts` already resolves the configured tenant on the server and writes to `agent_site_leads`.
- The save result currently returns a status, not a booking capability or usable public receipt.
- `SellerOfferMeasurement` only records optional `visit` and `offer_click` events after opt-in. It is not a general funnel analytics API.

### Scheduling

- `/schedule` currently creates another lead and accepts a user-entered date/time.
- `/api/scheduling/public` accepts lead/funnel identifiers and calls `createAuthoritativeCommercialBooking`.
- `lib/scheduling/commercialBooking.ts` persists booking lineage and attendees, with idempotency.
- In the inspected implementation, that helper does not establish available slots or an atomic availability reservation.
- `SellerLeadScheduleDialog` is an authenticated operator follow-up scheduler. It is not a public appointment picker.
- The durable workflow registry already includes `realtor_reminder`, `realtor_planner`, and `seller_email`.
- Workflow event admission is separately constrained by TypeScript schemas and database contracts. Adding a name to the registry alone does not enable a new workflow.

### Neighborhood Guides

- `/neighborhoods` and `/neighborhoods/[slug]` already exist.
- Existing published records include Old Town Keller, West Bursey Ranch, and a Westlake overview.
- `neighborhoodGuideSchema.ts` strictly validates sources and section evidence references.
- `neighborhoodGuides.server.ts` filters sections whose evidence has expired.
- Existing content is primarily text. There is no guide photo/map presentation model in that schema.

### Interactive Rendering

- `HomeDynamicSections.tsx` uses `dynamic(..., { ssr: false })`, but it mounts both dynamic components immediately. This still causes their client code to load on the homepage.
- `AtlasGlobeBackground` requests `/api/tah/atlas/globe` on mount.
- `VirtualWorldHub` imports Three.js and starts an endpoint preview request when mounted.
- The root layout imports global chrome and providers. Changing `app/page.tsx` alone cannot prove that all unnecessary background work has been removed.

## 3. Proposed File Map

All paths below are relative to `apps/pulse/` unless they start with `docs/`.

```text
app/
  page.tsx                                  modify composition
  home.module.css                           retain heading policy; add layout rules only
  how-it-works/page.tsx                      new public home for ArchitectureOverview
  seller-plan/page.tsx                      modify introduction, sample, and form layout
  neighborhoods/page.tsx                     modify guide cards
  neighborhoods/[slug]/page.tsx              modify guide article
  api/seller-booking/availability/route.ts    new, only after booking foundation
  api/seller-booking/route.ts                 new, only after booking foundation
  sitemap.ts                                include new public route

components/
  home/
    HomeSection.tsx                         new small server component
    CounterScanActions.tsx                  extract current bottom banner
    HomeAgentIntroduction.tsx               new server component
    HomeNeighborhoodPreview.tsx             new server component
    HomeExploreSection.tsx                  new server component
    InteractiveExperienceLauncher.tsx       new client island
    InteractiveExperienceBoundary.tsx       new client error boundary
    HomeDynamicSections.tsx                 update/retire homepage-specific eager exports
  marketing/
    SellerAcquisitionHero.tsx                revise layout without changing offer identity
    SellerProcessExamples.tsx                new server component
    SellerPlanSample.tsx                     new server component
    UnifiedPropertyStage.tsx                 optional initial mode and compact presentation
  lead-capture/
    SellerPlanRequestForm.tsx                refactor form state and steps
    SellerChoiceGroup.tsx                    new accessible radio-card component
    SellerRequestConfirmation.tsx            new client-compatible presentation
    SellerBookingPicker.tsx                  new, gated on verified scheduling capability
  neighborhoods/
    NeighborhoodGuideCard.tsx                new server component
    NeighborhoodGuideHeader.tsx              new server component
    NeighborhoodPlaces.tsx                   new server component
    NeighborhoodAreaMap.tsx                  new client component, loaded on request

content/
  marketing/main-site-profile.v1.json        new reviewed public profile
  marketing/seller-examples.v1.json          new illustrative seller-plan content
  neighborhoods/*.v1.json                    extend existing guide records
  neighborhoods/presentation.v1.json         new optional presentation data

lib/
  marketing/publicProfileSchema.ts           new pure schema
  marketing/mainSiteProfile.server.ts        new server-only loader
  marketing/sellerExampleSchema.ts           new pure schema
  marketing/sellerExamples.server.ts          new server-only loader
  marketing/sellerRequestState.ts            new reducer/types
  marketing/sellerRequestPayload.ts          new pure payload builder
  marketing/neighborhoodPresentation.ts      new pure schema
  marketing/neighborhoodPresentation.server.ts new source-aware loader
  marketing/neighborhoodGuideSchema.ts       preserve evidence guarantees
  marketing/sellerLeadIntake.server.ts        extend internal save receipt in booking phase
  marketing/sellerBookingCapability.server.ts new scoped booking capability
  scheduling/sellerConsultation.server.ts     new adapter over existing scheduling authority

public/images/
  people/<approved-person>.webp              pending approved portrait
  seller-examples/<approved-example>.webp    pending real marketing example
  neighborhoods/<slug>/<photo>.webp          pending approved local photos
  experiences/atlas-preview.webp             capture from the existing experience
  experiences/world-preview.webp             capture from the existing experience

tests/unit/
  main-site-public-profile.test.ts
  seller-plan-request-form.test.tsx            extend existing tests
  seller-request-state.test.ts
  seller-request-payload.test.ts
  seller-plan-lead-route.test.ts               preserve and extend existing tests
  seller-booking-capability.test.ts
  seller-booking-routes.test.ts
  neighborhood-guides.test.ts                 extend existing tests
  neighborhood-presentation.test.ts
  interactive-experience-launcher.test.tsx

tests/
  main-site-journey.spec.ts
  seller-plan-journey.spec.ts
  neighborhood-guide-journey.spec.ts
  optional-experiences.spec.ts
```

Create new modules when they isolate reusable behavior or a client boundary. Do not turn every paragraph into a component.

## 4. Workstream One: Homepage Order

### 4.1 Intended Page Order

```text
Existing global navigation
Seller hero and primary request button
Personal introduction
Four featured properties
Seller examples
Keller and Westlake guide previews
Optional Atlas / platform-map launchers
Sunset history
Short existing FAQ
Food / Explorer banner
Existing global footer and required information
```

The first composition change should preserve the existing listing repository and cards. Do not introduce a new listing store as part of homepage design.

`AnimalOfDaySection` and `InfoBoxes` should leave the primary selling sequence. Inspect their other entry points before removal. If the animal feature needs a public landing page, add one deliberately after checking the existing animal routes; do not guess a route. The underlying feature remains intact.

### 4.2 Extract the Bottom Banner

Move `CounterScanActions` from `app/page.tsx` to `components/home/CounterScanActions.tsx`, retaining its current JSX and access-dependent link behavior.

```tsx
type CounterScanActionsProps = {
  showLeadOperations: boolean;
};

export default function CounterScanActions({
  showLeadOperations,
}: CounterScanActionsProps) {
  // Move the current implementation here without changing destinations.
  // /grill and /explorer remain public.
  // /admin/research-desk remains conditional on the server result.
}
```

Retain `getOperatorAccess(getRequestHostFromHeaders(await headers()))` on the server. Do not infer operator status in the browser or weaken the destination's own authentication.

### 4.3 Add a Small Section Wrapper

Create `components/home/HomeSection.tsx`:

```tsx
import type { ReactNode } from 'react';

type Props = {
  id: string;
  title: string;
  children: ReactNode;
  className?: string;
};

export function HomeSection({ id, title, children, className = '' }: Props) {
  const titleId = `${id}-title`;
  return (
    <section id={id} aria-labelledby={titleId} className={`py-14 sm:py-20 ${className}`}>
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <h2 id={titleId} className="max-w-3xl text-3xl leading-tight sm:text-5xl">
          {title}
        </h2>
        <div className="mt-8">{children}</div>
      </div>
    </section>
  );
}
```

Let the existing typography rules supply sans-serif italics and uppercase presentation. Do not add another family override. Choose heading weight through the existing design direction rather than silently making every new heading `font-black`.

### 4.4 Recompose the Page

The target composition is:

```tsx
export default async function HomePage() {
  const access = await getOperatorAccess(
    getRequestHostFromHeaders(await headers()),
  );
  const profile = getPublishedMainSiteProfile();
  const guideCards = getHomeNeighborhoodCards();
  const sellerExamples = getPublishedSellerExamples();

  return (
    <div className={styles.homePage}>
      <SellerAcquisitionHero />
      <div className="waterlily-surface">
        {profile && <HomeAgentIntroduction profile={profile} />}
        <Suspense fallback={<FeaturedPropertiesSkeleton />}>
          <StagedPropertiesPocket />
        </Suspense>
        {sellerExamples && <SellerProcessExamples examples={sellerExamples} />}
        <HomeNeighborhoodPreview guides={guideCards} />
        <HomeExploreSection />
        <SunsetHistorySection />
        <FAQSection />
      </div>
      <CounterScanActions showLeadOperations={access.allowed} />
    </div>
  );
}
```

All three new loaders are server-only, reading reviewed repository content. The skeleton is local markup with the same approximate card footprint, not another client fetch.

### 4.5 Compact the Listing Entry Point

Current `UnifiedPropertyStage` starts in `LIVE` mode and immediately requests `/api/idx/hot-moving`. Its server props contain staged listings that are initially hidden. Change this deliberately rather than showing a fetching screen immediately after introducing the agent.

Add backward-compatible props:

```tsx
interface UnifiedPropertyStageProps {
  initialStagedProperties: Property[];
  initialMode?: StageMode;
  compact?: boolean;
}

const [mode, setMode] = useState<StageMode>(initialMode ?? 'LIVE');
```

On the homepage, request `getTourHotList({ limit: 4 })` and pass `initialMode="STAGED" compact`. The existing effect should continue to request the live feed only when `mode === 'LIVE'`. Compact presentation limits the visible section; a separate link opens `/properties` or `/idx` as appropriate.

Preserve each source's labels. Do not label a curated property as active MLS inventory without that record establishing it. If there are no curated properties, show a concise message and ordinary search links. If the server read fails, isolate that failure to this section and preserve the rest of the homepage. Respect the repository's existing error contract when implementing that fallback.

### 4.6 Move the Architecture Section

Create `app/how-it-works/page.tsx`:

```tsx
import type { Metadata } from 'next';
import ArchitectureOverview from '@/components/architecture/ArchitectureOverview';

export const metadata: Metadata = {
  title: 'How Sunset Pulse Works | Sunset Pulse',
  description: 'Learn how the property tools and research features fit together.',
  alternates: { canonical: '/how-it-works' },
};

export default function HowItWorksPage() {
  return (
    <main className="waterlily-surface">
      <header className="mx-auto max-w-7xl px-5 pt-12">
        <h1 className="text-4xl sm:text-5xl">How Sunset Pulse Works</h1>
      </header>
      <ArchitectureOverview />
    </main>
  );
}
```

The existing component currently has an h2 with the same words. Refactor its top-level introductory markup to avoid printing the same title twice. Prefer making the component's internal heading unique, such as `The Tools Behind Your Search`, over changing all of its internal headings to h1.

Add the route to the existing footer link array and `app/sitemap.ts`. Preserve existing links, metadata, TREC notice, and IABS destinations. Check existing inbound `/#architecture` references and update them to `/how-it-works#architecture`; provide a simple anchor/link compatibility element on the homepage during the transition if those links are in use.

### 4.7 Acceptance Criteria

- A visitor sees the seller offer before the experimental features.
- The homepage has one h1.
- Technical content remains accessible through an ordinary link.
- The bottom banner remains the final homepage section.
- Listing failure does not hide the introduction or seller request.
- Anonymous visitors do not see Lead Operations.
- Existing KCD routing and global footer behavior remain intact.
- New headings follow the existing main-site casing and font policy.

## 5. Workstream Two: Personal Introduction

### 5.1 Publication Inputs

Obtain an approved portrait, display name, public role, short biography, appropriate brokerage information, and contact destinations. The repository already contains contact information, but a platform contact is not automatically the person authorized to handle seller representation.

KCD's approved phone and email belong to the father's property business. Do not reuse them on the main seller introduction. A generic `profile.png` is not sufficient evidence that a photograph is the right person or approved for this use.

Build the component and draft record while the assets are pending. The public loader returns `null` until the content is marked published. Do not expose blank placeholders or internal requests for a portrait to visitors.

### 5.2 Public Profile Schema

Create `lib/marketing/publicProfileSchema.ts`:

```ts
import { z } from 'zod';

const localImage = z.object({
  src: z.string().regex(/^\/images\/people\/[a-z0-9-]+\.webp$/),
  alt: z.string().trim().min(8).max(180),
  width: z.number().int().positive().max(3000),
  height: z.number().int().positive().max(3000),
}).strict();

export const publishedPublicProfileSchema = z.object({
  schemaVersion: z.literal(1),
  status: z.literal('published'),
  displayName: z.string().trim().min(2).max(120),
  role: z.string().trim().min(2).max(120),
  introduction: z.string().trim().min(30).max(600),
  portrait: localImage,
  publicEmail: z.string().email().optional(),
  phoneE164: z.string().regex(/^\+[1-9]\d{7,14}$/).optional(),
  phoneDisplay: z.string().trim().min(7).max(40).optional(),
  brokerageDisplay: z.string().trim().min(2).max(180).optional(),
  reviewedAt: z.string().date(),
}).strict().superRefine((profile, ctx) => {
  if (Boolean(profile.phoneE164) !== Boolean(profile.phoneDisplay)) {
    ctx.addIssue({ code: 'custom', path: ['phoneE164'], message: 'Publish both phone fields together.' });
  }
});

export type PublishedPublicProfile = z.infer<typeof publishedPublicProfileSchema>;
```

Require actual approved content before publishing. This file only defines the public presentation record. It does not replace tenant/agent ownership configuration or brokerage records.

### 5.3 Server Loader

Create `lib/marketing/mainSiteProfile.server.ts`:

```ts
import 'server-only';
import record from '@/content/marketing/main-site-profile.v1.json';
import { publishedPublicProfileSchema } from './publicProfileSchema';

export function getPublishedMainSiteProfile() {
  if (record.status !== 'published') return null;
  return publishedPublicProfileSchema.parse(record);
}
```

Initially, the draft JSON can contain only `schemaVersion`, `status: 'draft'`, and an internal editorial checklist. The published parser never passes that draft to a client component. Once approved, replace it with a complete strict published record.

### 5.4 Component Layout

Create `HomeAgentIntroduction.tsx` as a server component:

```tsx
import Image from 'next/image';
import Link from 'next/link';
import type { PublishedPublicProfile } from '@/lib/marketing/publicProfileSchema';

export function HomeAgentIntroduction({ profile }: { profile: PublishedPublicProfile }) {
  return (
    <section aria-labelledby="your-contact-title" className="py-14 sm:py-20">
      <div className="mx-auto grid max-w-7xl gap-8 px-5 sm:px-8 md:grid-cols-[0.75fr_1fr] md:items-center">
        <Image
          {...profile.portrait}
          sizes="(min-width: 1280px) 500px, (min-width: 768px) 42vw, 100vw"
          className="aspect-[4/5] w-full rounded-2xl object-cover"
        />
        <div>
          <p className="text-sm text-teal-200">{profile.role}</p>
          <h2 id="your-contact-title" className="mt-3 text-3xl sm:text-5xl">{profile.displayName}</h2>
          <p className="mt-5 max-w-xl text-lg leading-8 text-slate-200">{profile.introduction}</p>
          {profile.brokerageDisplay && <p className="mt-4 text-sm text-slate-400">{profile.brokerageDisplay}</p>}
          <div className="mt-6 flex flex-wrap gap-4">
            <Link href="/seller-plan#request" className="inline-flex min-h-12 items-center rounded-xl bg-teal-300 px-5 font-semibold text-slate-950">Talk About Selling</Link>
            {profile.publicEmail && <a href={`mailto:${profile.publicEmail}`} className="inline-flex min-h-12 items-center underline underline-offset-4">Email {profile.displayName}</a>}
            {profile.phoneE164 && <a href={`tel:${profile.phoneE164}`} className="inline-flex min-h-12 items-center underline underline-offset-4">{profile.phoneDisplay}</a>}
          </div>
        </div>
      </div>
    </section>
  );
}
```

Use a crop approved for the real portrait. Keep the dimensions accurate. Only the actual above-the-fold LCP image should be considered for priority loading after measurement; do not mark every photograph `priority`.

### 5.5 Contact Consistency

- Reuse this reviewed public presentation record on the seller-plan page where appropriate.
- On `/contact`, distinguish a general Sunset Pulse inquiry from a seller representation inquiry.
- Keep the seller form's server-resolved tenant as the routing authority.
- Do not add unverified hours or a response-time promise.
- Keep the existing brokerage-information links available.

### 5.6 Acceptance Criteria

- The portrait depicts the approved contact and its usage is approved.
- Draft profile data is absent from public HTML and serialized props.
- Email and phone links match the visible text.
- The public contact shown is consistent with the configured seller-response process.
- An unavailable portrait has a graceful layout; it does not become a broken-image icon.
- The image loads at an appropriate source size on phones and desktop.
- No additional database read is required for this section.

## 6. Workstream Three: Visual Seller Request

Split this work into two separately releasable parts. Part A improves the existing form and confirmation. Part B connects a verified booking flow. Part A must not claim that an appointment has been booked.

### 6.1 Part A: Preserve the Existing Request Contract

Keep these exact fields and values:

```ts
type RequestKind = 'seller_plan' | 'pricing_review';
type SellerTiming =
  | 'exploring'
  | 'within-30-days'
  | 'one-to-three-months'
  | 'three-to-six-months'
  | 'later';
```

Keep `offerKey: 'keller-westlake-seller-plan'` and `offerVersion: '2'` while the backend offer and payload are unchanged. A visual redesign does not require changing the literal schema. Revise the version and attribution/reporting together only if the actual offer changes.

### 6.2 Three Form Steps

| Step | Heading | Controls | Continue condition |
| --- | --- | --- | --- |
| Help | What Would You Like Help With? | Two radio cards for existing request kinds | A valid choice |
| Timing | When Are You Thinking of Selling? | Five radio cards for existing timings | A valid choice |
| Contact | Where Can We Reach You? | Name, email, consent, optional marketing consent | Existing schema and native field validation |

Initially show a meaningful selected default, matching the current `seller_plan` and `exploring` values. Preserve deliberate selections through Back/Continue navigation.

### 6.3 Accessible Choice Cards

Create `SellerChoiceGroup.tsx` using real radio inputs:

```tsx
type Choice<T extends string> = { value: T; label: string; detail?: string };

export function SellerChoiceGroup<T extends string>({
  name, legend, value, choices, onChange,
}: {
  name: string;
  legend: string;
  value: T;
  choices: readonly Choice<T>[];
  onChange: (value: T) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-5 text-xl font-semibold">{legend}</legend>
      <div className="grid gap-3 sm:grid-cols-2">
        {choices.map((choice) => (
          <label key={choice.value} className="relative block cursor-pointer">
            <input
              type="radio" name={name} value={choice.value}
              checked={value === choice.value}
              onChange={() => onChange(choice.value)}
              className="peer sr-only"
            />
            <span className="block min-h-28 rounded-2xl border border-white/20 p-5 peer-checked:border-teal-200 peer-checked:bg-teal-200/10 peer-focus-visible:ring-2 peer-focus-visible:ring-teal-200 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-slate-950">
              <span className="block font-semibold">{choice.label}</span>
              {choice.detail && <span className="mt-2 block text-sm leading-6 text-slate-300">{choice.detail}</span>}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
```

Preserve browser radio semantics and arrow-key navigation. Selection must be indicated by border and text/indicator, not color alone. Do not create clickable `div` elements pretending to be radios.

### 6.4 Explicit Form State

Create a small state module rather than mixing navigation and HTTP outcomes:

```ts
export type SellerRequestDraft = {
  requestKind: 'seller_plan' | 'pricing_review';
  timing: 'exploring' | 'within-30-days' | 'one-to-three-months' | 'three-to-six-months' | 'later';
  name: string;
  email: string;
  requestedContact: boolean;
  marketingOptIn: boolean;
  company: string;
};

export type RequestStep = 'help' | 'timing' | 'contact';
export type Submission =
  | { status: 'idle' }
  | { status: 'submitting' }
  | { status: 'failed'; message: string }
  | { status: 'saved'; bookingToken?: string };

export const initialSellerDraft: SellerRequestDraft = {
  requestKind: 'seller_plan', timing: 'exploring', name: '', email: '',
  requestedContact: false, marketingOptIn: false, company: '',
};
```

Use component state or a reducer for the draft. Do not use localStorage for contact details. Keep the existing in-memory request fingerprint/ref behavior through failed retries.

### 6.5 Keep Payload Construction Independent of Mounted Inputs

The current implementation uses `FormData`. A stepped form can unmount fields, so `new FormData(form)` would silently lose earlier choices. Build the payload from the typed draft instead:

```ts
import { sellerPlanLeadSchema } from './leadMagnetContract';
import type { SellerRequestDraft } from './sellerRequestState';

export function buildSellerRequestFields(draft: SellerRequestDraft, search: URLSearchParams) {
  return {
    offerKey: 'keller-westlake-seller-plan' as const,
    offerVersion: '2' as const,
    ...draft,
    campaign: {
      source: search.get('utm_source'),
      medium: search.get('utm_medium'),
      campaign: search.get('utm_campaign'),
      content: search.get('utm_content'),
    },
  };
}

export function validateSellerRequest(
  fields: ReturnType<typeof buildSellerRequestFields>, submissionId: string,
) {
  return sellerPlanLeadSchema.safeParse({ ...fields, submissionId });
}
```

Keep server campaign normalization authoritative. The client validation must not turn arbitrary campaign labels into a display or tracking bypass.

### 6.6 Submission Sequence

Implement the submit operation in this order:

1. Ignore a second submit while an in-flight ref is set.
2. Build fields from the draft and current URL parameters.
3. Calculate the same stable fingerprint of those fields.
4. Reuse the current `submissionId` if fields are unchanged after uncertain delivery.
5. Generate a new UUID if fields changed.
6. Validate with `sellerPlanLeadSchema`.
7. Show field errors and focus the first invalid input if validation fails.
8. POST to `/api/lead-magnets` with the existing JSON contract.
9. Require both a successful HTTP status and `success === true`.
10. Render confirmation only after that result.
11. Preserve entered data when saving fails.
12. Release the in-flight ref in `finally`.

Do not submit on an intermediate Continue action. Buttons for Back/Continue use `type="button"`. If the form receives Enter before the contact step, advance the step instead of sending a request. On the contact step, retain native email validation and required consent.

### 6.7 Focus and Measurement

- Keep `<form id="request">` so existing links and `SellerOfferMeasurement` continue to target it.
- A focusable step heading with `tabIndex={-1}` receives focus after moving to the next step.
- A text progress indicator announces `Step 2 of 3`; do not communicate progress only through dots.
- The success panel receives focus after the request is saved.
- Keep `role="status"` feedback for save progress/errors; use associated field messages for validation.
- The current measurement component listens for `submit`. Change its listener to ignore intermediate-step submissions, for example by checking `form.dataset.requestStep === 'contact'`.
- Preserve its explicit opt-in. Do not add contact details to measurement events.
- Do not invent new event types without changing the API schema, RPC, retention, and tests together.

### 6.8 Confirmation Panel

Show a concrete summary without repeating private details in a URL:

```tsx
export function SellerRequestConfirmation({
  requestLabel, timingLabel, children,
}: {
  requestLabel: string;
  timingLabel: string;
  children?: React.ReactNode;
}) {
  return (
    <section aria-labelledby="request-saved-title">
      <h2 id="request-saved-title" tabIndex={-1}>Your Request Is Saved</h2>
      <dl className="mt-5 grid gap-4 sm:grid-cols-2">
        <div><dt className="text-sm text-slate-400">You Asked About</dt><dd>{requestLabel}</dd></div>
        <div><dt className="text-sm text-slate-400">Your Timing</dt><dd>{timingLabel}</dd></div>
      </dl>
      <p className="mt-5 leading-7 text-slate-300">We’ll contact you about your request. You can keep exploring the local guides while you wait.</p>
      {children}
    </section>
  );
}
```

Use labels from an explicit lookup table. Do not format raw enum strings into final public copy.

### 6.9 Part B: Scheduling Handoff

Do not point this confirmation straight to the existing `/schedule` page. That page currently creates another lead and accepts an arbitrary time. For this journey, reuse the saved seller lead and offer only times the scheduling authority can actually reserve.

Add a server-only internal receipt to `SellerLeadSaveResult`:

```ts
type SavedSellerIdentity = {
  leadId: string;
  funnelId: string;
  agentId: string;
  site: string;
};

export type SellerLeadSaveResult =
  | { status: 'saved'; identity: SavedSellerIdentity }
  | { status: 'replayed'; identity: SavedSellerIdentity }
  | { status: 'conflict' }
  | { status: 'unavailable'; reason: 'configuration' | 'storage' };
```

Change the insert to select `id,funnel_id,agent_id,site`. On duplicate replay, read those fields together with metadata, compare the original request fingerprint, and return the existing identity. Never create a second lead solely to book a time.

The API should return a short-lived opaque/signed capability, not a collection of IDs that a client is expected to authorize itself:

```ts
type SellerLeadResponse = {
  success: true;
  accepted: true;
  duplicate: boolean;
  booking?: { token: string; expiresAt: string };
};
```

The token is a bearer capability. Keep it in component memory, send it in the JSON body of same-origin requests, and never put it in query strings, analytics, localStorage, or logs. The capability must bind the saved identity, purpose `seller_consultation`, expiry, and a version. Signing keys remain server-only. Validate signature, size, schema, purpose, expiry, and current lead/tenant state on every use. Rate-limit token failures as well as successful requests.

Honeypot success must not receive a token. If token creation or scheduling is unavailable after a successful lead save, return the normal saved confirmation and omit booking. A scheduling problem must not make the visitor retry an already-saved lead.

### 6.10 Scheduling Adapter Contract

Create `lib/scheduling/sellerConsultation.server.ts` with this proposed interface:

```ts
type SellerSlot = {
  id: string;
  startsAt: string; // absolute timestamp with offset/UTC
  endsAt: string;
  timeZone: string;
};

export interface SellerConsultationAuthority {
  listSlots(input: {
    identity: SavedSellerIdentity;
    from: string;
    to: string;
    timeZone: string;
  }): Promise<SellerSlot[]>;

  reserve(input: {
    identity: SavedSellerIdentity;
    slotId: string;
    requestId: string;
  }): Promise<
    | { status: 'confirmed'; bookingId: string; startsAt: string; endsAt: string; timeZone: string }
    | { status: 'conflict' }
  >;
}
```

`slotId` must identify a server-generated, still-valid slot. The server derives contact data and appointment duration from the saved lead and configured event type. It must not trust a caller's arbitrary `agentId`, `site`, attendee email, start time, or end time.

Determine the active scheduling authority during implementation by tracing the existing scheduling configuration. The repository includes a scheduling application, but that alone does not establish a production calendar connection or real availability. Reuse its supported availability/reservation path if configured. If no such authority is connected, release Part A and keep appointment selection unavailable until that dependency is connected. Continue the remaining five workstreams independently.

### 6.11 Public Booking Routes

`POST /api/seller-booking/availability` proposed request:

```json
{
  "token": "<short-lived booking capability>",
  "from": "2026-10-20T00:00:00Z",
  "to": "2026-11-03T00:00:00Z",
  "timeZone": "America/Chicago"
}
```

The date range is illustrative, not promised availability. Bound requests to a configured horizon and a maximum 14-day window. Validate the timezone as an IANA timezone and return only public slots, never calendar titles, other attendees, or private events.

`POST /api/seller-booking` proposed request:

```json
{
  "token": "<short-lived booking capability>",
  "slotId": "<server-issued slot identifier>",
  "requestId": "<UUID reused after uncertain delivery>"
}
```

Required sequence in both handlers:

```ts
// Proposed orchestration; these helpers must be implemented, not assumed existing.
const input = requestSchema.parse(await readBoundedJson(request));
await assertSameOriginAndAllowedHost(request);
await enforceBookingRateLimit(request);
const identity = verifySellerBookingCapability(input.token);
const lead = await readCurrentBookableSellerLead(identity);
const result = await authority.reserve({
  identity: lead.identity,
  slotId: input.slotId,
  requestId: input.requestId,
});
```

Return `409` for a slot that became unavailable, `410` for expiry, `400` for invalid input, and a bounded generic unavailable response for provider failure. Use `Cache-Control: no-store`. Do not echo raw provider/database errors to the visitor.

### 6.12 Reservation Correctness

If using the existing database-backed scheduling authority, inspect its latest schema and all writers before changing it. A transaction must:

1. Resolve the event type, resource/agent, allowed duration, working hours, buffers, and current calendar blocks.
2. Acquire a resource-level transactional lock or use an equivalent reservation primitive.
3. Resolve an existing idempotent reservation before checking for a conflict with itself.
4. Re-check that the requested slot is still available inside the transaction.
5. Insert the booking and attendee, with the existing lead/funnel/site lineage.
6. Persist the reminder/confirmation intent in that same durable operation.
7. Commit before returning confirmation.

Locking one newly written route is insufficient if existing `/api/scheduling/public` or operator routes can write the same calendar without that lock. Route all conflicting writers through the same authority or add a database-level constraint that protects them all. Do not add a blanket exclusion constraint to historical data without first identifying overlapping records and the correct resource scope.

If a provider is authoritative, reserve through its atomic API first and record a durable, idempotent projection. Design retries around a stable external operation key and reconciliation. Do not implement an ad hoc dual write that can create an external booking twice.

This phase may require a migration. Its exact SQL must follow inspection of the current scheduling schema and active integration. The first visual release requires no booking migration.

### 6.13 Calendar UI

- Display days and a short list of available time buttons.
- Render timestamps with `Intl.DateTimeFormat` and the explicitly chosen timezone.
- Retain absolute timestamps from the server; do not interpret a Chicago wall-clock string in the browser's local timezone.
- Keep selection and submission separate.
- On `409`, refresh slots and keep the request confirmation visible.
- On expiry, preserve the saved-request message and offer direct follow-up; never silently submit another lead.
- Use a busy state to prevent double confirmation.
- Say `Your Consultation Is Confirmed` only after durable reservation succeeds.
- If no slots exist, say that a time can be arranged by follow-up. Do not invent a slot.

### 6.14 Existing Scheduler Integration

Consultation reminders belong in the existing booking/planner and durable workflow system. Reuse `realtor_reminder` and the relevant persisted booking references where their contracts support the operation. Use `seller_email` only through its existing consent and prepare/accept lifecycle for applicable seller messages.

No new Vercel cron endpoint is needed just to make a visual form. No browser interval should act as a reminder service. Before adding any new workflow key, update the event schema, registry, database admission contract, result types, and tests together. Prefer adapting the existing reminder event to the confirmed booking.

### 6.15 Acceptance Criteria

- Earlier choices survive step navigation and submission.
- A malformed email or missing response consent cannot be submitted.
- Marketing consent remains optional and unchecked.
- A retry after uncertain delivery does not create another lead.
- Changing the request after failure creates a new submission identity.
- The form retains its values after a failed save.
- Booking failures do not erase or duplicate a saved request.
- A token cannot book for a different lead, agent, tenant, or appointment type.
- Two users competing for one slot cannot both receive confirmed reservations.
- A provider timeout followed by retry has one durable outcome.
- Chicago daylight-saving boundaries and a non-Chicago browser timezone are covered.
- Reminder retries do not send duplicate messages or ignore current consent.

## 7. Workstream Four: Show the Seller Experience

### 7.1 Replace the Mismatched Main-Site Cards

`ValuePropositionGrid` currently labels itself `Why Sell with Us`, but its cards discuss search, spatial views, and Jamie summaries. Replace that homepage usage with `SellerProcessExamples`. Do not delete `marketing_copy.json` keys until searching their consumers. Other views may use that configuration.

The replacement should show three tangible examples:

| Example | Visible content | Action |
| --- | --- | --- |
| Preparing a home | A small example checklist with a few practical tasks | Open the full sample |
| Discussing price | A simple explanation of how condition and comparable sales enter the conversation | Request a pricing review |
| Presenting a property | An approved photo and sample presentation layout | Discuss a seller plan |

Use `Selling Your Home` as a plain section title. Do not pair every title with a clever slogan. Example introductory copy: `See the kind of preparation and pricing discussion you can ask for.` Final wording should match the actual service offered.

### 7.2 Reviewed Example Data

Create `content/marketing/seller-examples.v1.json`. Start with editorial sample tasks, not fabricated case studies or real client data:

```json
{
  "schemaVersion": 1,
  "status": "draft",
  "sampleLabel": "Example Preparation Plan",
  "tasks": [
    { "id": "gather-updates", "title": "Gather Receipts for Major Updates", "detail": "Bring together what you already have before the first conversation." },
    { "id": "timing", "title": "Choose Your Preferred Move Date", "detail": "Note any dates that will affect showings or your move." },
    { "id": "walkthrough", "title": "Discuss the Home Before Starting Work", "detail": "Use the first walk-through to decide what deserves attention." }
  ]
}
```

These tasks are an illustration of the output, not a personalized recommendation. Mark the record published only after the actual service owner approves the example. Optional property imagery is omitted until it is approved.

Define a strict `sellerExampleSchema.ts` with:

```ts
const sellerExampleSchema = z.object({
  schemaVersion: z.literal(1),
  status: z.enum(['draft', 'published']),
  sampleLabel: z.string().trim().min(5).max(100),
  tasks: z.array(z.object({
    id: z.string().regex(/^[a-z0-9-]+$/),
    title: z.string().trim().min(5).max(100),
    detail: z.string().trim().min(15).max(280),
  }).strict()).min(2).max(5),
  propertyPresentation: z.object({
    src: z.string().regex(/^\/images\/seller-examples\/[a-z0-9-]+\.webp$/),
    alt: z.string().trim().min(8).max(180),
    width: z.number().int().positive(),
    height: z.number().int().positive(),
    caption: z.string().trim().min(5).max(180),
  }).strict().optional(),
}).strict();
```

Export the schema/type. Validate unique task IDs. The server loader returns `null` for draft records and parses published records strictly. Do not use `dangerouslySetInnerHTML` for authored copy.

### 7.3 Render the Sample as a Real Artifact

Create `SellerPlanSample.tsx`:

```tsx
type SampleTask = { id: string; title: string; detail: string };

export function SellerPlanSample({ label, tasks }: { label: string; tasks: SampleTask[] }) {
  return (
    <figure className="rounded-2xl border border-stone-300 bg-stone-100 p-6 text-stone-900 sm:p-8">
      <figcaption className="mb-6 border-b border-stone-300 pb-4">
        <p className="text-xs font-semibold uppercase tracking-wider">Example Only</p>
        <h3 className="mt-2 text-2xl">{label}</h3>
      </figcaption>
      <ol className="space-y-5">
        {tasks.map((task, index) => (
          <li key={task.id} className="grid grid-cols-[2rem_1fr] gap-3">
            <span aria-hidden="true" className="text-stone-500">{index + 1}.</span>
            <div>
              <p className="font-semibold">{task.title}</p>
              <p className="mt-1 text-sm leading-6 text-stone-700">{task.detail}</p>
            </div>
          </li>
        ))}
      </ol>
    </figure>
  );
}
```

A paper-like sample can be implemented in HTML/CSS; no image generation or new PDF dependency is necessary. It remains readable by screen readers and selectable on phones. Do not render false interactive checkboxes that imply the visitor is modifying a stored plan.

### 7.4 Pricing Review Example

Use a compact visual list of what the conversation looks at: the home itself, relevant sold properties, and current competing inventory. Avoid example dollar amounts and adjustment formulas in the initial release. There is no reason to imply an automated valuation while demonstrating the service.

Link the existing request flow with a validated selection:

```tsx
<Link href="/seller-plan?requestKind=pricing_review#request">
  Ask About Pricing
</Link>
```

Add a client initializer that accepts only `seller_plan` or `pricing_review` from that parameter. The final request still passes through the strict existing schema. Preserve UTM parameters on links from campaign landing pages using an explicit allowlist, rather than copying the entire incoming query string.

### 7.5 Property Presentation Example

Use an approved photograph with a short description of what would be prepared for a listing. A public listing photo is not automatically licensed for an unrelated marketing example. Obtain the approved image and caption or use a property the operator is authorized to showcase.

Do not label the example `Recently Sold`, show a seller testimonial, claim an outcome, or imply seller representation unless the evidence and permission exist. Without the photo, the preparation sample and pricing outline can ship independently.

### 7.6 Seller-Plan Page Integration

- Put the sample beside the request introduction on desktop and before the form on mobile.
- Keep explanatory paragraphs short.
- Preserve the page's existing distinction between a personal review and an instant valuation.
- Replace duplicate preparation text only after checking that useful guidance is retained in the sample or an expandable section.
- Keep the form near the top, without making visitors scroll through the full checklist to find it.
- The sample is available without login or submitting contact details.

### 7.7 Acceptance Criteria

- The replacement homepage section describes seller assistance that is actually offered.
- Samples are clearly identified as examples.
- No client data or invented sales outcomes appear.
- A pricing-review link preselects the right valid request kind.
- The existing seller-plan default still works for direct visits.
- The examples render without client JavaScript or an external service.
- Approved images have correct dimensions, captions, and usage permissions.

## 8. Workstream Five: Neighborhood Guides

### 8.1 Keep the Existing Evidence Model

Retain the current three reviewed guides and their source references. Extend their presentation instead of replacing factual content with unsupported local commentary.

Use a separate `presentation.v1.json` keyed by existing guide slug. This keeps the existing strict v1 guide records compatible while adding images, coordinates, and optional authored observations. Do not weaken `.strict()` or add catch-all fields to make new data pass.

The presentation loader must join against `listPublishedNeighborhoodGuides()`. A presentation record cannot publish an unpublished/expired guide by itself.

### 8.2 Presentation Schema

Create `lib/marketing/neighborhoodPresentation.ts`:

```ts
import { z } from 'zod';

const photoSchema = z.object({
  src: z.string().regex(/^\/images\/neighborhoods\/[a-z0-9-]+\/[a-z0-9-]+\.webp$/),
  alt: z.string().trim().min(8).max(180),
  width: z.number().int().positive().max(4000),
  height: z.number().int().positive().max(4000),
  caption: z.string().trim().min(5).max(220),
  credit: z.string().trim().min(2).max(120),
  capturedAt: z.string().date().optional(),
}).strict();

const placeSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string().trim().min(2).max(120),
  category: z.enum(['park', 'trail', 'public-place', 'business']),
  description: z.string().trim().min(15).max(300),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  evidenceIds: z.array(z.string()).min(1).max(5),
}).strict();

export const neighborhoodPresentationSchema = z.object({
  schemaVersion: z.literal(1),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  status: z.enum(['draft', 'published']),
  cover: photoSchema.optional(),
  photos: z.array(photoSchema).max(6),
  map: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    zoom: z.number().min(8).max(17),
  }).strict().optional(),
  places: z.array(placeSchema).max(8),
  localNote: z.object({
    text: z.string().trim().min(20).max(600),
    author: z.string().trim().min(2).max(120),
    visitedAt: z.string().date(),
  }).strict().optional(),
}).strict();

export type NeighborhoodPresentation = z.infer<typeof neighborhoodPresentationSchema>;
```

Validate unique place IDs and resolve each place's evidence IDs against its joined guide. Add appropriate official source records to the existing guide when a new place needs evidence. Map coordinates are editorial data that must be checked; do not fill them from an unreviewed model response.

Do not add a market-stat block until there is a dated, licensed source and an agreed refresh rule. The first release can be useful without invented prices or trends.

### 8.3 Preserve Expiry Filtering

Existing guide sections are filtered by evidence expiry at read time. Apply the same rule to place facts and map pins:

```ts
function hasCurrentEvidence(
  ids: string[], evidence: NeighborhoodGuide['evidence'], today: string,
) {
  return ids.every((id) => {
    const source = evidence.find((item) => item.id === id);
    return Boolean(source && (!source.expiresAt || source.expiresAt >= today));
  });
}
```

The guide loader already uses a UTC calendar date. Retain that documented convention for source expiry, or change both existing and new loaders deliberately with a tested timezone policy. Do not accidentally mix UTC expiry and Chicago wall-clock comparisons.

If a presentation loses all valid places, hide the places/map-pin subsection and keep the guide's remaining valid sections. A source expiry should not break the page.

### 8.4 Homepage Guide Preview

Create `HomeNeighborhoodPreview` with up to three joined guide cards. Each card shows:

- Approved cover photo, when available.
- Actual guide title and short summary.
- Coverage label such as city or neighborhood.
- The real review date.
- A link to `/neighborhoods/<slug>`.

Use a two- or three-column editorial grid on desktop, stacked cards on mobile. Avoid a carousel for the first release; a small visible set is easier to navigate and requires no new client code. Draft photo records fall back to a text card, not a stock image presented as that neighborhood.

### 8.5 Guide Article Layout

Target article order:

```text
Back to Local Guides
Guide title, scope, short introduction
Cover photograph and caption
Reviewed date and source access
One approved personal observation, if available
Map launcher and nearby place list
Existing source-linked guide sections
Additional approved photographs
Seller-plan request link
```

Use `NeighborhoodGuideHeader`, `NeighborhoodPlaces`, and existing evidence rendering. Do not convert the entire article into a client component to support one map. Keep text and source links server-rendered.

Replace existing broad disclaimer paragraphs with concise, locally relevant notes only where the underlying content still needs that qualification. Preserve address-specific verification for school assignment, HOA details, and travel times. Do not introduce claims about who a neighborhood is suited for based on protected characteristics.

### 8.6 Local Observations

An authored note should be attributed and based on an actual visit. Example structure:

```text
From <approved author's name>
<One concrete observation from a visit, in the author's own words.>
Visited <actual date>
```

The placeholders above are editorial instructions, not public text. Until the author supplies a real note, omit this block. Do not simulate a visit or write a first-person endorsement on someone's behalf.

### 8.7 Map Implementation

Reuse the installed `react-map-gl` and Mapbox setup demonstrated by `KcdGroupAreaMap`, but create a separate neighborhood map that accepts data instead of copying the Arlington constants. Keep the KCD component unchanged in this release.

```tsx
type NeighborhoodMapProps = {
  center: { latitude: number; longitude: number; zoom: number };
  places: Array<{
    id: string;
    name: string;
    latitude: number;
    longitude: number;
  }>;
};
```

Load the map only after `Open Area Map` is selected. Keep the textual places list and Explorer link visible before and after launch. Use the existing Explorer query shape:

```ts
const explorerHref = `/explorer?${new URLSearchParams({
  lat: String(center.latitude),
  lng: String(center.longitude),
})}`;
```

Do not call live geocoding on every page view. Coordinates are reviewed static data. Do not draw a school zone or neighborhood boundary unless an appropriate source supplies that boundary and its use is permitted.

Requirements for the map:

- Provider attribution remains visible.
- Place markers have button labels and keyboard access.
- A selected place can also be reached in the text list.
- Scroll-to-zoom does not trap ordinary article scrolling.
- Missing token or failed map load preserves the list and Explorer link.
- Map errors use visitor-facing wording, not environment variable names.
- An unmount removes listeners and the WebGL instance through the library lifecycle.

### 8.8 Metadata and Freshness

- Keep `/neighborhoods` and existing guide URLs stable.
- Extend metadata with an approved cover as an Open Graph image where appropriate.
- Use actual `reviewedAt` for sitemap dates.
- Do not update the review date because a build ran or a page was visited.
- The existing detail route is `force-dynamic`; keep that until expiry behavior has been tested under any proposed caching change.
- Do not add a daily content-generation cron for this feature.
- If editor review reminders are needed, use existing planner tasks with due dates and reminders. Publication and fact checking remain human actions.

### 8.9 Content Acquisition Checklist

For each of the three existing guides, gather:

1. One approved cover photograph.
2. Two or three additional photos if they add useful context.
3. Accurate captions and photo credits.
4. A checked map center.
5. Up to five places with current evidence and coordinates.
6. An optional actual local observation from the approved author.

Store a small optimized set. Set a reviewed budget of roughly 200 KB for a cover and 150 KB for each secondary photo as a starting target, increasing only when visual quality requires it. The first image on a detail page and its card crop can share one source with appropriate Next image sizing.

### 8.10 Acceptance Criteria

- Published text-only guides continue to render without presentation records.
- Draft presentation content never reaches the public page.
- Unknown evidence IDs fail validation before publication.
- Expired place evidence removes both the fact card and its pin.
- Source links, captions, and photo credits remain accessible.
- The map does not load until requested.
- Map failure does not block reading the article.
- Existing guide URLs remain valid.
- Local observations have a real author and actual visit date.
- No live valuation, school assignment, HOA amount, or commute claim is inferred from a general guide.

## 9. Workstream Six: Optional Interactive Features

### 9.1 Separate Navigation from Rendering

Keep direct links to Atlas, Explorer, property search, and the appropriate public experiences. A visitor should not need to enter a 3D scene to navigate the site.

Create `HomeExploreSection` as a server component. It renders a small set of plain destination links and static preview cards for the existing globe and platform map. Preview captures should come from the actual product with no private operator data. They should not show fabricated listings or statistics.

In the first release, the hero's seller content becomes the single main introduction. The former cinematic hero becomes an optional exploration panel further down the page. Preserve the existing standalone `/atlas` experience.

### 9.2 Explicit Import Boundary

Create `InteractiveExperienceLauncher.tsx` as a small client island. Use imports inside a user action rather than mounting the current `ssr: false` components during initial render:

```tsx
'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState, type ComponentType } from 'react';
import { InteractiveExperienceBoundary } from './InteractiveExperienceBoundary';

type ExperienceKind = 'globe' | 'world';
type Preview = { src: string; alt: string; width: number; height: number };

const loaders: Record<ExperienceKind, () => Promise<ComponentType>> = {
  globe: () => import('@/components/CinematicHero').then((module) => module.default),
  world: () => import('@/components/world/VirtualWorldHub').then((module) => module.default),
};

export function InteractiveExperienceLauncher({
  kind, title, preview, directHref,
}: {
  kind: ExperienceKind;
  title: string;
  preview: Preview;
  directHref: string;
}) {
  const [Experience, setExperience] = useState<ComponentType | null>(null);
  const [state, setState] = useState<'idle' | 'loading' | 'ready' | 'failed'>('idle');
  const [message, setMessage] = useState('');
  const generation = useRef(0);
  const pending = useRef(false);
  const launchButton = useRef<HTMLButtonElement>(null);
  const activeRegion = useRef<HTMLDivElement>(null);

  useEffect(() => () => { generation.current += 1; }, []);
  useEffect(() => {
    if (state === 'ready') activeRegion.current?.focus();
  }, [state]);

  async function launch() {
    if (pending.current || state === 'ready') return;
    pending.current = true;
    const current = ++generation.current;
    setState('loading');
    setMessage('Loading the interactive view…');
    try {
      const Loaded = await loaders[kind]();
      if (generation.current !== current) return;
      setExperience(() => Loaded);
      setState('ready');
      setMessage('');
    } catch {
      if (generation.current !== current) return;
      setState('failed');
      setMessage('The interactive view could not open. You can still use the links below.');
    } finally {
      if (generation.current === current) pending.current = false;
    }
  }

  function close() {
    generation.current += 1;
    pending.current = false;
    setExperience(null);
    setState('idle');
    setMessage('');
    requestAnimationFrame(() => launchButton.current?.focus());
  }

  return (
    <section aria-label={title} className="overflow-hidden rounded-2xl border border-white/15">
      <div hidden={state === 'ready'}>
        <Image {...preview} sizes="(min-width: 1024px) 50vw, 100vw" className="aspect-[16/10] w-full object-cover" />
      </div>
      <div className="flex flex-wrap items-center gap-4 p-5">
        <h3 className="mr-auto text-2xl">{title}</h3>
        <button ref={launchButton} type="button" disabled={state === 'loading' || state === 'ready'} onClick={launch} className="min-h-12 rounded-xl border border-teal-100/40 px-5">
          {state === 'loading' ? 'Opening…' : 'Open Interactive View'}
        </button>
        <Link href={directHref} prefetch={false} className="inline-flex min-h-12 items-center underline underline-offset-4">Open Page</Link>
      </div>
      <p role="status" className="px-5 text-sm text-slate-300">{message}</p>
      {Experience && (
        <div ref={activeRegion} tabIndex={-1} aria-label={`${title} interactive view`}>
          <div className="p-5"><button type="button" onClick={close} className="min-h-12 underline">Close Interactive View</button></div>
          <InteractiveExperienceBoundary onReset={close}>
            <Experience />
          </InteractiveExperienceBoundary>
        </div>
      )}
    </section>
  );
}
```

This is the starting implementation. Refine the launcher after the browser checks. `ComponentType` uses the existing components' empty prop interfaces; if either gains required props, type the loader map accordingly rather than casting to `any`.

The initial page must not import a heavy runtime through another static module path. Keep the launcher import graph small. `prefetch={false}` is deliberate for heavy direct destinations; validate that the selected route's bundles are not prefetched before launch.

### 9.3 Error Boundary

Create `InteractiveExperienceBoundary.tsx`:

```tsx
'use client';

import { Component, type ReactNode } from 'react';

type Props = { children: ReactNode; onReset: () => void };

export class InteractiveExperienceBoundary extends Component<Props, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (this.state.failed) {
      return (
        <div role="status" className="p-6">
          <p>The interactive view is unavailable. The rest of the site still works.</p>
          <button type="button" onClick={this.props.onReset} className="mt-4 min-h-12 underline">Return to Preview</button>
        </div>
      );
    }
    return this.props.children;
  }
}
```

This boundary catches render/lifecycle errors, not every asynchronous WebGL or fetch failure. Retain and test the existing scene's context-lost handler and fetch fallbacks. Failed dynamic imports use the launcher's separate catch path. The ordinary navigation links remain outside the failing subtree.

### 9.4 Reduced Motion and Resource Cleanup

- Do not automatically launch based on entering the viewport.
- Reduced-motion preference keeps the default preview static.
- After an explicit launch, disable automatic globe rotation and decorative scene movement for reduced-motion users. Plumb a `reducedMotion` prop through `CinematicHero`, `AtlasGlobeBackground`, and the existing `spinSpeed` configuration.
- In `VirtualWorldHub`, avoid the delayed departure animation for reduced motion and pause decorative `Float` motion where supported by the current component.
- Closing the view unmounts its Canvas and fetch effects.
- Confirm fetches use cancellation where supported; `AtlasGlobeBackground` currently prevents stale state but does not abort the fetch. Add `AbortController` there as part of this cleanup.
- Test repeated open/close cycles for duplicate listeners, repeated preview requests, and abandoned animation loops.
- On a hidden browser tab, stop unnecessary animation where the existing rendering library supports it. Do not add a new perpetual timer to monitor visibility.

### 9.5 Public World-Map Content

The world endpoint registry contains public routes and operator/research destinations. Do not treat hiding a node as authorization. Keep route-level authentication in place.

For the homepage version, define a reviewed public subset by IDs in a small pure module. The subset should include only working visitor destinations. Internal API paths, cartridge diagnostics, endpoint methods, and provider states should not become public navigation copy.

If changing `VirtualWorldHub` to accept an endpoint list, retain its current default for existing full-tool callers:

```tsx
type Props = { endpoints?: readonly WorldEndpoint[]; reducedMotion?: boolean };

function VirtualWorldHub({ endpoints = WORLD_ENDPOINTS, reducedMotion = false }: Props) {
  // Derive active endpoint, scene nodes, and previews from `endpoints` consistently.
}
```

Do not filter only the cards while leaving hidden nodes selectable in the scene. Ensure an empty subset renders an ordinary navigation fallback. If scene refactoring is too broad for this release, keep the full platform map on its existing tool surface and offer only a static preview plus direct public links from the homepage.

### 9.6 Audit the Root Layout Import Graph

Inspect `app/layout.tsx`, global chrome, `GlobalMarketPulse`, `SunsetPowerSyncProvider`, and their request behavior. The inspected `focusedSurfaces.ts` does not currently classify `/` as lightweight. Do not change that by blindly adding `/` to prefix matching: every pathname starts with `/`.

If measurements establish that homepage sync or a global ticker is unnecessary, add an exact route decision and keep it distinct from the existing generic lightweight policy:

```ts
export function isMainMarketingSurface(pathname?: string | null) {
  return pathname === '/' || pathname === '/seller-plan' || pathname === '/neighborhoods'
    || Boolean(pathname?.startsWith('/neighborhoods/'));
}
```

Use this only at the narrowly justified provider/ticker boundary. Do not accidentally bypass site configuration needed for branding, agent routing, compliance, auth, or tenant headers. Do not classify all `/contact` or tenant pages as lightweight without checking their actual needs.

### 9.7 Performance Evidence

Measure a production build or a consistent deployed preview, not Next development compilation time. Record the same device/network conditions before and after.

Initial-load checks:

- No Atlas globe API request before launch.
- No world endpoint-preview request caused by a mounted scene before launch.
- No Three.js / globe scene runtime in the initial homepage execution path.
- No map-provider request from neighborhood articles before opening a map.
- Static preview and portrait assets have bounded dimensions and byte size.
- The primary seller action works before either optional experience loads.

Interaction checks:

- Opening each experience requests its own runtime/data and reaches usable controls.
- Closing it removes the scene.
- A failed chunk or WebGL context preserves ordinary links.
- A visitor can use the site with JavaScript disabled for ordinary navigation and content. The seller submission still requires JavaScript unless a separate progressive-enhancement task is added.

Performance targets to validate, not pre-existing measured results:

| Measurement | Target |
| --- | --- |
| Homepage LCP | Aim for 2.5 seconds or better under the agreed mobile test profile |
| CLS | 0.1 or lower |
| INP | Aim for 200 ms or lower using suitable interaction/field evidence |
| Initial scene data/API requests | Zero before launch |
| Layout at 320/390/768/1440 px | No horizontal overflow |
| New static preview source | Prefer under 150 KB per image |

A single Lighthouse run does not prove field INP. Report lab comparisons separately from real visitor metrics. Reuse existing measurement infrastructure where present; do not add contact-form tracking or a new analytics database to satisfy a performance task.

### 9.8 Acceptance Criteria

- Direct navigation works without the scenes.
- A scene is imported/mounted only after explicit launch.
- A user can cancel/close and focus returns to the launcher.
- Import failure, fetch failure, and WebGL failure each have a usable fallback.
- Reduced-motion behavior is checked before and after launch.
- Initial requests and bundle evidence establish the intended resource reduction.
- The existing Atlas and other standalone experiences continue to work.
- Removing homepage scene mounts does not change KCD behavior.

## 10. Implementation Order and Reviewable Pull Requests

Implement this sequence with one agent. No delegated work, parallel agents, or separate autonomous tasks are needed.

### PR 1: Homepage Composition and Explicit Experience Launching

Workstreams 1 and the initial portion of 6 belong together because removing the immediate scene mounts is what makes the new order useful.

1. Refresh main and record the starting browser screenshots and production-build request baseline.
2. Extract `CounterScanActions` with unchanged destinations/access behavior.
3. Add `/how-it-works` and its footer/sitemap links.
4. Add static experience previews and the small launcher boundary.
5. Move the existing cinematic/world components behind explicit launch.
6. Move listings ahead of technical/experimental content and cap the homepage selection.
7. Remove the main-page architecture mount.
8. Update the existing browser acceptance script's old selectors.
9. Check ordinary navigation, scene launch/close, reduced motion, and data-unavailable states.
10. Open a PR with before/after screenshots and the request comparison.

If preview captures are not ready, a locally authored static layout with destination links can ship first. Do not use a fake screenshot. Commit order within this PR: extraction, new destination, launcher, recomposition, acceptance updates.

### PR 2: Approved Personal Introduction

1. Define and validate the public-profile schema.
2. Add the server loader and a draft content record.
3. Implement the introduction component and contact link presentation.
4. Obtain the actual portrait and approved biography/contact information.
5. Optimize the approved image and record dimensions.
6. Publish the record and integrate it on homepage/seller page.
7. Verify the shown contact against the configured seller process.

The component and draft path can be reviewed before content approval. Keep the public section absent until the required content is approved. Continue independent work while waiting for assets.

### PR 3: Seller Examples

1. Add schema and reviewed illustrative tasks.
2. Build the preparation-plan sample.
3. Build the pricing-review explanation and validated preselection link.
4. Add the authorized property presentation image if available.
5. Replace the old homepage value-proposition grid usage.
6. Reuse the sample on `/seller-plan` without duplicating a long checklist.
7. Verify no fabricated outcome, client data, or unsupported valuation appears.

### PR 4: Stepped Request and Saved Confirmation

1. Extract typed draft state and payload builder.
2. Add radio-card choices using the existing enum values.
3. Implement step navigation, focus, and progress text.
4. Preserve consent, UTM handling, honeypot, and retry identity.
5. Render the saved confirmation.
6. Update optional measurement to ignore intermediate submits.
7. Extend existing tests for validation and uncertain delivery.
8. Ship without public appointment selection if the scheduling foundation is not ready.

### PR 5: Photo-Led Guides

1. Add the presentation schema and source-aware join.
2. Keep existing guide schema/content compatibility.
3. Build guide cards and article presentation.
4. Add approved photo records, captions, and checked place coordinates.
5. Add the requested map launcher and textual fallback.
6. Preserve expiry filtering and metadata dates.
7. Integrate the homepage preview.
8. Check the guide with full, partial, missing, draft, and expired presentation data.

### PR 6: Confirmed Seller Booking

1. Identify and verify the active scheduling authority.
2. Implement availability and atomic reservation behind the adapter interface.
3. Review all conflicting booking writers and protect the shared invariant.
4. Add any narrowly required migration and database acceptance tests.
5. Extend the existing seller save result with server-only identity.
6. Mint and verify the scoped, expiring booking capability.
7. Add the two same-origin public routes with bounded requests.
8. Build the slot picker and reservation confirmation.
9. Connect durable reminder intent through the existing scheduler.
10. Test conflicts, replay, expiry, provider uncertainty, and consent changes.
11. Enable the public calendar only after those checks pass against the intended environment.

This is a separate backend-bearing PR because its correctness requirements differ from a visual form change. Workstream 3 is complete only when both the visual flow and the verified scheduling handoff are complete, or when the unavailable capability is explicitly accepted as a deferred feature.

### PR 7: Measured Performance Refinements

1. Compare the first release against the baseline under the same profile.
2. Refine only the root-layout/provider work shown to affect these routes.
3. Finish scene cleanup and reduced-motion propagation.
4. Verify direct routes still work independently.
5. Publish the measured asset/request/interaction evidence in the PR.

This is not a requirement to create seven PRs regardless of scope. Small compatible stages can be combined after implementation review. Do not combine unverified booking migrations with a typography or photograph patch.

## 11. Meaningful Verification

No new runtime tests are necessary merely to save this plan. The tests below are implementation requirements for behavior that changes.

### 11.1 Preserve Existing Targeted Tests

Start with these existing suites when their areas change:

```powershell
# Working directory: C:\Users\Taz\SunsetPulse\apps\pulse
npm run typecheck
npm run test:unit -- tests/unit/seller-plan-request-form.test.tsx tests/unit/seller-plan-lead-route.test.ts tests/unit/seller-offer-measurement.test.tsx tests/unit/neighborhood-guides.test.ts
```

Run ESLint against only edited TS/TSX/JSX modules during each step, followed by the required repository CI checks for the final change. Do not repeatedly run the complete suite after every static-copy edit.

### 11.2 State and Intake Regressions

Extend `seller-plan-request-form.test.tsx` to cover:

- Selecting pricing review survives both subsequent steps.
- Going Back retains timing and contact input.
- Intermediate Enter does not call `/api/lead-magnets`.
- Unchecked response consent blocks submission.
- Marketing consent remains false unless explicitly selected.
- Failed save keeps the selected choices and contact details.
- Identical retry sends the same `submissionId`.
- Edited details send a new `submissionId`.
- A confirmed save shows the correct request summary.
- Optional measurement is disabled by default and does not count Continue actions as a request.
- Booking-unavailable confirmation still reports the already-saved request.

Use existing strict-schema assertions on the submitted payload rather than matching only the visible success text.

### 11.3 Guide Regressions

Extend guide tests to cover:

- Existing v1 JSON fixtures still parse.
- A missing presentation does not remove the guide.
- A draft presentation is omitted.
- Unknown place evidence references are rejected.
- Expired evidence removes the place and pin together.
- A missing optional photograph leaves a readable guide card.
- No map import occurs before the visitor launches it.
- Review dates reflect source review, not current render time.

Use fixed dates in expiry tests. Do not rely on the date when CI happens to run.

### 11.4 Booking Correctness Matrix

| Scenario | Required result |
| --- | --- |
| Two reservations for the same resource/slot race | One confirmed; the other receives conflict |
| Same booking operation retried after timeout | Same durable reservation, one attendee/reminder intent |
| Request ID reused with different slot/details | Conflict, not a silently reused wrong reservation |
| Token signature changed | Rejected without creating a booking |
| Token expired | No booking; saved lead remains intact |
| Token belongs to another tenant | No cross-tenant read or booking |
| Lead archived or consent revoked after token issuance | Re-check current policy; do not rely on stale token claims |
| Calendar dependency unavailable | Clear unavailable result; no fabricated slots |
| Server reserves successfully but client loses response | Retry resolves the original reservation |
| External reservation succeeds but projection fails | Durable reconciliation converges without another provider booking |
| Attendee write fails | No falsely complete local booking transaction |
| DST boundary or non-Chicago visitor | Same absolute slot displayed and reserved correctly |
| Booking cancelled after reminder queued | Existing reminder execution re-check prevents stale send |

Use a disposable database/provider sandbox for these mutation tests. Existing seller/planner authorization suites should continue to pass. Do not test a reservation race by inserting real appointments into the production calendar.

### 11.5 Browser Journeys

Add focused Playwright coverage for ordinary visitors, not only local operator mode. The default Playwright configuration currently enables `E2E_OPERATOR_ACCESS`, and `getOperatorAccess` also permits localhost. That setup cannot establish that anonymous production users lack operator links. Test denial with an appropriate production-like request host/configuration or a focused server composition test that supplies an explicit denied access result.

Journey A: homepage to seller request:

1. Open the homepage.
2. Confirm there is one h1 and the primary seller action is reachable.
3. Read the personal introduction when published.
4. Open an example and request pricing help.
5. Choose timing, enter contact details, and grant response consent.
6. Submit against a controlled local/disposable intake dependency.
7. Verify the exact payload contract and saved confirmation.
8. Exercise a controlled failed-save state and retry.

Journey B: guide reading:

1. Open a guide from the homepage.
2. Verify image caption, review date, and source links.
3. Confirm no map network/runtime request before launch.
4. Open the map and select a reviewed place.
5. Simulate map failure and verify textual destinations still work.

Journey C: optional scenes:

1. Record homepage requests before interaction.
2. Verify `/api/tah/atlas/globe` is absent.
3. Launch the globe and verify its request occurs.
4. Close it and verify focus returns to the launcher.
5. Repeat for the platform map.
6. Simulate chunk failure and preserve direct links.
7. Repeat with reduced motion.

An example network assertion for the existing globe endpoint:

```ts
const requested: string[] = [];
page.on('request', (request) => requested.push(new URL(request.url()).pathname));
await page.goto('/');
await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
await expect(page.getByRole('link', { name: 'Request My Free Seller Plan' })).toBeVisible();
expect(requested).not.toContain('/api/tah/atlas/globe');

const globe = page.getByRole('region', { name: 'Explore the Atlas', exact: true });
const globeRequest = page.waitForRequest((request) => new URL(request.url()).pathname === '/api/tah/atlas/globe');
await globe.getByRole('button', { name: 'Open Interactive View', exact: true }).click();
await globeRequest;
```

Use `Explore the Atlas` as the corresponding launcher title/accessible name, or update both together. Do not make the assertion pass by removing the request from an otherwise broken experience. Follow the request check with a usable rendered-control assertion and a verified fallback case.

### 11.6 Repair the Existing Homepage Acceptance Script

`scripts/homepage-browser-acceptance.mjs` currently expects:

- A `Hide Interface` button before user interaction.
- A heading named `Technical Architecture` on the homepage.
- Particular old banner capitalization.

These assumptions already differ from portions of the current page and will differ further after this plan. Update it to test the new public behavior, preserving its useful data-unavailable, overflow, and keyboard checks. Relocate the scene-specific Hide/Show inertness checks to after explicit launch. Check `/how-it-works` separately for technical content. Do not delete useful assertions just to make the script pass.

### 11.7 Screenshot Set

Capture consistent before/after evidence at 1440, 768, 390, and 320 px:

- Homepage top and complete section order.
- Personal introduction and portrait crop.
- Seller example beside the request introduction.
- Each form step, failed save, and saved confirmation.
- Guide card grid and one complete guide.
- Static experience preview, launched scene, and failure fallback.

Hide Next development overlays in review screenshots, but record actual browser exceptions separately. Do not hide application errors with screenshot styling. Include ordinary and reduced-motion runs where behavior differs.

## 12. Storage, Configuration, and Publication

### Expected Storage Changes

| Area | New persistent data | Storage approach |
| --- | --- | --- |
| Homepage composition | None | Existing code and listings |
| Public introduction | One small reviewed record and portrait | Repository files |
| Seller examples | Small text record and optional photo | Repository files |
| Stepped form | Existing lead rows only | Existing intake; no step-by-step draft writes |
| Guides | Small presentation records and optimized photos | Repository files |
| Optional experiences | Static captures | Repository files; existing data sources after launch |
| Booking | Existing scheduling records plus any required reservation intent | Existing authority; narrowly scoped schema extension if needed |

Do not add a click-event row for every radio selection. Do not save duplicate copies of every photo at several arbitrary resolutions. Use image delivery sizing from a small reviewed source set.

### Configuration Checklist

- Keep `KELLER_WESTLAKE_AGENT_SITE` as server-side seller destination configuration.
- Confirm that its tenant is published/active and has the intended agent before end-to-end intake verification.
- Reuse `NEXT_PUBLIC_MAPBOX_TOKEN` for requested maps; its provider-side restrictions still matter.
- Add a server-only booking signing key only if using the signed-capability design; verify the deployment secret mechanism before choosing a key name and rotation policy.
- Do not put a signing key or provider credential in `NEXT_PUBLIC_*`.
- Do not add new cron entries merely for section order, profile publishing, or static guides.
- Use the existing durable scheduler for actual follow-up/reminder work, with its existing retry and retention rules.
- Do not use KCD's publication flag or contact data to control the main-site seller flow.

### Publication Inputs Still Needed

| Input | Blocks | Independent work that can continue |
| --- | --- | --- |
| Approved seller contact identity/biography | Publishing the introduction | Schema, layout, intake, examples, launchers |
| Approved portrait | Publishing the portrait block | Draft component and all other work |
| Approved local photos/captions | Photo-led guide publication | Existing text guide layout, schema, source filtering |
| Approved property marketing example | That example panel only | Preparation sample and pricing outline |
| Active scheduling authority and event configuration | Real public appointment selection | Saved-request flow and the other workstreams |

There is no need to stop the entire release while one photo or calendar connection is pending. Keep the relevant public block unpublished or its optional capability unavailable, and finish the independent code.

## 13. Completion and Rollback

Each implementation PR should describe its changed visitor behavior, specific review URLs, real verification results, and remaining content/integration dependencies. The wording in this plan must not be copied into a PR as if tests have already passed.

Completion means:

- The homepage presents the intended order and primary action.
- The published introduction uses approved identity and contact content.
- The request flow preserves consent, attribution, and idempotency.
- Seller examples show the real offered process without invented outcomes.
- Guides are visually richer while keeping evidence/expiry behavior intact.
- Scenes and maps launch intentionally and preserve usable fallbacks.
- Scheduling is either verified end to end and enabled, or explicitly recorded as the remaining incomplete portion of workstream three.
- Current required CI checks pass for each PR.
- Screenshots and request/performance evidence match the implementation actually being merged.

For rollback, composition/content/launcher PRs can be reverted independently. Turn off only the new public booking entry point if the calendar integration fails; do not delete saved leads or cancel appointments as a visual rollback. Any schema change should be additive where possible and have its own reviewed migration/rollback instructions. Existing bookings and reminders need a data-aware recovery process rather than a blanket code revert.

## 14. First Coding Session

The first implementation session should complete a concrete reviewable slice:

1. Refresh `origin/main` and inspect local changes before switching branches.
2. Create a `codex/` branch from the verified current base.
3. Capture the existing homepage layout and initial scene requests.
4. Extract the bottom banner unchanged.
5. Add the technical-content destination and footer link.
6. Add one static Atlas preview with explicit launch and normal navigation.
7. Reorder the homepage without inventing missing personal content.
8. Run targeted lint/typecheck and browser checks for that slice.
9. Capture desktop/mobile screenshots and initial-request evidence.
10. Commit and open a focused PR once implementation is requested.

This document itself changes no public page, database, environment variable, cron schedule, booking, or production deployment.
