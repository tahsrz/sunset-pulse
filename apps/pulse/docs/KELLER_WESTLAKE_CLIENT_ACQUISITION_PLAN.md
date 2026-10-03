# Keller / Westlake — Year-End Client Acquisition Plan

Created September 30, 2026. Owner: Taz. Target: one completed transaction by December 31, 2026. This is an operating target, not a promise or conversion forecast.

Status: **G1–G3 implemented locally on `codex/seller-acquisition-2026q4`; not deployed or production-accepted**. The repository now contains the seller offer, three reviewed guide pages and bounded first-party lead intake. Required site/environment configuration and real authenticated-owner/browser acceptance remain outstanding. No social account posting, live email, advertising spend, provider activation or production release is authorized by this document alone.

## 1. Seller-first strategy and the first offer

User reports zero hits and zero prospects; independently verify measurement before treating that as a measured traffic baseline. Prioritize useful conversations and appointments over another quarter of infrastructure. Keep one Keller / Westlake service area, but do not pretend the two markets, school systems or price bands are interchangeable. Taz has confirmed 20–30 hours/week and wants sellers first, with commercial real estate eventually. Residential seller acquisition is the immediate priority.

**The business:** represent sellers in selling their homes to buyers. Seller lead generation is the entry point—not the finished service, selling lead data, or merely selling guides. Buyers viewing a seller's authorized listing are the demand side; they do not automatically become represented buyer clients.

**Primary seller offer:** “Sell your Keller or Westlake home with a clear plan.” Supporting copy: “Pricing, preparation, buyer-facing marketing, showings and offer guidance—from your first conversation through closing. Start with a free, personally reviewed seller plan.” This is a CMA request and human service, not an appraisal, guaranteed selling price or instant algorithm. Do not display a price until actual evidence has been reviewed.

Primary button: **Request my free seller plan**. Secondary button: **Read the local guide**. The ungated seller checklist provides immediate value; the personalized CMA follows actual data review and a real conversation. Show verified license-holder identity, actual sponsoring brokerage and required notices; no invented reviews, sold properties, credentials or results.

Use an ungated seller-preparation checklist and neighborhood summary, then optional email delivery/personalization and a 15-minute seller consultation. A download is not consent to an ongoing newsletter, calls or texts. Initial fields: name/email for requested contact, buying/selling/both, and optional timing. Phone, budget and address belong in optional next-step questions. Do not require sensitive finances to read the guide.

Initial seller checklist/guide can be an HTML page with print styling, not a heavy PDF or another cloud bucket. If there is no authorized current market dataset, publish the neighborhood/ownership-cost guide first. Do not title it a current market report until its statistics are real, dated and permitted for publication.

### How the existing engine becomes useful

Seller inquiry → personal consultation → broker-approved listing agreement → verified listing/preparation → buyer-facing promotion → showing/inquiry → seller-reviewed offers → contract milestones → closing.

The content loop supports this transaction loop: weekly draft work → source check → owner review → approved guide/video → tracked inquiry. A content view is not a sale.

The scheduler creates research, recording and follow-up tasks. Jamie organizes facts/questions and drafts scripts. The owner verifies local claims, records the videos, meets people and approves exact public content. Neither a task completion nor an AI lead score counts as a real prospect. Current provider-disabled workflows cannot be represented as autonomous public publishing.

Start the growth track independently of 3D reconstruction. Prioritize G1–G3 plus Praxis R1 before marketing-email automation; R4–R8 scan work is not a prerequisite to acquiring a customer.

### Confirmed commercial direction — later, not abandoned

Begin commercial specialization with broker mentorship, permitted deal observation and one selected niche: owner-user businesses, small retail/office, or land. Old Town Keller land is a research candidate, not a promised commercial deal: resolve zoning, permitted uses, utilities/access, development constraints and parcel identity. Commercial content eventually needs lease/expense/occupancy and permitted-use evidence rather than residential CMA assumptions. Do not run paid commercial prospecting, publish cap rates or imply expertise without evidence. After the residential acquisition loop works, add a reviewed commercial guide/intake branch to the same engine; do not build a second CRM or scheduler.

