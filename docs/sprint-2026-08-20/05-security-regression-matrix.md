# Security Regression Matrix

## Testing strategy

Use a small set of canonical fixtures across repository, route, page, and E2E layers. The purpose is to prove invariant behavior across surfaces, not to duplicate every assertion in every file.

## Core fixtures

### Tenants

- `tenantA`: active, approved, entitled, production platform domain `alpha.sunsetpulse.app`
- `tenantB`: active, approved, entitled, production platform domain `bravo.sunsetpulse.app`
- `tenantDraft`: valid domain but draft site
- `tenantSuspended`: valid domain but suspended site
- `tenantPreview`: preview-only domain record
- `tenantCustom`: verified custom domain `homes.example.test`

### Actors

- anonymous visitor
- owner/realtor A
- owner/realtor B
- operator
- admin
- authenticated consumer

### Listings

- `publicA`: public MLS listing assigned to Tenant A
- `publicB`: public MLS listing assigned to Tenant B
- `sharedAB`: public MLS listing assigned to both tenants
- `privateA`: `display_public=false`, assigned to Tenant A
- `demoA`: demo listing assigned to Tenant A
- `deletedA`: public flag true but `deleted_at` set
- `legacyPrivate`: Mongo-only private row
- `legacyPublic`: Mongo-only public row
- `noCoordinates`: public assigned listing without coordinates

### Leads and events

- `leadA` owned by Tenant A
- `leadB` owned by Tenant B
- anonymous session linked to `leadA`
- forged event metadata naming Tenant B while authoritative lead belongs to Tenant A

## Host-resolution tests

| Test | Request | Expected |
|---|---|---|
| Platform domain | Host `alpha.sunsetpulse.app` | Tenant A context |
| Custom domain | Host `homes.example.test` | Custom tenant context |
| Unknown custom domain | Unregistered host | Generic 404 |
| Reserved subdomain | Host `api.sunsetpulse.app` | Global/reserved route, never tenant |
| Host/path mismatch | Alpha host, `/sites/bravo` | 404 |
| Spoofed internal header | Alpha host plus `x-sunset-tenant: bravo` | Tenant A or 404; never B |
| Spoofed forwarding header | Host alpha, forwarded host bravo, trust disabled | Tenant A |
| Trusted forwarding mode | Platform-overwritten forwarded host with explicit trust | Forwarded host according to documented mode |
| Comma chain | Forwarded host `bravo, alpha` | Rejected or deterministic trusted parsing |
| Port normalization | `alpha.sunsetpulse.app:443` | Tenant A |
| Trailing dot | `alpha.sunsetpulse.app.` | Defined canonical result |
| Case normalization | `ALPHA.SUNSETPULSE.APP` | Tenant A |
| Preview isolation | Production host matching preview record | 404 |
| Generic Vercel preview | Generated Vercel hostname | Global app, not tenant |
| Local fixture | `alpha.localhost:3000` in development | Development Tenant A fixture |
| Local production attempt | `.localhost` under production runtime | Rejected |
| Suspended domain | Valid projected host, authoritative suspended row | 404 |
| Reassigned stale projection | Edge says A, DB says B | 404 until projection agrees |

## Public inventory route matrix

Run each listing fixture through these surfaces:

- `GET /api/properties`
- `GET /api/properties/search`
- `GET /api/properties/search/advanced`
- `GET /api/properties/[id]`
- `GET /api/properties/[id]/rent`
- `GET /api/properties/[id]/recon`
- `GET /api/properties/featured`
- `GET /api/properties/hot-list`
- `GET /api/value-guess/listings`
- `GET /api/location-guess/listings`
- tenant listing page
- tenant listing metadata

Expected visibility:

| Fixture | Global public | Tenant A | Tenant B | Owner A internal |
|---|---:|---:|---:|---:|
| publicA | yes where globally eligible | yes | no | yes |
| publicB | yes where globally eligible | no | yes | no unless authorized |
| sharedAB | yes | yes | yes | according to ownership capability |
| privateA | no | no | no | yes |
| demoA | no | no | no | yes where demo access allowed |
| deletedA | no | no | no | no except audit tooling |
| legacyPrivate | no | no | no | explicit legacy owner path only |
| legacyPublic | yes under compatibility policy | only if assigned | only if assigned | according to ownership |
| noCoordinates | detail may render | detail may render | no | recon unavailable |

## Public projection assertions

Every anonymous listing response must exclude:

- `owner`
- seller information
- lockbox/access instructions
- internal remarks
- arbitrary raw `metadata`
- ingestion diagnostics
- provider credentials
- private document URLs
- internal scoring fields

Coordinates follow the chosen policy: absent, fuzzed, or exact only when explicitly licensed and approved. Snapshot tests must fail if a new field appears unexpectedly.

## Tenant lead tests

| Test | Expected |
|---|---|
| Tenant A host submits valid A listing | Lead stored under A |
| Tenant A host submits body `agentId=B` | Body authority ignored/rejected; no B row |
| Tenant A host submits B listing | 404/validation failure |
| Duplicate idempotency key under A | Accepted duplicate, one row, one side-effect chain |
| Same key under A and B | Distinct tenant-scoped operations |
| Unknown host submits lead | Fail closed |
| Suspended tenant submits lead | Rejected according to entitlement policy |
| Listing omitted for general inquiry | Valid only if tenant context is authoritative |

## Agent authorization tests

- Realtor A cannot list, read, update, acknowledge, or archive Tenant B leads or notifications.
- Realtor A cannot select Tenant B rows directly through the authenticated Supabase client.
- Operator/admin access is explicit and audited.
- Missing profile/ownership lookup fails closed.
- A successful update that affects zero rows returns not-found/conflict, not success.

## Projection/outbox tests

- Domain mutation and outbox intent commit atomically.
- Two workers cannot claim one job.
- Expired lease is reclaimable.
- Nonexpired lease is not reclaimable.
- Older revision becomes superseded.
- Remote success plus local completion failure is safely retryable.
- Dead-letter threshold is deterministic.
- Reconciliation enqueues missing/stale projection work.

## Existing tests requiring updates

`tests/unit/listing-read-surfaces.test.ts` still mocks and expects `getListingById` and old `searchListings` options for surfaces that now use public helpers. Update it to assert `getPublicListingById` and `publicOnly: true` rather than loosening production code to satisfy stale expectations.

## Test layers

### Pure unit tests

- Host normalization
- Reserved names
- Context/result contracts
- Public projection
- Listing visibility policy
- Revision supersession
- Cache-key construction

### Route tests

- Status, payload, headers, authoritative resolver calls
- IDOR and cross-tenant negatives
- Zero-row mutation behavior

### Database integration tests

- Unique constraints
- RLS ownership
- Atomic outbox insertion
- `SKIP LOCKED` claims
- CAS conflicts

### E2E tests

One positive and one adversarial story:

```text
Alpha host -> view publicA -> submit lead -> leadA -> alertA -> notificationA
```

```text
Alpha host + Bravo IDs/headers -> no Bravo data, row, alert, or notification
```

## CI gate

The security suite must run independently from the broad UI E2E suite so a flaky game/browser test cannot obscure a tenant-isolation regression.

