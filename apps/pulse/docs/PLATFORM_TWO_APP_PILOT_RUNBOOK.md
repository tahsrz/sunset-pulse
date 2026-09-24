# Sunset Pulse two-app pilot runbook

This runbook defines a small, evidence-led rehearsal for the two reviewed, capability-empty manifests. It is a preparation aid, not authorization to enable providers, send email, publish content, migrate production, or invite real users. Complete the local authenticated acceptance first; use a dedicated non-production workspace and explicit operator approval for any participant pilot.

## Readiness gates

- [ ] Local `node scripts/platform-local-auth-acceptance.mjs --stack <existing-stack-id>` passes, including both app manifests and member/reviewer role checks. Pass `--apply-local-migrations` only after reviewing each migration the harness reports missing.
- [ ] The test environment is identified as non-production, has a named operator, and uses the intended migration set.
- [ ] `platform_run` admission is enabled only in that approved test environment; record its prior state and restore it after the session.
- [ ] Both installed manifests are the reviewed `real-estate-readiness.v1.json` and `client-content-review.v1.json` revisions, with empty `capabilities` arrays.
- [ ] Provider invocation, paid calls, external-effect dispatch, outbound email and publication remain disabled.
- [ ] Workspace budget and provider quotas are set to the explicitly approved conservative values; no provider integration is configured for this pilot.
- [ ] Participants know this is an intake/review exercise. No output is an authoritative property fact, client approval, publication approval, or instruction to contact anyone.
- [ ] Use only property/content references participants are authorized to access. Keep names, emails, full addresses, credentials, and client-sensitive text out of this evidence log.

Do not begin a participant session if any readiness gate is unchecked. A successful disposable test does not satisfy the real-participant permission or business-acceptance gates.

## Participants and authority

| Role | May do in this pilot | Must not do |
| --- | --- | --- |
| Workspace owner/admin | Install or revise the two manifests; set workspace budget; inspect audit/economic evidence | Enable providers or external effects without a separate operational decision |
| Member | Start an installed workflow; provide the requested property intake; start content-review intake | Install apps, change quota policy, treat an intake answer as verified source data |
| Reviewer | Respond to permitted review checkpoints on a member-started run | Start runs, edit installs/budgets, approve publication or send content externally |
| Operator/observer | Record timings, blocked actions, support work and evidence references | Copy sensitive source data into the log or bypass an authorization block |

Keep the number of participants small enough to observe every run. A reviewer may be the same person as an observer, but the workspace role remains `reviewer`.

## Session procedure

1. Record a session identifier, environment label, operator, participant roles (pseudonyms only), start time and planned end time.
2. Confirm the two app keys, manifest versions/hashes, install revisions, settings, workspace budget revision and disabled-provider state. Record IDs/hashes, not credentials or raw configuration secrets.
3. Select one mapped property reference. Confirm its current source revision and that the participant is authorized to use it. Do not copy the street address into the evidence log.
4. As a member, explicitly start `real-estate-readiness`. Record the run ID and start time. Answer the question with the next task or missing fact to organize; do not enter an unsupported factual assertion.
5. Confirm the run completes and the answer is attributed to the member. Mark whether the participant considers the resulting intake useful; this is a subjective intake-quality rating, not acceptance of a verified property artifact.
6. Select one authorized content revision. Record its opaque revision reference only.
7. As a member, explicitly start `client-content-review`. Record its run ID and start time.
8. As a reviewer, provide review notes through the existing checkpoint. Confirm the reviewer cannot start a run and cannot convert notes into publication approval.
9. Confirm completion, response attribution and the distinction between review notes and approval/publication state.
10. Inspect the run-linked capability reservation and effect-receipt read models. Record zero reserved/consumed provider cost and zero external effects for these capability-empty flows. If any reservation, provider call, email, publication or effect receipt appears, stop the session and preserve evidence for investigation.
11. Record authorization blocks, revision conflicts, recovery attempts, elapsed times and operator support minutes. Do not repeat a failing write with changed payload under the same idempotency key.
12. At session end, verify admission/provider flags remain at their approved state; capture the final budget/economic evidence and have the operator review the notes with participants.

## Evidence record template

Create one copy per session. Use UTC timestamps and pseudonymous participant labels. “Accepted” means the participant explicitly states that the specific output was useful for its narrow stated purpose; it does not certify factual accuracy, legal compliance, client approval, or authorization to publish/contact.

```text
Session ID:
Environment (must be non-production):
Operator pseudonym:
Date and timezone:
Owner/admin pseudonym:
Member pseudonym:
Reviewer pseudonym:
Admission enabled for this environment only? (yes/no):
Providers/effects/email/publication disabled? (yes/no):
Workspace budget revision/reference:

Property workflow
- App version/hash and install revision:
- Pseudonymous property reference and mapped source revision:
- Run ID:
- Start / completion timestamps (UTC):
- Member response reference (do not paste sensitive answer):
- Participant says intake was useful? (yes/no/uncertain):
- Reason, in non-sensitive terms:
- Reserved cost / consumed cost / external effects:
- Blocked action or recovery evidence references:

Content-review workflow
- App version/hash and install revision:
- Opaque content revision reference:
- Run ID:
- Start / completion timestamps (UTC):
- Reviewer response reference (do not paste client-sensitive text):
- Reviewer says notes were useful? (yes/no/uncertain):
- Publication approval or external effect occurred? (must be no):
- Reserved cost / consumed cost / external effects:
- Blocked action or recovery evidence references:

Operations
- Support minutes by issue category (setup / access / input / recovery / other):
- Number of participant questions requiring operator intervention:
- Any unexpected data exposure or scope change? (yes/no; stop and escalate if yes):
- Admission/provider flags restored and verified by:
- Follow-up action owner and date:
```

## Decision rules

- **Stop immediately:** unexpected provider call/cost, external effect, cross-workspace access, source revision mismatch, unapproved publication/contact, or unexplained role success. Preserve IDs and audit references; do not retry or erase evidence.
- **Repeat only after correction:** confusing prompt, missing non-sensitive input, recoverable local outage, or bounded validation error. Record the issue and support time before retry.
- **Continue to a broader pilot only after review:** local authenticated acceptance passes; each role boundary behaves as expected; no external effects occur; participants find the narrow intake/review useful; and an operator reviews actual support burden and economic evidence. Any production migration, provider activation, paid usage, or outbound communication requires a separate explicit operational decision.

## Current ledger

- Disposable Postgres rehearsal: implemented; execution status is recorded in the operating platform plan.
- Local authenticated browser harness: passed with temporary local Supabase accounts; output is technical auth/role evidence, not participant acceptance.
- Real participant sessions and accepted-output/economic/support evidence: not yet collected.
- Provider dispatch, external effects and production activation: disabled/not authorized by this runbook.