## 2. Inspected code and gaps

| Existing source | What it currently does | Acquisition implication |
| --- | --- | --- |
| `app/page.tsx:HomePage` / `CounterScanActions` | Grill/explorer banner before client-loaded hero, then platform map, animals, listings and history | First screen lacks one local real-estate offer; retain aesthetic but move secondary experiences below it |
| `components/home/HomeDynamicSections.tsx` | Hero/map dynamically load without SSR | Render the offer and core links on the server; decorative scene must not delay copy or form |
| `app/api/leads/route.ts:POST` | Generic Mongo intake, intelligence processing, Supabase sync and notification | Do not point the new magnet here unchanged: anonymous capture must not require paid AI/property hydration or synchronous cross-store success |
| `app/api/sites/leads/route.ts:POST` | Published-site routing, server-derived agent ownership, honeypot, idempotency and lead notification | Seller intake uses the same `agent_site_leads` store but a dedicated route; it deliberately does not invoke this route's outbound notification side effect |
| `lib/sites/leadOperatingSystem.ts` | Lead status and next-action recommendations | Reuse owned lead inbox and genuine customer-reply/appointment evidence; keep marketing attribution bounded |
| `app/api/contact/route.ts:POST` | Validated contact email, no durable prospect receipt before delivery | Keep as contact path; it is not a complete capture/CRM pipeline |
| `app/api/valuation/route.ts:POST` | ATTOM/Bridge calls with invented fallback price/details; confirm mutation lacks an explicit owner/role check in this handler | Do not promote as a verified CMA; repair truth/access boundaries before any automated estimate feature |
| `app/sitemap.ts` | Homepage and TAH pages | Add published guide/offer URLs and real modification dates; do not index drafts or private inquiries |
| `lib/cms/vibeSchema.ts` | Theme/linguistic-token revisions | Vibe is not currently a neighborhood article schema. Do not store arbitrary guide facts as theme tokens |
| `lib/navigation/routeCatalog.ts` / root README | Application route catalog and user-facing path documentation | Add new public paths in both alongside route tests when implemented |

All proposed new paths below are **new**, unless explicitly marked existing. Paths are relative to `apps/pulse`, except the root `README.md`.

## 3. Ordered code implementation packets

### G1 — Above-the-fold offer and truthful routing

1. New `lib/marketing/acquisitionOffer.ts`: define a typed public offer descriptor with `key`, `version`, `title`, `summary`, `resourceSlug`, and `primaryAction`. Keep brokerage identity in existing verified site/profile configuration; do not put private credentials in public descriptors.
2. New `components/marketing/LocalGuideOffer.tsx`: render headline, useful preview, two explicit links and identity/notices as a Server Component. Accept serializable public content only. Preserve the current dark/teal/gradient aesthetic with readable body text and one clear primary action.
3. New `components/lead-capture/LocalGuideRequestForm.tsx`: isolate client form state; labelled controls, optional consent unchecked, keyboard error focus, pending/retry state, stable submission identity. No iframe/3D/map dependency in the form.
4. Existing `app/page.tsx:HomePage`: insert the offer before `HomeHero`. Reposition `CounterScanActions` below the real-estate offer instead of removing grill/explorer access. Retain operator-only operations gating. Match campaign landing copy to the offer.
5. Existing `app/home.module.css`: scoped readable spacing/widths; at 390×844 show the offer and primary CTA without requiring the globe to load. Test small desktop-height screens too. Do not override global typography across unrelated routes.
6. New `app/keller-westlake/page.tsx`: server-rendered area landing page with guide preview, source dates, seller-plan CTA and secondary buyer-guide CTA. No fabricated listing/current-market statistics.
7. New `app/keller-westlake/guide/page.tsx`: full HTML guide, print stylesheet and optional personalization request. Never promise an instant download or delivery until the actual resource/request path works.
8. Existing `app/contact/page.tsx`: accept only an allowlisted offer context, not executable query strings or trusted ownership IDs. If it cannot persist that context, use G3's form rather than pretending contact email is a saved lead.
9. Test 390/900/1440px, keyboard-only use, no WebGL, reduced motion and JS-disabled reading. No fake form success on unavailable backend.
10. Update route catalog, root README path table/explainer and applicable route-catalog tests in the same change.

