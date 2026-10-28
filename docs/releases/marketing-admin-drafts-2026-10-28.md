# Marketing Administration: Release Evidence

Prepared October 28, 2026. Branch: `codex/marketing-admin-drafts`. Parent: PR #87, `740757ed8149c55ead0c671389d5ffcb31596114`. This delivery implements group A of the next-release plan. It is stacked on the open homepage PR; it does not establish the parent's release readiness.

## Result

`GET /api/admin/marketing` uses the existing server access decision, then restricts global marketing content to admin/operator roles, the configured operator email, or existing local-development access. A regular realtor cannot manage global content. Reads are validated against a strict bounded schema and return `Cache-Control: private, no-store`. Invalid repository content returns a sanitized unavailable response.

`POST` checks the same access, then returns 409 with `MARKETING_PUBLISH_UNAVAILABLE`. It does not parse submitted content or write to the deployment filesystem. The public homepage components continue to use the repository content directly.

The editor uses “Download Draft.” It validates the complete draft, preserves unchanged fields, starts a JSON download, and states that the live site has not changed. Invalid drafts and download failures retain the current edits. No POST is sent by the editor. Drafts exist only in page memory until downloaded; navigation or reload discards them.

## How to Use

1. Sign in with an admin/operator account or the configured operator account. Open `/admin/marketing`. Existing development-local access also works.
2. Edit the fields you want to propose, including hero, section labels, feature descriptions, calls to action, or FAQ entries.
3. Select **Download Draft**. Review `marketing-copy.draft.json` before publishing it.
4. In a reviewed repository change, replace `apps/pulse/config/marketing_copy.json` with that file's validated content. Deploy the approved change to publish it.
5. If loading fails, use **Try Again**. An access-denied message requires an authorized account; retry does not bypass access controls.

## Verification

- Passed: 11 route/access cases, including anonymous callers, regular realtor/consumer roles, admin/operator roles, both configured-email paths, existing local access, unavailable content, and refused legacy publication.
- Passed: 2 schema cases, covering complete content round-trip plus unknown/missing fields, whitespace-only text, oversized text, and oversized FAQ collections.
- Passed: 5 editor interaction cases, covering multi-field export without publication, invalid draft retention, download-failure retention, denied-read recovery, and malformed content.
- Passed: focused ESLint for the editor, route, three new marketing modules, and their tests.
- Passed: scoped TypeScript check including those files, their imported dependencies, and the normal test setup. This is not a full-app TypeScript/build result.
- Passed: whitespace/diff review for this delivery.
- Not performed: production writes, Supabase mutations, browser deployment review, full build, or waiting for the parent's pending CI.

The original checkout's existing working changes were backed up and preserved. Runtime changes were made in a managed worktree from the verified PR parent. New dependency packages and migrations are not required.

## Next Delivery

Start the Zod contract migration on its own branch as group B. Explorer's typed-search and real-value GeoJSON work can proceed independently of its missing crash stack. Booking remains conditional on a verified scheduling authority.
