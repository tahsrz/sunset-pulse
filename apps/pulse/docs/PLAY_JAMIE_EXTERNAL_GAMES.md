# Crash Bash in Play Jamie

Open `/play-jamie`, select **Crash Bash Online**, then select **Play on crashbash.app**. The game opens in a new tab. The launch page at `/play-jamie/crash-bash` includes keyboard controls, controller/touch guidance, and private-room directions.

Battle supports guest play; Adventure saves require a separate Crash Bash account. Friends join a private battle using the host's room code. Crash Bash uses its own CPU opponents and records, so matches do not affect Jamie's local game records.

## Integration boundary

This is a static launch guide and external link. It loads no Crash Bash scripts, frames, assets, or account data inside Sunset Pulse and needs no database, worker, or environment configuration.

On October 12, 2026, `https://crashbash.app/` returned `Content-Security-Policy: frame-ancestors 'self'` and `X-Frame-Options: SAMEORIGIN`, which prevent embedding it on Sunset Pulse. No published source repository or redistribution license was found on the project pages reviewed. Its [terms](https://crashbash.app/terms) prohibit copying its data. This integration does not describe the game as open source or copy its game files.

Directions are based on the project's [game page](https://crashbash.app/), [FAQ](https://crashbash.app/faq), and [privacy policy](https://crashbash.app/privacy). Those pages are the authority for changing controls, room behavior, and account requirements. Sunset Pulse links to the game's help, terms, and privacy pages beside the launch directions.

## Verification

The 16 existing route-catalog, route-directory, and client-widget tests pass. Changed-source lint and whole-app TypeScript pass. A headless browser confirmed the five-card hub, guide navigation, keyboard focus, no horizontal overflow at 390px, no Crash Bash requests before launch, the actual Crash Bash page opening in a new tab, and the return link, with no local page errors. Desktop and mobile screenshots were inspected. This verifies the launcher; a full multiplayer match was not exercised.