Exit: a first-time visitor understands where you serve, what is free, who is helping and what happens after submitting.

### G2 — Source-backed neighborhood guides

1. New `lib/marketing/neighborhoodGuideSchema.ts`: strict Zod contracts; no HTML/script/executable expressions. Add `schemaVersion`, `slug`, `title`, `areaKey:'keller-westlake'`, `coverageType:'city'|'neighborhood'`, `status`, `revision`, `reviewedAt` and claim-level evidence.
2. Each evidence record contains `sourceUrl`, `publisher`, `retrievedAt`, `effectiveDate`, `scope`, `verificationStatus`, optional expiry and redistribution permission. Validate source URLs and content lengths; fetch nothing at public render time.
3. School entries: district/campus names, address-lookup link and applicable year. Property-specific assignment requires official address confirmation. Westlake Academy has separate residency/admission rules; never translate a seller's school claim into guaranteed eligibility.
4. HOA entries: named association/property scope, amount/currency, monthly/quarterly/annual frequency, effective date, what is included, transfer/resale fees and known special assessments separately. If not confirmed from permitted current documentation, display “Not verified—request current HOA documents,” not zero.
5. Commute examples: named origin/destination, mode, date/time window, route/source and illustrative estimate/range. Census community averages are not address-specific rush-hour estimates. Do not invent travel times or bypass a map provider's usage terms.
6. Lifestyle entries: objective parks/trails, grocery/dining, recreation and access features with sources. Do not describe who “belongs,” infer demographics or rank communities by protected characteristics.
7. New `content/neighborhoods/old-town-keller.v1.json`, `west-bursey-ranch.v1.json`, `westlake-overview.v1.json`: draft records first. Westlake overview must say city overview, not a fabricated single neighborhood. Listing descriptions remain supplied/unverified inputs, not official evidence.
8. New `lib/marketing/neighborhoodGuides.server.ts`: parse reviewed files; expose only published, source-valid revisions. Unknown slugs return not-found; stale critical claims display a warning or suppress that claim rather than silently asserting it.
9. New `app/neighborhoods/page.tsx` and `app/neighborhoods/[slug]/page.tsx`: Server Components with `generateMetadata`, canonical URLs, accessible sections/source cards and relevant seller-plan/guide CTA. Escape structured-data content; no invented ratings, FAQ promises or transaction claims.
10. Existing `app/sitemap.ts`: append published guide/area URLs using persisted review/update dates. Do not set all guide dates to every request's current timestamp. Draft/noindex isn't authorization to expose private source documents.
11. New `tests/unit/neighborhood-guides.test.ts`: reject malformed amounts, stale/unsupported claims, bad URLs and unreviewed publication; assert honest unknowns, verified-only metadata and source dates.
12. First release uses reviewed repository JSON with a release gate. A later editorial UI may reuse the existing revision/checkpoint engine, but must add a proper article schema—not abuse Vibe tokens or invent a second approval system.

Exit: three useful reviewed pages answer real questions, with explicit unknowns. Three trustworthy guides are preferable to hundreds of generated doorway pages.

### G3 — Capture a real inquiry without AI/storage dependency

