# Vibes UI manual verification

Use an authenticated operator session and verify each surface at 1440px, 1024px,
768px, and 390px widths.

## Navigation and list

- Open `/vibes`; confirm the Vibes menu and workflow links remain reachable on mobile.
- Filter by each status, search for a nonexistent term, clear each filter, and confirm the contextual empty state.
- Select rows, choose a bulk action, and confirm the top and bottom toolbars do not overlap their select arrows.

## Authoring and editor

- Open Add New Vibe; confirm Title is first, slug guidance is visible, and starter style is collapsed.
- Open starter style, select a preset, and save a draft.
- In the editor, toggle every panel and confirm controls remain mounted; save once with all panels closed.
- Confirm the publishing rail stays visible on desktop and appears before the canvas on mobile.

## Workflow screens

- Submit a draft for review and confirm the status changes.
- Publish an in-review Vibe with an optional change summary.
- Open revisions, compare two revisions, and verify current-published action eligibility.
- Open Source, Taxonomy, Audit, and Status & Actions; confirm shared back navigation and readable dense surfaces.
- Open Apply, check the current site pointer, and verify the final confirmation context before cancelling.

## Keyboard and preview

- Tab through menu, filters, row actions, panel toggles, Save, confirmation dialogs, and notices.
- Open Preview and confirm the saved Vibe colors, typography, spacing, and accessible “Ask Jamie” button label render correctly.

Record screenshots and any findings in the PR #75 review notes.
