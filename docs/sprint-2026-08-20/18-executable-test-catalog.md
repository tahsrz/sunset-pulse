# Executable Test Catalog

Test IDs are stable references for PR descriptions, CI output, release evidence, and incident regressions. Names may evolve, but an ID is not reused for a different invariant.

## Proposed test files

```text
apps/pulse/tests/unit/tenant-host-normalization.test.ts
apps/pulse/tests/unit/tenant-context-resolver.test.ts
apps/pulse/tests/unit/public-listing-projection.test.ts
apps/pulse/tests/unit/public-listing-policy.test.ts
apps/pulse/tests/unit/domain-projection-outbox.test.ts
apps/pulse/tests/unit/public-site-projection.test.ts
apps/pulse/tests/integration/tenant-rls.test.ts
apps/pulse/tests/integration/tenant-domain-registry.test.ts
apps/pulse/tests/tenant-isolation.spec.ts
```

Keep existing route tests near current conventions when that produces clearer ownership. The IDs below can appear in test titles: `it('[HST-001] ...')`.

## Host normalization: HST

| ID | Case | Expected |
|---|---|---|
| HST-001 | lowercase production platform host | canonical hostname |
| HST-002 | uppercase host | normalized lowercase |
| HST-003 | valid `:443` port | host and port parsed deliberately |
| HST-004 | development `:3000` port | accepted only in development |
| HST-005 | trailing dot | canonical behavior is deterministic/idempotent |
| HST-006 | leading/trailing whitespace | reject rather than silently reinterpret unless contract explicitly trims transport OWS |
| HST-007 | `https://host/path` | invalid host |
| HST-008 | `host/path` | invalid host |
| HST-009 | comma-separated host chain | invalid host |
| HST-010 | embedded whitespace/control character | invalid host |
| HST-011 | deceptive suffix `alpha.example.com.evil.test` | no platform match |
| HST-012 | deceptive prefix `evilalpha.example.com` | no platform match |
| HST-013 | wildcard-looking host | invalid/unknown, never wildcard resolution |
| HST-014 | IPv6 literal with port | reject unless explicitly supported and tested |
| HST-015 | empty/missing host | typed invalid-host failure |
| HST-016 | reserved platform subdomain | reserved/global classification |
| HST-017 | `.localhost` in production | wrong-environment failure |
| HST-018 | production host in development | exact environment lookup only |
| HST-019 | generic Vercel preview host | global/preview handling, never inferred tenant |
| HST-020 | repeated normalization | identical value and no information loss |

Property/fuzz requirement: for random Unicode/control/path/scheme/comma inputs, either a valid constrained hostname is returned or a typed failure; no throw and no suffix ownership inference.

## Tenant resolver: RES

| ID | Case | Expected |
|---|---|---|
| RES-001 | exact active production domain | Tenant A context |
| RES-002 | unknown syntactically valid domain | `unknown_domain` |
| RES-003 | pending verification | fail closed |
| RES-004 | pending propagation | documented unavailable state |
| RES-005 | suspended domain | fail closed |
| RES-006 | revoked domain | fail closed |
| RES-007 | production request, preview-only row | wrong environment/unknown |
| RES-008 | Edge candidate A, DB row B | stale/mismatch failure |
| RES-009 | Edge revision behind DB | stale projection; no stale activation |
| RES-010 | Edge revision ahead of DB | configuration error; no activation |
| RES-011 | domain references missing site | configuration error |
| RES-012 | site unpublished/draft | fail closed |
| RES-013 | body says tenant B on tenant A host | A or rejection; never B |
| RES-014 | `x-sunset-tenant: B` on A host | A or rejection; never B |
| RES-015 | untrusted forwarded host says B | observed trusted host remains authority |
| RES-016 | three simultaneous calls on one Request | one registry/database lookup |
| RES-017 | calls on two Request objects | separate request caches |
| RES-018 | first request rejects | later request can resolve; no global poison |
| RES-019 | public error mapping | uniform 404, no candidate IDs/status detail |
| RES-020 | structured telemetry | reason/revision hash present, secrets absent |

## Public projection: PRJ