1. New `lib/marketing/leadMagnetContract.ts`: strict input `offerKey`, `offerVersion`, `name`, `email`, optional `intent`, `timeframe`, optional contact details, separate `marketingOptIn`, allowlisted campaign attribution and `submissionId`. Server verifies offer version; client cannot assign agent/workspace.
2. Existing `app/api/sites/leads/route.ts`: extract reusable durable intake into `lib/sites/agentLeadIntake.server.ts` only as needed. Preserve existing Jamie/tenant checks and idempotency. First-party Sunset form resolves one configured published site/profile on the server; fail closed if it is not configured.
3. New `app/api/lead-magnets/route.ts`: bounded body, schema validation, first-party origin check, existing public rate limiter and honeypot; call canonical intake. Do not weaken tenant routing or trust an arbitrary submitted `agentId`/`site`.
4. Save the inquiry first using existing owned agent-site lead storage. Bind idempotency to configured site + submission ID; a repeated ID with changed payload is a conflict. Avoid revealing whether an email already exists.
5. Persist request scope, offer revision and timestamp separately from optional marketing consent. No automated text/call enrollment, purchased list or hidden opt-in.
6. Map non-sensitive `utm_source/medium/campaign/content` into bounded metadata. Strip PII and arbitrary URL queries; do not place email, phone or private address in analytics/logs.
7. Durable response returns a non-enumerable receipt/resource URL only after save. Notifications may fail without losing the inquiry; use existing intent/reconciliation services for retry rather than success-before-save.
8. Form success shows the actual guide and next step immediately. Offer optional 15-minute consultation/requested contact. Do not invent a booking confirmation: distinguish request from agent-confirmed appointment.
9. Existing `lib/sites/leadOperatingSystem.ts` and `app/admin/agent-leads`: show offer, source, stated timing and next action. Require recorded customer reply/confirmed booking before reporting engagement.
10. Use the shared scheduler/Realtor follow-up bridge for a human task due promptly during published working hours. Unsubscribe/revocation cancels marketing follow-up; a report request alone is not broad communication authority.
11. Add route/service tests for retry, conflict, origin/rate limits, wrong tenant, bad configured profile, consent false, offline notification and no provider calls. Verify anonymous browser → persisted lead → owned inbox → human response with disposable services.
12. Do not route anonymous magnet requests into valuation calls or generic paid `processLeadIntelligence`. No new Supabase file uploads: public guide is HTML and videos stay local/platform-hosted.

Exit: a real person can request help; one owned lead is saved once, and you can respond even if notification delivery fails.

### G4 — Market report and human-reviewed CMA

1. New `lib/marketing/marketReportSchema.ts`: publication-period, geographic/filter scope, source/license, sample count, metric definitions and reviewed revision. Missing sold data is unavailable, not manufactured.
2. New `content/market-reports` reviewed JSON fixtures: use authorized MLS exports or published local market sources; distinguish list price from sale price, active from closed, median from average and report period from retrieval date.
3. New `app/keller-westlake/market-report/page.tsx`: show dated charts/tables only when authorized valid data exists; otherwise point to the neighborhood guide. A shell with invented numbers is not launch-ready.
4. CMA request is a G3 offer variant with optional address collected privately. Human reviewer selects comparable sales and explains adjustments, scope/date/limitations; no appraisal or guaranteed selling-price claim.
5. Existing `app/api/valuation/route.ts`: separate demonstration data from real-provider output, remove invented fallback price/attributes in real mode, validate inputs and require authorized owner/operator scope on confirmation before promoting this route. Fail unavailable when source data cannot support a real estimate.
6. Market/CMA artifacts stay private until exact review. Prefer HTML/print; source-provider licensing controls what may be public. New broker-review requirements are release gates.
7. Tests prove empty providers cannot return a plausible “verified” price, foreign confirmation is denied, report scope/dates stay visible and corrections invalidate the earlier approval.

Exit: useful verified market evidence or a truthful manual CMA service—never a convincing-looking fake calculator.

### G5 — Short-video and distribution workflow

