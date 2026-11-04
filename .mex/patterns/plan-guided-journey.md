---
name: plan-guided-journey
description: Turn supplied real-estate workflow screenshots into a draft tied to the existing intake and scheduler.
triggers:
  - "guided journey reference"
  - "Orchard screenshots"
last_updated: 2026-11-04
---

# Plan a Guided Home Journey

## Context

Use `docs/guided-home-journey-plan-2026-11-04.md`. The reference walkthrough is incomplete. Product files in the stacked seller release differ from the main-based security checkout; record the exact source snapshot before proposing edits.

## Steps

1. Record visible screens and owner-reported interactions separately. Repeated images are not extra steps. A pictured selection followed by another screen does not prove branch behavior, persistence or backend timing.
2. Extract navigation, question and pending/error states. Preserve original Sunset Pulse typography and permitted services. Use fictional data; do not copy addresses, answers or competitor branding into the product or test fixtures.
   Record the owner's specific liked interactions separately from optional inspiration. The sequential photo labels are a stated preference; the remaining reference content does not authorize a complete competitor-page rebuild. Specify component props, CSS timing and reduced-motion behavior for motion proposals.
3. Map every proposed input to the strict existing lead schema, consent, saved identity and idempotency logic. Version contract changes explicitly. Owner/agent or financing answers never establish authority.
4. Derive conditional steps from stable IDs. Remove hidden dependent answers on changes; distinguish unknown/skipped from zero. Keep optional finance context separate from public/client-shared data.
5. Prototype local interaction before connecting existing intake, consultation capabilities and Daily focus. Reuse scheduling/reminder/retention infrastructure. No new provider, cloud collection or cron is implied by a form reference.
6. Stop general planning once the first prototype's interaction contract and reuse map are concrete. Missing competitor final screens do not block reusing Sunset Pulse's existing contact/receipt flow. Keep persisted buyer requests separate until owner readers are verified: the existing seller policy/RPC/planner explicitly filter source seller_plan.

## Verify

For the P0 implementation, use `docs/releases/guided-home-journey-prototype-2026-11-04.md` for commands and evidence. Keep the route development-only and reuse the exact focused-surface helper to avoid unrelated branding/database providers. Later public intake still needs the versioned contract and owner-access gates.

Implementation findings:

- Address entry is a single street-address query. Do not require hidden city/state/ZIP fields to advance; clear stale resolved metadata and confirmation when text changes. Candidate options require real provider results in the integration phase, not guessed cities in the local prototype.

- Editing a parent can introduce a required child. Before returning to review or proceeding to contact, validate applicable prior steps and visit the first missing one. Clear hidden seller, detail and financial answers when parents change.
- Native radio descriptions use `aria-describedby` separately from the title's `aria-labelledby`. Scope browser form alerts to `#journey-content`; Next also renders a route-announcer alert.
- Bind and fetch the same loopback family. Windows may resolve `localhost` to IPv6 while a server listens on IPv4. The isolated launcher prints `127.0.0.1` and never loads another checkout's runtime environment.
- Check actual CSS label motion separately from simulated submission delays. Sample the animation timeline at 280/450/720ms, verify reduced motion and no replay across ordinary rerenders. Keep screenshots and aggregate results gitignored under `.pulse-local/guided-journey`.
- Full-page Chromium capture can restart completed CSS animations on the same DOM nodes. A diagnostic confirmed street typing does not replay labels, while the capture does. Take additional address screenshots on a separate reduced-motion page so they cannot contaminate the ordinary-rerender assertion; do not weaken the assertion or change application motion to accommodate the capture.

Check proposed existing paths against their recorded Git snapshot, keep missing screens explicit, and confirm the plan changes no runtime behavior. Do not claim provider access, real valuation, cross-device resume or confirmed booking without the relevant implementation/evidence. Application tests are unnecessary for a documentation-only delivery.