| ID | Case | Expected |
|---|---|---|
| PRJ-001 | valid canonical public listing | valid `PublicListing` |
| PRJ-002 | internal `owner` populated | field absent |
| PRJ-003 | seller details populated | fields absent recursively |
| PRJ-004 | lockbox/access instructions | absent |
| PRJ-005 | private/internal remarks | absent |
| PRJ-006 | arbitrary metadata with tempting public keys | metadata absent, no dynamic spread |
| PRJ-007 | provider raw payload/credentials | absent |
| PRJ-008 | private document URLs | absent |
| PRJ-009 | internal scores/ingestion diagnostics | absent |
| PRJ-010 | exact coordinates not licensed | omitted or policy-fuzzed |
| PRJ-011 | exact coordinates licensed | represented only by approved contract |
| PRJ-012 | new unknown internal field added | snapshot/output unchanged |
| PRJ-013 | malformed optional source values | normalized or excluded, never raw throw |
| PRJ-014 | projection serialization | conforms to runtime schema and JSON-safe values |

## Canonical visibility policy: VIS

| ID | Fixture | Global public | Tenant A |
|---|---|---:|---:|
| VIS-001 | active public MLS + A assignment | yes | yes |
| VIS-002 | active public MLS + B assignment | yes | no |
| VIS-003 | co-listed A/B | yes | yes |
| VIS-004 | `display_public=false` | no | no |
| VIS-005 | demo listing | no | no unless explicit internal capability |
| VIS-006 | deleted listing | no | no |
| VIS-007 | suppressed/unlicensed listing | no | no |
| VIS-008 | no tenant assignment | global per policy | no |
| VIS-009 | expired assignment | global per policy | no |
| VIS-010 | revoked assignment | global per policy | no |
| VIS-011 | future `published_at` | global per policy | no |
| VIS-012 | source unavailable with stale cached row | only if cache version/policy valid; otherwise no |

All denials use internal reason codes. Public callers receive a non-enumerating result.

## Route surface consistency: SUR

Run the VIS fixture table across:

| ID | Surface |
|---|---|
| SUR-001 | `GET /api/properties` |
| SUR-002 | `GET /api/properties/search` |
| SUR-003 | `GET /api/properties/search/advanced` |
| SUR-004 | `GET /api/properties/[id]` |
| SUR-005 | `GET /api/properties/[id]/rent` |
| SUR-006 | public portion of `GET /api/properties/[id]/recon` or explicit denial |
| SUR-007 | `GET /api/properties/featured` |
| SUR-008 | `GET /api/properties/hot-list` |
| SUR-009 | value-guess listing source |
| SUR-010 | location-guess listing source |
| SUR-011 | tenant listing page/metadata |
| SUR-012 | Jamie listing-context hydration |

Assertions:

- hidden rows do not affect count, pagination, facets, map bounds, recommendation presence, or timing details that trivially enumerate IDs
- every returned listing passes `PublicListingSchema`
- tenant surfaces require active assignment
- no anonymous route imports internal Mongo models directly

## Database/domain registry: DBR

| ID | Case | Expected |
|---|---|---|
| DBR-001 | duplicate `(environment, hostname)` insert | unique violation |
| DBR-002 | same hostname in different environment | allowed only by intended semantics |
| DBR-003 | invalid lifecycle/environment/kind | check violation |
| DBR-004 | active custom domain without verification | prevented by constraint/function |
| DBR-005 | stale expected revision mutation | conflict, no outbox row |
| DBR-006 | valid domain mutation | domain + desired projection + outbox commit |
| DBR-007 | transaction failure after domain update attempt | no partial mutation |
| DBR-008 | anonymous domain select | denied |
| DBR-009 | owner domain status select | only own allowed fields/rows |
| DBR-010 | owner domain mutation directly | denied; server operation required |
| DBR-011 | service worker claim function | permitted only to service role |
| DBR-012 | backfill hostname collision | reported and skipped, never guessed |

## RLS and authorization: RLS

| ID | Actor/action | Expected |
|---|---|---|
| RLS-001 | anonymous select full `site_config` | denied |
| RLS-002 | anonymous fetch public site projection | allow-listed result |
| RLS-003 | Owner A select Tenant A admin rows | allowed as specified |
| RLS-004 | Owner A select Tenant B site | denied/zero rows |
| RLS-005 | Owner A select Tenant B lead | denied/zero rows |
| RLS-006 | Owner A select Tenant B event | denied/zero rows |
| RLS-007 | Owner A select Tenant B assignment | denied/zero rows |
| RLS-008 | Owner A update Tenant B row | denied and route reports failure |
| RLS-009 | consumer selects another consumer lead/session | denied |
| RLS-010 | removed tenant membership | access revoked within documented cache interval |
| RLS-011 | operator server action | allowed and audited only for named capability |
| RLS-012 | ordinary authenticated client calls service RPC | denied |
| RLS-013 | service-role browser import scan | no browser-reachable module |
| RLS-014 | missing ownership/profile relation | fail closed |