1. New `lib/marketing/videoBriefSchema.ts`: `topic`, `audienceNeed`, `hook`, `script`, `shotList`, `claimEvidence`, `listingPermission`, `ctaOfferKey`, `campaignKey`, `revision` and `reviewStatus`. No raw secrets or social tokens.
2. Add weekly planning items through existing sprint backlog/assignment services: three recording topics, one guide refresh, open-house preparation and follow-up. Reuse Monday planning; don't register unsupported autonomous executors.
3. Jamie drafts scripts/source questions through existing permitted services. Use existing checkpoint/review APIs for approval of exact script/caption/listing permission revision; changed claims require re-review.
4. Record one batch/week: three 20–45-second vertical videos, export clean without another platform's watermark, caption and adapt for TikTok, Reels and Shorts. This is a recommended experiment, not an algorithm guarantee.
5. Manual posting first. Retain published URL, date/platform, campaign and approved revision. Provider posting connectors stay disabled until separately reviewed/account-authorized. Videos live locally/in target social platform, not in the over-quota Supabase bucket.
6. Link the area landing page in the bio/profile where the account supports it; verify link availability on the actual account before promising it. Use supported clickable profile/description surfaces and one CTA, not unavailable features.
7. First scripts: “Three costs sellers forget before listing”; “One staging change before listing photos”; “What makes a comparable sale useful”; “Three HOA costs to ask about before an offer”; “A Westlake address is not a school-admission guarantee”; “What a drive-time example leaves out”; “One staging change you can make before photos”; “This listing's appeal—and the questions I'd verify.” Stats video only with real licensed period/source data.
8. Listing video uses owner/listing-broker permission, correct attribution, current status/date and permitted media. No implied “my listing” or sale-history claim for someone else's property.
9. Follow views with human outreach: answer relevant questions, offer the guide where permitted, invite an opt-in conversation. No automated mass DMs, unsolicited texts or groups spam.
10. After four weeks, keep topics/platforms producing qualified conversations; don't increase content volume purely for vanity views.

Exit: reusable approved content brings identifiable inquiries and conversations, with actual publication evidence rather than completed draft tasks.

### G6 — Weekly acquisition scoreboard

1. Add a bounded acquisition summary to existing lead/marketing admin services rather than another CRM. Track landing visits, offer actions, saved inquiries, actual replies, confirmed seller consultations, signed listings, buyer inquiries, actual showings, received offers, contracts and closed transactions. Use separate seller/business and listing/buyer-demand views; never expose buyer identities to public visitors.
2. Report by period and known campaign; explicitly mark direct/unknown attribution. Filter internal tests/obvious bots; browser privacy tools make attribution incomplete.
3. Use owned durable events for leads/appointments/stages; do not infer a reply from sending email or a sale from an assignment completion.
4. Keep optional web analytics separate from PII; never expose contact/address records in public dashboards. Respect applicable privacy/consent requirements and use aggregate metrics where possible.
5. Show response time, channel consent, overdue follow-ups, source quality and reasons opportunities stalled. Track actual advertising spend separately; no paid campaign without a chosen cap.
6. Preserve original arrival source and later touchpoints; do not overwrite them with last-click only. Give user a manual source correction with audit trail.
7. Weekly review: zero visits → distribution/measurement; visits/no requests → offer/trust; requests/no replies → contact quality/service; replies/no appointments → qualification; appointments/no clients → process/value. Do not “fix” every stage by adding more AI.

Exit: you can tell whether the business is moving toward a transaction, not just whether the software ran.

### G7 — The actual seller-to-buyer service

