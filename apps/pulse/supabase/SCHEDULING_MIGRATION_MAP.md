# Scheduling Supabase Migration Map

This tracks the first Supabase-native scheduling foundation. The goal is to move Scheduling off its separate Prisma-managed database while preserving enough legacy Cal identifiers to import data in stages.

## Strategy

- Use `public.scheduling_*` tables so scheduling can coexist with existing Pulse tables.
- Store legacy Cal IDs on every imported table for deterministic backfills and cross-checks.
- Link Scheduling users to Supabase Auth through `scheduling_users.auth_user_id` and to Pulse profiles through `scheduling_users.profile_id`.
- Keep high-variance Cal fields as `jsonb` until the product surface proves they need first-class columns.
- Use RLS now, even before the UI is fully migrated, so the API surface is shaped around Supabase from the start.

## First Slice

| Prisma source | Supabase target | Notes |
| --- | --- | --- |
| `User` | `scheduling_users` | Auth/profile bridge plus legacy Cal user fields. |
| `Team` | `scheduling_teams` | Supports org/team hierarchy with `parent_team_id`. |
| `Membership` | `scheduling_memberships` | Role values remain `MEMBER`, `ADMIN`, `OWNER`. |
| `Credential` | `scheduling_credentials` | Keeps `key`/`encrypted_key`; service-role only writes should be preferred. |
| `Schedule` | `scheduling_schedules` | Owner-scoped schedule container. |
| `Availability` | `scheduling_availability` | Preserves day array plus time/date fields. |
| `EventType` | `scheduling_event_types` | Core booking-page fields are columns; complex options are `jsonb`. |
| `Host` / `HostLocation` | `scheduling_hosts` | Host location starts as `jsonb` to avoid premature schema churn. |
| `DestinationCalendar` | `scheduling_destination_calendars` | Event-level calendar target. |
| `Booking` | `scheduling_bookings` | Core status/time/responses fields. |
| `Attendee` | `scheduling_attendees` | Attendee access can be tied to auth email. |
| `BookingReference` | `scheduling_booking_references` | Meeting/calendar provider references. |
| `SelectedCalendar` | `scheduling_selected_calendars` | Calendar watch/sync fields. |
| `Webhook` | `scheduling_webhooks` | Event triggers stored as `text[]` for flexibility. |

## Deferred Prisma Surfaces

These stay in Prisma until the corresponding product path is actively migrated:

- Payments, seats, API keys, rate limits
- Apps registry and app-store integration metadata
- Workflow/reminder tables
- Routing forms and assignment/reporting tables
- PBAC/custom roles
- Platform OAuth, delegation credentials, SCIM/DSync
- Calendar cache denormalized tables
- Audit/report/watchlist/billing/credit tables

## Import Order

1. `User` into `scheduling_users`, matching by email to `auth.users` and `profiles`.
2. `Team`, then `Membership`.
3. `Credential`, `Schedule`, `Availability`.
4. `EventType`, then `Host`, `DestinationCalendar`, `SelectedCalendar`, `Webhook`.
5. `Booking`, then `Attendee`, `BookingReference`.

## Cutover Checklist

- Add an import script that reads Prisma with `packages/prisma/schema.prisma` mappings and upserts by `legacy_cal_*` columns.
- Generate Supabase TypeScript types for Pulse after applying the migration.
- Replace Scheduling read paths model-by-model with Supabase queries.
- Keep Prisma writes disabled only after parity checks pass for bookings, availability, and event types.
