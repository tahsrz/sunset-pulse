# Play Jamie local records

Open `/play-jamie` and look for **Your local records** above the game cards. It shows Chess wins/draws/losses, Block Drop's best score, Poker hands/wins/ties/losses, and Sunset Volley matches/wins/losses from the same browser's existing records.

Choose a game, play, then use its **Play Jamie** link to return to the hub. Completed matches and hands update their records; Block Drop saves a new best score during play. The hub refreshes when reopened, when the window regains focus, and when another tab changes or clears a game record.

Records belong to this browser and origin, without a sign-in. A different device, browser, or preview URL has separate records. Crash Bash continues to use its own records on its external site. Clearing browser storage removes local records.

## Unavailable or unreadable records

The scorecard distinguishes missing records (zero counters), unreadable saved records, and unavailable browser storage. It does not write or delete records while reading them. It validates bounded saved values as nonnegative safe integers and ignores unknown object fields. Valid existing record formats and keys are preserved:

| Game | Existing storage key | Format |
| --- | --- | --- |
| Chess | `sunset_play_jamie_chess_record` | JSON wins/draws/losses |
| Block Drop | `sunset_play_jamie_tetris_high_score` | Integer text |
| Poker | `sunset_play_jamie_poker_stats` | JSON hands/wins/losses/ties |
| Sunset Volley | `sunset_play_jamie_volley_stats` | JSON matches/wins/losses |

When a game cannot read a record it starts with in-memory zero counters. New scores or completed matches can replace an unreadable record with a valid one if storage allows saving. If writes fail, gameplay and current-session counters continue; the hub shows only records that were actually saved. Unsaved counters do not survive leaving the game.

The shared theme and cart providers also tolerate blocked storage access, save quota errors, and denied removals. Their existing keys, formats, settings authorization, and in-memory behavior are retained. `CartContext` now uses the `.jsx` extension to match its existing JSX syntax and support provider regression tests; a compatibility re-export preserves the existing module path.

## Verification: October 13, 2026

Four initial regressions reproduced denied-read crashes in Poker, Block Drop, and Volley, plus Block Drop's quota-exceeded save crash. The fixed game/storage/scorecard suites pass, along with existing game-engine, route, audio, and server-cart checks. Shared-provider tests cover denied storage access, save/remove failures, and normal preference/cart restoration. Whole-app TypeScript and changed-source lint pass.

Browser acceptance on the mock dev server forces browser API requests to HTTP 503. It verifies saved records, real cross-tab updates, game/return navigation, isolated malformed data, and no horizontal overflow at 390px. A separate browser context makes the `localStorage` getter throw: the hub shows its storage notice, Block Drop still supports hard drop and pause, and return navigation works with no page errors. Desktop/mobile screenshots were inspected. This feature requires no Supabase, provider, scheduler, migration, or environment setup.