1. New `lib/marketing/sellerServiceContract.ts`: define explicit seller-service milestones (`consultation_requested`, `consultation_held`, `listing_agreement_verified`, `preparing`, `published`, `showing`, `offer_received`, `under_contract`, `closed`). Keep these distinct from public marketing events and existing lead status; milestone advancement needs appropriate real evidence.
2. Reuse the existing owned lead, property and planner records. Resolve the seller's property/authority through an authenticated operator action; an anonymous CMA form cannot create a verified listing or prove ownership.
3. Record broker-reviewed representation/listing authorization privately before public promotion. The existing Keller shortlist mostly contains third-party properties; do not relabel them as Taz's inventory or proof of completed sales.
4. Connect verified authorized inventory to existing `app/listings/[id]/page.tsx` / listing-discovery services through a public-field allowlist. Publish only permitted photos, price/status, property facts and correct listing/broker attribution; hide contacts, contract documents and internal notes.
5. Add a seller preparation checklist to existing planner/backlog services: fact verification, photography/staging, permitted listing copy, media rights, source dates and chosen marketing channels. Buyer guides can explain the location objectively without replacing property-specific verification.
6. Every listing page needs a working buyer inquiry/showing-request CTA bound to that exact public listing revision. Reuse canonical agent-site lead intake; buyer-submitted listing/agent IDs cannot override verified routing.
7. Route buyer inquiries to Taz's owned inbox and a timely follow-up task. Distinguish showing request, confirmed showing, attendance, feedback and actual offer. Avoid public calendars exposing seller occupancy or buyer identities.
8. Offer and negotiation work stays with the licensed human/broker process. Jamie may organize a private checklist or compare supplied terms, but must not accept/reject an offer, sign a document or make commitments without exact authority.
9. Track contract dates and deadlines with the existing Realtor/shared scheduler. Use human-confirmed title/lender/inspection/closing milestones; a deadline notification does not prove its legal obligation was met.
10. Seller reporting shows actual published channels, buyer inquiries, completed showings, verified feedback and offers; report incomplete attribution honestly. Do not invent interested buyers, promise an offer, or fabricate scarcity to win a listing.
11. Keep seller/client access and shared documents private and scoped. Public listing contact is not a representation agreement; identify who is represented and use broker-reviewed disclosures/dual-role policies where applicable.
12. Acceptance follows one disposable seller case end-to-end: request → owned inbox → verified listing authorization → permitted public page → buyer request → confirmed showing → private offer record → deadline task → human-confirmed closing. Fixtures remain labelled, and no live listing is published by the test.

Exit: the site supports selling an actual authorized seller listing to buyers, rather than stopping at a captured email address.

## 4. Personal acquisition operating schedule

Taz has committed 20–30 hours/week. These are starting activity targets, not empirical conversion rates. No outreach/posting is executed by this plan.

**Baseline 20 hours/week:** 8 hours of individual prospecting/conversations, 4 follow-up/consultation scheduling, 4 seller research/CMAs/preparation, 2 recording/distribution, and 2 brokerage mentoring/local relationship building. If 30 hours are available, add 5 prospecting hours, 3 seller appointment/preparation hours and 2 commercial mentoring/source-research hours. Start with real relationships and broker-approved channels; comply with contact permissions and applicable do-not-call requirements. Content is support, not the majority of the work.

| Period | Website/content | Human business work | Review checkpoint |
| --- | --- | --- | --- |
| Oct 1–7 | Seller checklist + CMA request, working intake, first reviewed guide | Confirm broker identity/data access, contact 20 people you actually know individually, ask for seller introductions, arrange broker mentoring and a seller consultation | Real inquiry test reaches inbox; first genuine conversations |
| Oct 8–31 | Three guides; three original videos/week; one source-backed update if data exists | Aim for 10–15 meaningful seller/referrer conversations/week; invite suitable homeowners to consultations; prepare reviewed CMAs; respond promptly | Working target: 40 conversations and 6 held seller consultations; pursue 1–2 suitable listing opportunities. These are targets, not a forecast |
| Nov 1–15 | Iterate the offer using actual questions; publish strongest useful topics | Prioritize willing sellers with feasible timing; confirm authority, representation, price evidence and practical preparation/listing readiness through the broker-approved process | Target a suitable signed/listed seller opportunity early enough to market; zero consultations triggers strategy change |
| Nov 16–30 | Keep distribution small and consistent | Work toward a suitable contract early enough for the actual lender/title/inspection timeline | Contract target by late November provides a buffer; no promise a contract closes |
| December | Helpful client communication, not last-minute fake urgency | Manage actual transaction milestones with broker/title/lender; continue prospecting beyond the deadline | Count only a completed closing; never push an unsuitable transaction to meet a personal date |

