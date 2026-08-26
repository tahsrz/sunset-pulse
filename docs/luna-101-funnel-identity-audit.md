# LUNA-101 Funnel Identity Audit

Audited: 2026-08-24  
Status: Incomplete; remediation required before outcome-ledger activation

## Acceptance Criterion

One fixture must trace a Jamie session, handoff, lead, notification, contact receipt, booking, signing packet, billable outcome, and revenue record using durable identifiers alone.

Current result: **not met**.

## Coverage Matrix

| Stage | System of record | Current funnel identity | Result |
| --- | --- | --- | --- |
| Jamie session/events | Supabase intelligence events | `metadata.funnelId` after handoff | Partial |
| Consented handoff | Supabase intelligence events and lead metadata | Event metadata plus generated lead funnel | Partial |
| Lead | `agent_site_leads` | Required `funnel_id` UUID | Pass |
| Agent notification | `agent_notifications` | Indexed `funnel_id` | Pass |
| Delivery | `notification_deliveries` | Indexed `funnel_id` | Pass |
| Contact receipt | `agent_site_leads` engagement columns | Joined through lead `funnel_id` | Pass |
| Customer response | `agent_site_leads` engagement columns | Joined through lead `funnel_id` | Pass |
| Booking | Supabase `scheduling_bookings` with Prisma/Mongo projections | Lineage migration and writer implemented; deployment and route fixture pending | Partial |
| Signing packet | Mongo `SigningPacket` | Optional validated funnel, lead, and booking context implemented; route coverage pending | Partial |
| Billable outcome | Not implemented | Contract requires `funnelId`; no ledger exists | Fail |
| Pipeline value/revenue | `agent_site_leads` | Joined through lead `funnel_id` | Pass |

## Findings

### F-101-01: Booking lineage is absent

The Supabase scheduling schema has booking identity and idempotency, but no `funnel_id`, `lead_id`, `agent_id`, `site_id`, or commercial appointment type. Existing `/api/scheduling` behavior also writes a legacy Mongo `TourRequest`, so neither store currently provides the plan's authoritative lineage.

Required remediation: LUNA-201 must add authoritative Supabase booking lineage, tenant-safe indexes and constraints, and a compatibility projection to Mongo rather than an independent commercial record.

Implementation update: `20260824070000_commercial_booking_lineage.sql` adds the required lineage contract. `createAuthoritativeCommercialBooking` verifies lead, funnel, agent, and site ownership, persists idempotently to Supabase, and lets `/api/scheduling` project the resulting booking into Prisma and Mongo. This finding remains open until the migration is applied and an authenticated route fixture proves the complete write and retry path.

### F-101-02: Signing lineage is absent

Representation packets store agreement and signer data in Mongo, but the creation contract does not accept or persist `funnel_id`, `lead_id`, or `booking_id`.

Required remediation: add an optional, validated commercial context to signing packets; verify that the authenticated agent owns the referenced lead and booking before persistence.

Implementation update: representation packet creation now validates the lead and optional booking against the same funnel, agent, and site before storing commercial context. This remains open until authenticated ownership tests are added.

### F-101-03: Jamie identity begins at handoff

Public-guide telemetry accepts `funnelId`, but a durable funnel is generated when `/api/sites/leads` accepts the handoff. Earlier anonymous session events are associated through a privacy-safe session hash, not a pre-existing funnel UUID.

Required remediation: preserve this privacy boundary. Link eligible pre-handoff events through the canonical session hash during handoff rather than placing a durable commercial UUID in every anonymous browser event.

### F-101-04: Outcome persistence does not exist

The LUNA-001 classifier requires a funnel UUID, but no immutable `billable_outcomes` ledger exists.

Required remediation: LUNA-102 adds the ledger only after booking and signing lineage contracts are defined. Shadow outcomes must reference the authoritative lead funnel and carry evidence versioning.

## Reformed Identity Contract

The original plan said to require `funnel_id` across every stage. That is too broad for anonymous browsing. The implementation contract is:

- Before consent: privacy-safe session hash only.
- At accepted handoff: create one authoritative lead `funnel_id`.
- After consent: propagate `funnel_id` to all commercial records.
- Historical pre-handoff events: join through the canonical session hash when needed; do not expose raw session IDs.
- Every downstream write: verify tenant and agent ownership before accepting a supplied funnel ID.

## Remediation Order

1. LUNA-201: define booking lineage and make Supabase authoritative.
2. Signing lineage: add validated lead, funnel, and booking references.
3. LUNA-102: create the immutable outcome ledger.
4. Add one end-to-end fixture proving identity from consented handoff through revenue.
5. Mark LUNA-101 complete only when that fixture passes.
