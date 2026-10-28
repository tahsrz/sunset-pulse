# Fieldbook implementation

October 14, 2026. This change applies the approved Fieldbook design to the existing application. The interactive study remains a separate source of examples, with fictional records and local actions.

Updated October 28: the selected **Daily focus** direction now applies to `/today`. `SellerDailyFocus.module.css` scopes the blue/white and dark-mode palette to that page, with one primary seller action and two under **Next Up**. Other priorities remain behind **More next actions**. **Action Details** reveals each action's saved reason. Ranking, destinations, consent and scheduling behavior remain in their existing code. The selected preview's fictional names and arbitrary appointment controls are not live application data.

## Changes

`components/realtor/Fieldbook.module.css` provides the base paper/ink colors, a rust accent, ruled sections, readable control borders and visible keyboard focus. The current heading treatment uses sans serif italics. Its styles are scoped to Fieldbook screens; Today applies the palette override above. Appearance follows the browser's light/dark preference. It introduces no stored appearance settings, uploads or database records.

`FieldbookShell.tsx` supplies the page header and optional existing navigation. Today displays the date from the saved workspace timezone. `SellerNextActionRow.tsx` replaces the old priority cards with numbered rows and names. Ranking, exact destinations, read recovery and loaded limits remain in their existing code.

Today places appointments beside seller actions on desktop and below them on mobile. **Business and settings** opens the secondary panels; **This week’s progress**, **All seller activity**, **Seller daily routine**, **Why now** and **More next actions** retain native disclosures. Exploring these sections makes no new API request or write.

Cases keep **Preparation** open by default. **Milestones**, **Appointments**, **Conversation**, **Shared progress** and **History** open through native disclosures. Closing a section retains its form fields. Conversation shows saved messages before the action form.

| Area | Application location |
| --- | --- |
| Daily actions, appointments and reminders | `/today`, `/planner` |
| Seller requests | `/seller-inbox` |
| Cases, preparation, correspondence and shared-progress controls | `/seller-cases`, `/seller-cases/[leadId]` |
| Verified client progress | `/seller-portal` |
| Ledger, goals and weekly-review controls | `/business`, `/goals`, existing planner review actions |
| Setup | `/seller-setup` |
| Drafts, revision review, application and rollback | `/vibes` and its existing child routes |
| Shared checkpoints and run records | Existing workspace inbox and run components |
| Property notes and capture | `/property-shortlist`, `/scan-studio`, `/admin/property-scans` |
| Jamie | Existing proposal components and `/jamie-chat` |
| Games | `/play-jamie` hub and local scorecard |
| Public intake | `/seller-plan` |

The game hub is a ruled list with the existing five destinations. Game engines, match boards, local records and the external Crash Bash service retain their current contracts. Client progress and public intake do not receive owner navigation.

## Use the features

1. Sign in and open **Today**. Use the primary action in **Today’s Focus**, or expand **Action Details** for its reason. **Next Up** shows two more actions; **More next actions** reveals the rest of the loaded priorities. **Ask Jamie** opens the existing assistant and **Manage Consultation Hours** opens the internal calendar. Appointments retain their existing date-specific planner and seller links.
2. Use **Inbox** or **Cases** to open a seller. Edit and save preparation, notes and reviewed document links before another case action. Expand **Conversation**, **Milestones**, **Appointments** or **Shared progress** for the existing save/review controls. **History** shows recorded case events. Closing and reopening a section retains its draft.
3. Open **Planner** to save a task, bill or an agreed consultation. Reminders and recurrence use the existing infrastructure. Booking a consultation does not record attendance.
4. Use **Business** for received income, paid expenses and expected income. Corrections and payments keep their existing review dialogs. Open **Goals** for targets, and **Review week** from a planner review task for the weekly checklist.
5. Open **Setup** for account/intake and operator status. Sender, schema and hosted-worker configuration still require their existing release checks.
6. Use **Publishing** for exact draft/revision review and site changes. Shared checkpoint decisions retain their existing role and revision checks. Changing the visual treatment does not approve or publish a resource.
7. In property capture, review permissions before initiating a session or upload. In Jamie, review a proposal before confirming its normal domain action. Microphone/camera capture requires the existing explicit activation.
8. Open **Play Jamie** and select a game. Crash Bash opens its existing launch guide; its accounts and records remain separate. Public seller requests still distinguish requested contact from optional marketing/measurement choices.

## Verification

The existing focused regression packet passes 71 tests across 15 files: seller priorities/recovery, scheduling, finance draft recovery and dialog focus, Jamie proposal retry identity, seller-service boundaries, public intake/measurement, Vibe disclosure/edit/revision confirmation and browser game records. Whole-app TypeScript checking passes. The production build passes compilation, type checking, generation of 272 pages, optimization and traces for the visual foundation; the final case disclosures and date recovery additionally pass TypeScript, unit and native-browser checks. Changed-source lint has no errors; Scan Studio's existing `loadSessions` effect-dependency warning remains.

Native Chromium renders 17 actual-component fixtures with generated Tailwind and compiled CSS modules, using synthetic records and a Next navigation shim. Desktop, 390px and 320px layouts pass in both appearances, including all expanded case sections. Visible normal text meets 4.5:1 contrast and large text meets 3:1 in the checked fixtures; disabled controls are excluded. Checks cover exact destinations, disclosures, message review invalidation, draft retention after closing a section and after a rejected save, dialog Escape/focus return, CMS collapse, game destinations and private-note exclusion from client progress. The 34 fixture screenshots remain local and are not hosted acceptance or production screenshots.

The design study's five adjustment controls are preview controls, not application settings. A new journey projection and focused action drawer remain separate behavioral work in the [experience plan](HUMANIZED_OPERATING_EXPERIENCE_PLAN.md). This implementation reuses all current APIs, authorization, request identities, planner/reminder jobs, dispatch and worker infrastructure. No migration, cron, provider enablement or manual deployment is added.