Seller-first is Taz's chosen focus. Work toward a suitable listing in October rather than waiting until December to find a homeowner. A listing may not receive an acceptable offer or close by year-end; review price, readiness and timeline honestly. Retain any genuine buyer introduction as an opportunity, but do not split the primary marketing offer or pressure a seller to accept an unsuitable deal.

### Practical distribution ideas with little infrastructure

- **Sphere introduction message:** “I'm helping homeowners in Keller and Westlake work out their price, preparation priorities and selling timeline. Do you know anyone considering a sale this year? I'd be happy to prepare a personal plan for them—no pressure.” Personalize it; don't blast a scraped list.
- **Brokerage open houses:** volunteer to host permitted listings; invite a consultation after asking visitors' actual needs and contact preferences. A sign-in sheet is not blanket text/email consent.
- **Buyer question videos:** answer one specific local question each time and link the matching guide. Useful specifics distinguish you more than generic “buy now” commentary.
- **Local professional relationships:** meet lenders, inspectors and movers for useful collaborative education—not paid referral kickbacks. Any referral arrangement needs broker/legal review.
- **Google Business Profile:** check real individual-practitioner eligibility/location requirements; no fake Keller/Westlake office or virtual address.
- **Local groups/community events:** participate under group rules; offer an answer first. Sunset Grill/community links can be a secondary distribution channel, not a claim that Sunset and Keller/Westlake are the same market.
- **Source-backed seller help:** free staging checklist and a personally reviewed price discussion with an actual homeowner; avoid unsupported instant numbers.
- **Paid acquisition:** defer until form/inbox/response work and a spending cap/measurement test are approved. No generic broad ad spend or purchased leads just because traffic is zero.

## 5. Truth, permission and review boundaries

Research checked September 30; broker/legal review still applies to the actual advertisement and workflow.

