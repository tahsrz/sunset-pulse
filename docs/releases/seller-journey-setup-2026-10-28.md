# Seller Journey and Setup Acceptance

Branch: `codex/seller-journey-setup-acceptance`, based on sharing pilot PR #96 at `5475079e`. This continues release-plan group H through preparation editing, saved journey evidence and setup status, using the existing disposable seller-service runner.

## Changes Found Through Verification

The client progress screenshot's development issue came from the global Jamie dock loading cloud history while closed. The fresh migration chain has no `jamie_interactions` table; that legacy table is defined only in an older deployment script. The browser logged `MEMORY_BRIDGE_LOAD_ERROR` with `PGRST205`. Jamie now loads history when its dock is open or its dedicated workspace is active. Closing or unmounting ignores its pending UI update. The real-auth suite records only legacy request methods and verifies that ordinary owner/client walkthroughs make no such history requests. It also checks that the client progress page has no Next.js issue badge.

This fixes the background request. It does not provision legacy cross-device history. Opening Jamie against a database without that legacy schema can still use the existing local fallback and report the missing table. Review that feature's schema, account-scoped browser storage and retention together before claiming cloud history is ready. No new chat table or cloud storage is introduced here.

Generated Next route validation also found two older handler signature errors. The archive handler's Promise now declares `NextResponse`. The headless cartridge route awaits promised dynamic parameters, and its targeted regression uses the same parameter shape. These changes satisfy the framework's handler contract without changing archive authorization or cartridge content.

## Reproduce

With Docker running and Playwright Chromium installed, run from the repository root:

```powershell
npm run test:seller-service:auth --workspace=apps/pulse
```

Use the installed browser cache through `PLAYWRIGHT_BROWSERS_PATH` if necessary. No hosted credentials are required. The runner uses a generated local Supabase project, the full migration chain, its own `.next-e2e` server and separately verified owner/client password sessions. It disables mock auth and outbound providers. Teardown removes its database, accounts and temporary configuration.

## New Browser Walkthrough

- At 390px and 1440px, open a fresh fictional case. Its first next action links to the exact saved request. Edit private preparation notes, close with Escape, keep editing and confirm the draft survives. Explicitly discard and reopen to confirm the baseline is restored. No case is saved during those steps. Save once and confirm the private notes persist through reload and later actions.
- Link an accepted appointment through the real API. Confirm its saved time is shown as **Planned**, while the held consultation has no date and remains the next action. Record attendance through the actual milestone drawer with a local date and evidence. Reload and compare the rendered date and server evidence. A missing older conversation must not move the next action backward.
- Compare owner and no-site account setup at both widths with the real saved health API. The no-site account has reminders explicitly disabled through its preference API. Check Ready, Needs action and Unavailable states, the existing link destinations, the manual mailbox path, collapsed operator details and saved-status refresh.
- Abort only the setup read to simulate unavailability. Confirm the app shows a read error instead of completed setup. Remove the fault, retry through the UI and verify recovery from the real API without changing saved preferences. No successful API response is mocked.

The synthetic appointment starts within the existing confirmation contract's five-minute past window. An initial fixture using yesterday's appointment was correctly rejected; the test was corrected without weakening the scheduler. Timestamp comparisons use instants rather than assuming PostgreSQL and JavaScript emit the same UTC string format.

## Results

- Complete real-auth seller-service run passed in 234 seconds on generated project `pulse_auth_d3da6876`, including all nine database regression packets and the existing sharing, privacy, planner/reminder, delivery reconciliation, milestone correction and ownership-transfer checks. Teardown removed the generated stack and temporary configuration.
- The added preparation, journey and setup walkthrough passed at 390px and 1440px. No successful API response or browser session was mocked. The only injected fault was an aborted setup read, followed by real recovery.
- No legacy history request occurred during the owner/client walkthroughs, and the client progress page had no Next.js issue badge.
- Twenty focused tests passed across journey, setup, publication, minimized Jamie and audio lifecycle suites. The targeted headless route regression also passed with promised parameters; the other ten tests in that route suite were not selected.
- Full application TypeScript passed with generated Next route validators included after the two handler fixes. Focused ESLint reported zero errors and the existing wake-listener dependency warning in `JamieChat.tsx`. Node syntax and whitespace checks passed.

## Evidence and Remaining Work

Screenshots stay in the ignored `apps/pulse/.pulse-local/platform-auth-acceptance/` directory: `preparation-draft-*`, `journey-planned-*`, `setup-owner-*`, `setup-empty-*` and the existing sharing screenshots. They contain fictional local contacts only.

This is automated local acceptance. Human usability review, actual navigation into billing/site management, physical microphone checks, production-build performance, live Mapbox rendering and deployed acceptance remain open. The local runner excludes Realtime and Mongo; fallback notices from those integrations are not evidence of their availability. No production migration, hosted secret change, provider delivery or activation is performed by this work.
