# Land listing editor — November 25, 2026

## Source and scope

- Branch: `codex/land-listing-editor`.
- Verified remote main at start: `370abe4`.
- Starting pilot head: `e6078bb` (`codex/keller-hicks-preview`), two commits ahead of main; no existing pilot PR was found.
- The original `C:\Users\Taz\SunsetPulse` working changes were preserved. Implementation uses the clean `.keller-release-preview` checkout.

Operators can now edit marketed and surveyed acreage separately, zoning with its source, development and approval status, constraints, and up to eight labeled HTTPS document links in `/admin/listings`.

The editor validates a draft and displays a review before saving. Changing a form field invalidates that review. The review shows whether the save will publish or remain private, and uses the same land-details component as the public listing. Failed saves retain the form entries. This is a review of the address, price, status, description, and land details, not a full-page preview of every photo and property field.

Facts are stored under `properties.metadata.land_details`; no database schema migration is needed. The public detail projection explicitly validates that object and never publishes arbitrary metadata. Inventory cards remain compact. Saving refreshes the UUID and MLS detail routes as well as the catalog.

Keller Hicks retains the reviewed pilot facts until its first editor save. Loading that listing preloads the same facts; saving moves them into the existing metadata record. An explicitly cleared land section remains empty and does not resurrect the pilot copy. Older API callers that omit the land section preserve existing land facts.

The browser walkthrough also exposed an existing edit bug: canonical storage represents unknown living area as zero, while the form requires a positive value when present. The editor now reloads unknown living area as blank, allowing a land draft to be saved again and published.

## Completed local verification

- TypeScript: `tsc --noEmit --incremental false`, with an 8 GB process heap.
- 26 passing tests across the land contract, review UI, admin API, listing contract, and public projection suites.
- Chromium: 390px and 1440px land editor flows passed, covering review invalidation, private save, public publication, public facts and document links, reload, and no horizontal overflow.
- Chromium: existing priced-listing publication to the homepage slideshow passed.
- Chromium: Keller Hicks mobile inquiry and retry scenario passed.
- Inspected the mobile review screenshot; public and review screenshots use synthetic property data.
- The existing CI browser steps now include both new land-editor viewport scenarios and the Keller Hicks inquiry regression; land screenshots are included in the existing artifact upload.

Browser persistence tests used the local mock catalog. Unit tests mocked repository writes and operator authorization responses. These checks do not establish hosted database persistence or live operator permissions. Ancillary visitor-event requests in the local walkthrough reported invalid placeholder API credentials; the listing save/read flow used the mock repository and passed.

Repeat the relevant unit tests from `apps/pulse`:

```text
npm run test:unit -- tests/unit/land-listing-editor.test.ts tests/unit/land-listing-editor-ui.test.tsx tests/unit/admin-land-listings-route.test.ts tests/unit/public-inventory.test.ts tests/unit/listing-contract.test.ts
```

For browser tests, set `PULSE_LISTING_EDITOR_E2E=true` and run the land editor, Keller Hicks inquiry, and homepage publishing scenarios with the repository Playwright configuration. On this Windows host, point `PLAYWRIGHT_BROWSERS_PATH` to the existing user browser cache if the sandbox uses a different cache root.

## Release and next actions

1. Review the PR and its preview build. The PR includes the two unreleased Keller Hicks pilot commits; production has not been promoted by this work.
2. In preview, use an authorized operator and a disposable private listing to confirm hosted save/reload behavior before publishing a real listing. Do not overwrite Keller Hicks just to test the editor.
3. Next product increment: measure property views, inquiry starts, and successful inquiries using the existing visitor-event and lead paths. Property views already have a tracker; inquiry-start instrumentation and a useful aggregate report still need implementation. Keep contact details and question text out of analytics events.
