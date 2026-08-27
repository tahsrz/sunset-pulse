# TenantContext Threat Model

## Scope

This model covers host-to-tenant resolution for platform subdomains, custom domains, local development, preview deployments, server components, and API routes. It does not grant capabilities; authorization and entitlement remain separate.

## Assets

- Tenant identity and agent ownership
- Agent branding and site configuration
- Public and private listing visibility
- Lead destination and notification recipients
- Billing and publication state
- Custom-domain ownership
- Global session-to-lead linkage
- Audit evidence showing why a tenant was selected

## Trust boundaries

```text
Browser-controlled request
  -> hosting proxy
  -> middleware normalization/sanitation
  -> server-side domain resolution
  -> authoritative Supabase tenant/domain records
  -> entitlement and authorization
  -> tenant-aware business service
```

Browser-controlled inputs include `Host` in some deployment modes, all ordinary forwarding headers unless the platform overwrites them, URL paths, query parameters, cookies, and every inbound `x-sunset-*` header.

Server-owned values begin only after middleware sanitation or direct server-side resolution against authoritative records.

## Security invariants

- A hostname maps to at most one tenant in one environment.
- The same hostname cannot be active in production and preview records simultaneously unless the environment is part of the exact key.
- Unknown, malformed, pending, expired, suspended, or reassigned domains fail closed.
- Edge projection data can suggest routing but cannot authorize rendering.
- The server revalidates domain status and tenant assignment before returning tenant data.
- Tenant identity never comes from a query parameter, request body, or unverified internal header.
- Platform subdomains and custom domains use the same authoritative tenant identity contract.
- Authorization never infers permissions merely because a tenant resolved successfully.

## Threat register

| ID | Threat | Entry point | Impact | Required control | Required test |
|---|---|---|---|---|---|
| T01 | Caller supplies `x-forwarded-host` for Tenant B | Public request headers | Cross-tenant routing | Prefer actual host; trust forwarding only under explicit proxy configuration | Conflicting host headers choose trusted source |
| T02 | Caller supplies `x-sunset-tenant` | Public request headers | Cross-tenant API reads | Strip inbound internal headers and derive context server-side | Spoofed header has no effect |
| T03 | Direct `/sites/tenant-b` request on Tenant A host | URL path | Tenant path confusion | Require resolved host tenant to equal route tenant | Host/path mismatch returns 404 |
| T04 | API route expects middleware tenant header | `/api/*` | Global fallback or wrong tenant | Resolve host inside API boundary | API request resolves from host without internal header |
| T05 | Stale Edge Config maps a reassigned domain to old tenant | Edge projection | Wrong rewrite | Server checks current domain owner and revision | Stale candidate returns 404, never old tenant data |
| T06 | Suspended tenant remains in edge manifest | Edge projection | Unauthorized site availability | Server checks authoritative status and entitlement | Suspended site returns 404 despite active projection |
| T07 | New custom domain is negatively cached | Resolver cache | Availability delay | Short negative TTL and mutation invalidation | Verification becomes visible within target window |
| T08 | Production host resolves preview tenant | Environment mismatch | Cross-environment data leak | Environment is part of unique key and cache key | Production/preview collision rejected |
| T09 | Vercel preview hostname parsed as tenant slug | Preview host | Accidental tenant access | Generic preview hosts are global unless registered | Branch hostname does not resolve tenant |
| T10 | Unicode/punycode lookalike | Custom-domain onboarding | Phishing or collision | Canonical ASCII hostname, IDNA policy, exact comparison | Unicode/trailing-dot/case variants normalize predictably |
| T11 | Host includes port, scheme, path, comma chain | Host normalization | Parser disagreement | One strict normalization function | Table-driven malformed-host tests |
| T12 | Reserved subdomain is configured as tenant | Site configuration | Route collision | Shared reserved-name validator | `api`, `admin`, `jamie`, `www` rejected everywhere |
| T13 | Custom domain ownership expires or DNS changes | External DNS | Domain takeover | Periodic verification and ownership status | Expired verification transitions to blocked state |
| T14 | Domain reassignment races active requests | Mutation and cache | Mixed tenant responses | Revisioned records and server verification | Old revision cannot render after reassignment commit |
| T15 | Edge worker applies revision 14 after revision 16 | Outbox retries | Projection rollback | Monotonic target revision and supersession | Older job is skipped |
| T16 | Supabase unavailable while edge projection is healthy | Server hydration | Temptation to trust edge | Fail closed or serve narrowly defined cached signed context | No tenant data served solely from projection |
| T17 | `site_config` RLS exposes private configuration | Supabase anon client | Prompt, billing, or integration leakage | Public projection/view instead of full-row public policy | Anonymous query cannot read private columns |
| T18 | Realtor RLS policy reads all tenant leads | Supabase authenticated client | Cross-tenant PII leakage | Owner/agent-scoped RLS relation | Realtor A cannot select Realtor B rows |
| T19 | Cached active entitlement survives suspension | Rich context cache | Continued publication | Version/tag invalidation plus authoritative sensitive check | Suspension invalidates cached context |
| T20 | Logs capture full custom host, email, session, or lead payload | Observability | PII disclosure | Structured redaction and hashed identifiers | Log snapshot excludes protected values |
| T21 | Local-development mode is enabled in production | Environment configuration | Operator or tenant bypass | Build/deploy assertion and runtime guard | Production rejects `.localhost` and dev overrides |
| T22 | Tenant lookup returns multiple rows due to corrupt data | Database | Nondeterministic identity | Unique indexes and explicit ambiguity error | Duplicate fixture fails closed |
| T23 | Custom domain points to active tenant but site is draft | Server rendering | Premature publication | Entitlement/publication check after resolution | Resolved draft tenant does not render publicly |
| T24 | Listing/lead body supplies another agent ID | Business API | Cross-tenant mutation | Ignore body authority and use TenantContext | Supplied agent ID is rejected or overwritten |

## Priority conclusions

### P0

- T02/T04: current API tenant-context path is not viable.
- T17/T18: current database policies require audit and remediation.
- T03/T05/T06: route candidate must be revalidated against authoritative state.
- T24: business services must consume the resolved tenant rather than browser IDs.

### P1

- Revisioned projection outbox and drift reconciliation.
- Custom-domain lifecycle verification.
- Cache invalidation and stale-context behavior.

### P2

- IDNA policy, DNS expiration automation, and signed emergency cached context.

## Abuse-case acceptance test

On Tenant A's host, submit Tenant B's slug, agent ID, listing ID, session ID, and spoofed internal headers. The expected result is either Tenant A-scoped behavior or a generic failure. No Tenant B branding, listing data, lead row, alert, notification, or log payload may be produced.

