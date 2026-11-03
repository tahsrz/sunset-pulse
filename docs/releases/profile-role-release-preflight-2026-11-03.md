# Shared Database Release Preflight

Branch: `codex/profile-role-release-preflight`, based on [PR #100](https://github.com/tahsrz/sunset-pulse/pull/100) at `6276d8cf`.

The owner confirmed that production and previews use the same Supabase project, `xlyfhiafactxahhvikyv`. It must be treated as production. The earlier description of that project as a separate non-production target is superseded. Hosted mutation walkthroughs and migration application require their own reviewed production rollout. This delivery performs aggregate-only reads and local disposable acceptance.

## Hosted Findings

The final read-only snapshot was taken November 3, 2026 at 20:58 UTC. The CLI's linked project ref matched the explicitly selected ref before and after the query. Its SQL runs inside `BEGIN READ ONLY` with an eight-second statement timeout and ends with rollback.

| Check | Result |
| --- | --- |
| Profiles by role | Seven consumers; no operator/admin profiles |
| Privileged profile assignments outside the two approved addresses | Zero |
| Migration history | 163 applied, 166 in this source checkout |
| Pending migrations | Three, listed below |
| Remote versions absent from source | Zero |
| Repaired signup function, role-guard function and trigger checks | Fail |
| Database preflight | **BLOCKED**, expected exit code 2 |

The owner supplied two approved account addresses for comparison. They are held in an ignored local input file. No account email, user ID or routine body is returned by the query or included in this record. Approval is review input; this tool does not assign roles or infer that consumer profiles need promotion.

This is a current profile-role snapshot, not evidence that the site has never been exploited. Email-based operator overrides are a separate authority: `OPERATOR_EMAIL` and `AUTHORIZED_EMAIL` can grant access without an operator/admin profile. Their deployed values remain unverified.

Vercel project metadata is accessible for `sunset-pulse`. At inspection, production metadata identified `main` commit `31c9571ec4cbe0102b780fcfd53d2b4e393b3fcd`; the PR #100 preview referenced `6276d8cf` and was building. It was not polled or used for mutation acceptance. The connector returned 403 for project environment metadata. A CLI fallback was unavailable: Vercel was not installed/cached, no signed-in CLI state was found in the checked locations, and no configured CLI token was present. No environment access grant, deployment, flag or variable was changed.

## Exact Pending Migration Packet

The report includes each filename and SHA-256 of its LF-normalized source for review:

| Migration | Effect requiring review |
| --- | --- |
| `20261028120000_internal_seller_consultations.sql` | Adds internal calendar settings and interval claims, booking triggers and service RPCs. Calendar settings default to disabled; the migration enables no calendar or working hours. Existing scheduling resources and reminder infrastructure are reused. |
| `20261028123000_internal_seller_calendar_read_grants.sql` | Gives the service role SELECT on scheduling bookings and availability for the owner-checked calendar reader. |
| `20261103150000_profile_role_assignment_guard.sql` | Repairs signup role assignment and installs the direct-write guard. It preserves existing account roles and must be paired with the reviewed auth callback repair. |

The aggregate profile audit found no current operator/admin assignments to demote. No cleanup, promotion, migration, booking, worker execution, message, storage upload or provider activation was performed against the shared project.

## Reproduce the Read-Only Audit

Use the installed Supabase CLI with `db query --linked` support; this machine ran 2.109.0. No environment-file or service-key loading is needed. Keep the private approved-address input outside tracked source, for example under `.pulse-local/`:

```json
{"emails":["approved-owner@example.test"]}
```

From the repository root, using the explicitly reviewed linked directory:

```powershell
node apps/pulse/scripts/profile-role-release-preflight.mjs `
  --expected-project-ref xlyfhiafactxahhvikyv `
  --linked-project-dir C:/Users/Taz/SunsetPulse/apps/pulse `
  --approved-accounts-file apps/pulse/.pulse-local/profile-role-approvals.json
```

The tool verifies the existing link; it never links a project. It hashes the approved inputs before constructing SQL, uses only aggregate counts and routine metadata, and executes the installed CLI through its JS entry point without shell interpolation. Explicit CLI agent/JSON mode keeps the response envelope stable after environment isolation. Only OS/network and CLI authentication settings are forwarded; inherited project, database and provider overrides are excluded. Temporary SQL is removed. The resulting report stays in ignored `.pulse-local/profile-role-release/report.json`.

Migration bookkeeping alone cannot pass the audit. Stored routine bodies must match the repaired source fingerprints, expected definer/invoker attributes, pinned search paths and trusted ownership. The guard trigger must point to the correct function and run before both row inserts and updates. CRLF checkout line endings normalize consistently; literal carriage returns inside source are preserved. The report never calls itself release-ready: `DATABASE_CHECKS_PASS` covers only its database checks, while callback deployment and environment permissions remain separate.

## Verification

```powershell
npm run test:profile-roles:preflight --workspace=apps/pulse
npm run test:profile-roles:db --workspace=apps/pulse
```

All nineteen offline checks pass, including mismatched-target rejection before approval-file reads, CLI environment isolation, source/history drift, unsafe trigger/function attributes, malformed counts, input injection and omission of unexpected provider identity fields. The existing generated Supabase runner passes eighteen role-boundary database assertions plus four real preflight scenarios: repaired routine fingerprints, an approved/unapproved aggregate split, matching approvals and disabled-trigger detection. The final local run took 46 seconds and removed its generated project and fixtures. It starts no browser server and invokes no application scheduler or worker. Node syntax and whitespace checks pass. No new application build or TypeScript run was needed for these script-only changes.

## Next Release Actions

1. Preserve the shared-production classification. Use an isolated disposable project for mutation acceptance until a separately verified hosted test target exists, or a specific production test/cleanup procedure is approved.
2. Review the three-file migration packet and the callback repair in PR #100. Prepare the intended release from reviewed source; applying migrations from this checkout affects the shared production database. Calendar activation remains a separate owner action.
3. Have an authorized Vercel owner verify deployed operator-email overrides against the two approved addresses, or grant the connector the needed environment-read permission. No secret values need to be posted in chat.
4. After the approved migration/deployment rollout, rerun this preflight and the reviewed access matrix. A passing database report alone does not establish callback deployment or application release readiness.
5. Continue approved publication assets, controlled performance measurement and human/device review independently. No new cron or storage infrastructure is required for this preflight.