- Follow [TREC advertising, IABS and consumer notice rules](https://www.trec.texas.gov/agency-information/rules-and-laws/trec-rules); verify current official requirements and actual brokerage identity before launch. TREC describes required advertising identity and listing-broker permission/attribution.
- School and community information can be factual. [HUD's current clarification](https://www.hud.gov/news/hud-no-26-028) discusses sharing school/neighborhood data; do not turn that into discriminatory steering or targeting. Use stated needs, neutral evidence and equivalent assistance.
- Use [Keller ISD's official lookup/maps](https://www.kellerisd.net/about-kisd/maps) and each applicable district's current resources, not “Keller address = Keller ISD.” Use [Westlake Academy admission/residency rules](https://www.westlakeacademy.org/admissions/residency-and-admission-policy), not a blanket promise.
- [Census commuting data](https://www.census.gov/topics/employment/commuting/guidance/acs-1yr.html) provides community-level context, not a promised trip from a listing.
- [FTC commercial-email guidance](https://www.ftc.gov/business-guidance/resources/can-spam-act-compliance-guide-business) covers sender/subject accuracy, physical address and opt-out obligations. Our product's affirmative marketing opt-in is a separate, stricter design policy; do not falsely say CAN-SPAM universally requires prior opt-in.
- [Google practitioner/profile rules](https://support.google.com/business/answer/3038177) govern profile eligibility. A profile is not guaranteed traffic.
- Keep capture/sprint approval separate from publishing/send authority. Unverified prices, HOA values, listing availability and school claims cannot become asserted truth through drafting.
- Never upload private HOA/resale documents, client addresses or licensed raw datasets into public guides. Store large original video files locally with backups rather than creating new hosted storage usage.

## 6. Current implementation ledger and next handoff

### Completed in local implementation packets (September 30–October 2, 2026)

- **G1 files:** `components/marketing/SellerAcquisitionHero.tsx` is inserted first by `app/page.tsx`; `components/hero/HeroOverlay.tsx` is demoted to the subordinate heading; `app/seller-plan/page.tsx` includes the ungated preparation checklist, source/price limitations, form and IABS link; `components/lead-capture/SellerPlanRequestForm.tsx` collects requested-response consent separately from unchecked optional marketing consent.
- **G2 files:** `lib/marketing/neighborhoodGuideSchema.ts` strictly validates reviewed records and evidence references; `lib/marketing/neighborhoodGuides.server.ts` publishes only records with current evidence; `content/neighborhoods/{old-town-keller,west-bursey-ranch,westlake-overview}.v1.json` contain the reviewed official-source material; `app/neighborhoods/page.tsx` and `app/neighborhoods/[slug]/page.tsx` render the guide directory/details; `app/sitemap.ts` uses review dates. School assignment, HOA costs and property-specific travel times remain marked unverified.
- **G3 files:** `lib/marketing/leadMagnetContract.ts` bounds the payload and attribution; `app/api/lead-magnets/route.ts` validates host/origin, applies the shared distributed fail-closed rate limiter and honeypot, resolves the configured published agent server-side and stores in `agent_site_leads` with conflict-detecting idempotency. It deliberately does not call AI, notifications, SMS or email.
- **G4 safety foundation:** `lib/marketing/marketReportSchema.ts` now requires geographic scope, reporting period, sample count, metric definitions, source/permission evidence, review revision and expiry. `content/market-reports/index.v1.json` is intentionally empty because no current, publication-authorized Keller/Westlake sales dataset is configured; `lib/marketing/marketReports.server.ts` exposes only reviewed, unexpired, permission-cleared reports. `app/keller-westlake/market-report/page.tsx` is noindex until one exists and explains the gap instead of rendering invented figures.
- **G4 valuation truth repair:** `app/valuation/page.tsx` now offers a human-reviewed pricing conversation rather than claiming an AVM. `app/api/valuation/route.ts:POST` fails closed with `503 VALUATION_UNAVAILABLE` and performs no provider calls, writes or draft confirmations. `GET` requires `status: Confirmed` plus `publiclyShareable: true`, selects display fields only, and legacy records default private via `models/Valuation.js`.
- **Navigation and record:** `lib/navigation/routeCatalog.ts`, root `README.md`, `docs/SUNSET_PULSE_ROUTE_WALKTHROUGH.md` and this ledger now include the pages and actual acceptance limits.
- **Release gates:** set and verify `KELLER_WESTLAKE_AGENT_SITE`, confirm that tenant profile is published/active, complete owner-authenticated inbox and browser acceptance, then verify the public license-holder/brokerage/IABS presentation before marketing. These checks were not possible from local code changes alone; do not treat a green unit suite as launch approval.
- **No outbound side effect:** accepted requests wait in the existing owner inbox. No notification or marketing message is automatically sent by this route.

Next G4 actions: implement a private CMA-request variant through the canonical lead intake, retaining an optional address only in the owner-scoped CRM record and only after verifying its access and retention boundary; then add broker-reviewed comparable selection/adjustments and immutable private review evidence. Do not re-enable `/api/valuation:POST` until the licensed source, permissions, signed-in owner/operator authorization, input validation and human review flow all exist. Add real market-report JSON only after verifying local source period, geographic scope, methodology and redistribution rights. In parallel, complete configured-tenant browser acceptance without contacting a prospect; then G5 manual content work can proceed, G6 begins from genuine inquiry evidence, and G7 remains the authorized-listing/client-service loop. Marketing-email automation waits for Praxis R1 and separately authorized delivery policy. Shared provider/spend gates remain intact.

Already confirmed: 20–30 hours/week, sellers first, commercial later.

Need from Taz before real public release: verified public name/license/brokerage/contact/IABS links; public working/contact hours; seller-plan response commitment; broker-approved listing/open-house/media access; authorized market data; whether any paid budget exists. These do not prevent local schema, UI or fixture work.

Do not delay prospecting until the operating platform, reconstruction or a sophisticated calculator is complete. The year-end objective is a useful service plus a reliable handoff to a real person.