Run these with real anonymous and JWT clients. Mocking `auth.uid()` is insufficient release evidence.

## Projection outbox: BOX

| ID | Case | Expected |
|---|---|---|
| BOX-001 | two workers claim one job | one winner |
| BOX-002 | nonexpired lease | cannot reclaim |
| BOX-003 | expired lease | reclaimable |
| BOX-004 | attempts increment | exactly once per successful claim |
| BOX-005 | older pending revision | superseded atomically |
| BOX-006 | newer revision arrives during remote write | stale completion cannot mark projection current |
| BOX-007 | deterministic serializer same state | same bytes/digest |
| BOX-008 | environment manifests | isolated keys and contents |
| BOX-009 | remote timeout before acceptance | retryable with backoff |
| BOX-010 | remote acceptance/local completion failure | idempotent reconcile before duplicate write |
| BOX-011 | max attempts | dead-lettered once |
| BOX-012 | manual replay | new audited attempt, original evidence preserved |
| BOX-013 | reconciliation missing remote entry | enqueue upsert |
| BOX-014 | reconciliation stale remote entry | enqueue latest upsert |
| BOX-015 | reconciliation unauthorized extra entry | enqueue remove/security alert |
| BOX-016 | full rebuild | matches authoritative digest |

## End-to-end isolation: E2E

| ID | Story | Required proof |
|---|---|---|
| E2E-001 | Alpha visitor views Alpha listing and submits lead | A listing response, A lead, A intelligence event, A alert/notification |
| E2E-002 | Alpha host submits Bravo listing/body IDs | 404/rejection; no Bravo response, row, event, alert, notification, or AI context |
| E2E-003 | Alpha host with forged internal headers | context remains Alpha or fails closed |
| E2E-004 | suspended Alpha domain with stale active projection | uniform unavailable response; no data |
| E2E-005 | preview Alpha host during production deployment | preview scope only; no production fallback |
| E2E-006 | co-listed property | visible on A and B with distinct tenant lead attribution |
| E2E-007 | assignment revoked during cached session | disappears after bounded invalidation; cannot submit listing-specific lead |
| E2E-008 | realtime disconnect/reconnect | authoritative catch-up state; no cross-agent alerts |
| E2E-009 | TAH answer uses tenant listing context | provenance contains authorized public listing only |
| E2E-010 | rollback flag activated | safe previous path or deliberate 404, never bypass |

E2E-002 is the release-blocking adversarial story.

## Performance and operability: PER

| ID | Measure | Initial target |
|---|---|---|
| PER-001 | warm exact tenant resolution p95 | under 50 ms application contribution |
| PER-002 | cold authoritative resolution p95 | under 200 ms application contribution |
| PER-003 | request-local three-call lookup count | one |
| PER-004 | tenant listing query plan | bounded index path; no unbounded hot sequential scan |
| PER-005 | domain projection convergence p95 | under 2 minutes initially |
| PER-006 | expired lease recovery | within one worker interval plus lease grace |
| PER-007 | TAH warm retrieval p95 | under 200 ms baseline target |
| PER-008 | TAH checkpoint age | under 24 hours |
| PER-009 | rollback flag propagation | measured and within runbook target |
| PER-010 | public route error ratio during canary | no material increase over baseline |

Targets become SLOs only after a measured baseline and an owner accept them.

## CI lanes

### `tenant-contracts`

Runs HST, RES, PRJ, VIS, and import boundaries on every relevant PR. Required and fast.

### `tenant-database-security`

Starts isolated Supabase or uses an approved ephemeral database. Runs DBR and RLS with real roles/JWTs. Required for schema/policy PRs.

### `tenant-isolation-e2e`

Runs E2E-001 and E2E-002 on every TenantContext/public inventory PR. Full set runs before release.

### `platform-build`

Runs full unit suite and `next build --no-lint`. Existing unrelated flakes are not allowed to waive the three focused security lanes.

## Result manifest

Each release candidate publishes a small artifact:

```json
{
  "gitSha": "...",
  "environment": "preview",
  "databaseMigration": "...",
  "suites": {
    "tenant-contracts": { "passed": [], "failed": [], "skipped": [] },
    "tenant-database-security": { "passed": [], "failed": [], "skipped": [] },
    "tenant-isolation-e2e": { "passed": [], "failed": [], "skipped": [] }
  }
}
```

Any skipped security ID requires a written reason, owner, expiry, and explicit no-go/go decision. Silence is not a pass.

