# Seller Progress Sharing Pilot

Branch: `codex/seller-sharing-pilot`, based on consultation acceptance PR #95 at `a38b904e`. This extends the existing disposable seller-service acceptance suite through the actual owner and client controls. It uses fictional records and two verified local Supabase accounts with real password login and cookie sessions.

## Run It Locally

From the repository root, with Docker running and Playwright Chromium installed:

```powershell
npm run test:seller-service:auth --workspace=apps/pulse
```

Set `PLAYWRIGHT_BROWSERS_PATH` to the installed browser directory if the shell uses a different cache. No hosted credentials or production database are needed. The runner generates its own Supabase project, applies the migration chain, starts its own Next server, and removes its generated database, local Auth accounts and temporary configuration afterward. This suite now uses `.next-e2e`, keeping its output separate from normal development.

Outbound email and AI providers are disabled. Existing worker tests use synthetic acceptance and signed delivery receipts; they do not prove a live email was sent. No cron, queue, production migration, hosted configuration or activation is added by this change.

## Walkthrough

1. Open the fictional seller case as its owner, expand **Shared progress**, and choose **Review client update**.
2. Enter a summary and select one saved milestone, preparation item and approved document. Leave the second document unselected. Preview the exact update and confirm publication remains disabled until the review checkbox is checked.
3. Return to edit. Confirm the summary and selections survive, change the summary, and preview again. The earlier approval must be cleared. Previewing and editing must make no server write.
4. At 390px and 1440px, confirm the preview drawer fits the viewport with no horizontal overflow. Explicitly review and publish the update once.
5. In the separate verified client session, confirm publishing alone does not expose the update. Close the owner's access review without saving, then explicitly enable verified access.
6. Refresh client progress. Compare its API publication with the exact selected summary, milestone, checklist and document. Confirm private notes, private conversation text, the unselected document URL and contact email are absent. A different signed-in account must not see the publication.
7. Revoke access through the owner's confirmation. Refresh the client and confirm both the page and API remove the update. The owner must still have the saved publication with access disabled. Re-enable only to preserve the existing suite's subsequent synthetic checks.

The remaining seller-service suite retains ownership, stale revision and replay checks, changed-email fencing, disabled email sending, planner/reminder lifecycle, worker lease and delivery reconciliation, milestone correction and site-transfer privacy assertions.

## Observed Friction

The initial browser script could not find **Client summary** after returning from preview. Its exact label lookup included the textarea's initial text after remount. A minimal Chromium page reproduced the locator failure while the accessible textbox name stayed correct; the real dialog's DOM also retained all three selections. The walkthrough now locates the textbox by that accessible name and checks draft preservation explicitly. No publisher behavior change was justified by this failure.

The older seller-service script also expected controls inside closed case disclosures and obsolete page headings. It now opens **History** before using the saved planner handoff and follows the current **Request cohort details**, **Today’s Focus** and **Operator details** labels. These are acceptance-script corrections.

## Results

- The complete disposable seller-service run passed in 193 seconds on generated project `pulse_auth_13e3ca7e`. Both accounts used rendered password login with mock auth disabled. The runner confirmed teardown of the generated project and temporary configuration.
- All nine existing database regression packets passed before the browser flow. The complete browser/API/data suite passed, including the sharing walkthrough above and the existing planner, reminder, worker, milestone-correction and ownership boundaries.
- Thirteen focused tests passed across the publisher, action drawer, progress summary and seller-service suites. The new publisher regression verifies selected fields survive returning to edit and that editing clears approval without publishing.
- Focused ESLint and Node syntax checks passed. No application runtime or schema changes were needed for this delivery.

## Evidence and Remaining Work

Screenshots remain local under `apps/pulse/.pulse-local/platform-auth-acceptance/`, including `sharing-preview-390.png`, `sharing-preview-1440.png`, `sharing-client-390.png` and `sharing-client-1440.png`. They contain only generated test contacts. Use the [acceptance checklist](../../apps/pulse/docs/HUMANIZED_EXPERIENCE_ACCEPTANCE_CHECKLIST.md) for manual review directions.

This browser automation is local integration evidence. The [journey/setup follow-up](./seller-journey-setup-2026-10-28.md) completes the automated preparation, journey and setup checks and classifies the client development warning as closed-dock legacy history loading. That follow-up verifies no background history request or client issue badge. A human usability session, physical-device microphone capture, production-build performance measurements, live Mapbox rendering and deployed acceptance remain separate release work. Pending hosted CI is not polled by this delivery.
