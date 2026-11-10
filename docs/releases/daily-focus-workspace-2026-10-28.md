# Daily Focus Workspace

The user selected the **Daily focus** variant in the existing Sunset Pulse experience study. Branch: `codex/daily-focus-workspace`, based on the internal consultation scheduler in PR #93. This applies the selected presentation to the existing `/today` workspace.

## Use

1. Sign in and open `/today` with personal planner setup complete. **Today’s Focus** shows the highest-ranked loaded seller action. Its button opens the existing inquiry, date-specific planner or seller case.
2. Expand **Action Details** for the stored reason. Two further actions appear under **Next Up**. **More next actions** retains access to the rest of the existing eight-action display limit; the inbox/case/planner links retain access beyond the loaded summaries.
3. Use **All seller activity** to schedule a response through the existing dialog. Opening/closing the dialog is read-only. **This week’s progress** contains the reporting dates and recorded outcomes; **Business and settings** keeps existing secondary controls.
4. **Ask Jamie** opens the existing assistant context. **Manage Consultation Hours** opens `/consultations`, implemented in PR #93. This presentation change does not configure or activate that calendar.

## Implementation

`SellerNextActionRow.tsx` adds focused and compact presentations while preserving typed actions and exact destinations. Person initials come from actual loaded request/consultation/overdue names. Other task types use an activity icon. No fictional names, proposed times or prewritten messages from the design study enter runtime data.

`SellerPriorityPanel.tsx` retains ranking, recovery, request cancellation, the eight-action loaded limit and overflow destinations. One focus plus two upcoming actions are shown initially; the rest stay in the existing disclosure. The weekly reporting caption moves under its progress disclosure.

`FieldbookShell.tsx` accepts an optional scoped class. Only Today's caller applies the new light/dark palette from `SellerDailyFocus.module.css`. Existing navigation, auth, cases, public pages and scheduling contracts are retained. Headlines remain sans serif italic. No stored theme setting, new API, migration, cron, background task or message-sending action is introduced.

## Local Verification

- 20 targeted unit/component tests passed across priority ordering/recovery, daily activity, recovery from missing/malformed reads and post-schedule agenda/reminder handoff. New assertions check one primary action, the exact overdue planner destination, a collapsed reason and task titles that must not become person initials.
- The existing Playwright seller-daily walkthrough passed against a local dev server with fictional API fixtures and local mock auth, at 320, 390, 768 and 1440 pixels. It checks one focus card, its exact inquiry link, italic sans-serif heading, calendar link, viewport-safe scheduling dialog, Escape dismissal, no horizontal overflow and zero realtor mutation requests. Screenshots: `apps/pulse/test-results/seller-focus-{width}.png` and `seller-daily-{width}.png`.
- The final Playwright walkthrough also checks dark mode at 390px without horizontal overflow. Screenshot: `apps/pulse/test-results/seller-focus-dark-390.png`.
- Focused ESLint, route type generation, full application TypeScript and whitespace checks passed.

The walkthrough used the existing local mock mode and dummy database credentials. It verifies UI behavior, not authenticated production data or actual scheduling persistence. Existing scheduler transaction evidence is documented separately in [PR #93's implementation record](internal-seller-consultations-2026-10-28.md). No hosted CI waiting or deployment was performed.
