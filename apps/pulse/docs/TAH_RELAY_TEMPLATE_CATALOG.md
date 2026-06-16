# TAH Relay Template Catalog

Sunset Pulse separates retrieval from relay.

- Retrieval answers: which `.tah` shards did the robot learn from?
- Content templates answer: what kind of explanation is this?
- Delivery formats answer: how should the robot perform the explanation?

The catalog lives in `apps/pulse/lib/command-center/relayTemplates.ts`.
`GET /api/commands` returns the current template and format catalog.

## Delivery Formats

Every delivery format must end with a final provenance screen. The final screen does not introduce new claims. It shows:

- where the information came from,
- which `.tah` source units were used,
- the main concepts pulled from those units,
- and what the user learned from the unit.

| Mode | Name | Use |
| --- | --- | --- |
| `briefing` | Briefing Card | Fast agent decision support inside the command center. |
| `slideshow` | Slideshow Deck | Client, buyer, seller, or team explanations as slide frames. |
| `puppetshow` | Puppetshow Explainer | Character dialogue, staged teaching, and memorable scene explanations. |
| `field-board` | Field Board | Spatial, tactical, map-like, or board-style context. |
| `script` | Talk Track Script | Words the agent can say, send, record, or adapt. |

## Content Templates

| # | Template | Category | Source TAH Anchors | Relay Use |
| --- | --- | --- | --- | --- |
| 1 | Lead Priority Board | agent | `lead_history.tah`, `market_rules.tah`, `agent_brand.tah` | Rank who to call or text first. |
| 2 | Intent Thermometer | agent | `lead_history.tah`, `objection_scripts.tah` | Show buyer or seller intent strength. |
| 3 | Pipeline Triage Grid | agent | `lead_history.tah` | Sort pipeline contacts into call, text, nurture, and wait lanes. |
| 4 | Re-Engagement Ladder | agent | `lead_history.tah`, `agent_brand.tah` | Wake stale leads with a gentle progression. |
| 5 | Call Blitz Queue | agent | `lead_history.tah`, `agent_brand.tah` | Build a timed call block with opener and fallback text. |
| 6 | Message Card | agent | `agent_brand.tah`, `lead_history.tah`, `objection_scripts.tah` | Produce a sendable client message. |
| 7 | Agent Voice Mirror | agent | `agent_brand.tah` | Reflect and apply the agent's writing voice. |
| 8 | CTA Polisher | agent | `agent_brand.tah` | Turn vague closers into one natural next step. |
| 9 | Client Trust Lens | agent | `agent_brand.tah`, `market_rules.tah` | Check credibility, tone, and overclaim risk. |
| 10 | Social Caption Frame | agent | `agent_brand.tah`, `listing_context.tah`, `local_business_context.tah` | Convert TAH-backed ideas into social copy. |
| 11 | Listing Storyboard | deal | `listing_context.tah`, `agent_brand.tah`, `comps_context.tah` | Turn property facts into a campaign story. |
| 12 | Feature Proof Stack | deal | `listing_context.tah` | Convert property features into buyer value plus proof. |
| 13 | Seller Update Card | deal | `listing_context.tah`, `market_velocity.tah`, `comps_context.tah` | Explain listing performance to a seller. |
| 14 | Showing Brief | deal | `listing_context.tah`, `neighborhood_context.tah` | Prepare showing talk points and watch-outs. |
| 15 | Campaign Hook Ladder | deal | `listing_context.tah`, `local_business_context.tah`, `agent_brand.tah` | Rank bold, balanced, and safe listing hooks. |
| 16 | Offer Position Brief | deal | `comps_context.tah`, `texas_real_estate.tah`, `market_rules.tah` | Explain price and terms posture for an offer. |
| 17 | Repair Risk Board | deal | `listing_context.tah`, `market_rules.tah` | Separate known property issues from questions and verification. |
| 18 | Seller Net Explainer | deal | `comps_context.tah`, `market_rules.tah` | Explain estimated seller proceeds with caveats. |
| 19 | Buyer Tour Route | deal | `listing_context.tah`, `neighborhood_context.tah`, `local_business_context.tah` | Sequence showings into a coherent buyer route. |
| 20 | Comps Prism | market | `comps_context.tah`, `listing_context.tah`, `market_rules.tah` | Explain valuation through range, confidence, and risk. |
| 21 | Market Signal Brief | market | `market_velocity.tah`, `comps_context.tah`, `neighborhood_context.tah` | Summarize market movement into talking points. |
| 22 | Inventory Pressure Gauge | market | `market_velocity.tah`, `comps_context.tah` | Explain supply, demand, speed, and negotiation posture. |
| 23 | Pricing Risk Ladder | market | `comps_context.tah`, `market_rules.tah` | Compare aligned, stretch, and risky pricing choices. |
| 24 | Buyer Market Weather | market | `market_velocity.tah`, `neighborhood_context.tah` | Explain buyer conditions as headwinds and tailwinds. |
| 25 | Seller Market Weather | market | `market_velocity.tah`, `comps_context.tah` | Explain seller-side demand and pricing friction. |
| 26 | Neighborhood Field Guide | place | `neighborhood_context.tah`, `local_business_context.tah`, `market_rules.tah` | Explain area context through buyer-safe local signals. |
| 27 | Local Map Legend | place | `local_business_context.tah`, `neighborhood_context.tah` | Present nearby commerce as grouped map anchors. |
| 28 | Relocation Compass | place | `neighborhood_context.tah`, `texas_place_history.tah` | Orient relocating buyers around practical needs. |
| 29 | Amenity Cluster Board | place | `local_business_context.tah`, `neighborhood_context.tah` | Group amenities by routine usefulness. |
| 30 | Commute Tradeoff Map | place | `neighborhood_context.tah` | Explain access and commute questions without promises. |
| 31 | Weekend Routine Reel | place | `local_business_context.tah`, `agent_brand.tah` | Turn local anchors into a short lifestyle reel outline. |
| 32 | Small Business Spotlight | place | `local_business_context.tah` | Use local businesses as cautious community context. |
| 33 | Dallas Community Pulse | place | `dallas_community_intel.tah`, `neighborhood_context.tah` | Relay Dallas-area community context. |
| 34 | Dallas Safety Framing | safety | `dallas_safety_intel.tah`, `market_rules.tah` | Handle safety questions using official-source framing. |
| 35 | Fair Housing Redline | safety | `market_rules.tah`, `texas_real_estate.tah` | Replace risky language with neutral alternatives. |
| 36 | Supervisor Redline | safety | `market_rules.tah`, `agent_brand.tah` | Review output for support, risk, and brand fit. |
| 37 | Market Rules Check | safety | `market_rules.tah` | Apply command-center safety rules before output leaves draft state. |
| 38 | Medical Caution Card | safety | `medical_encyclopedia.tah`, `market_rules.tah` | Keep medical-adjacent text general and non-diagnostic. |
| 39 | Objection Bridge | agent | `objection_scripts.tah`, `agent_brand.tah`, `lead_history.tah` | Turn client pushback into an advisory response and next question. |
| 40 | Tarrant Deed Trace | deal | `tarrant_deeds.tah`, `texas_real_estate.tah` | Explain deed or county-record clues as a verification trail. |
| 41 | Texas Contract Brief | deal | `texas_contracts_expertise.tah`, `market_rules.tah` | Summarize contract context without legal advice. |
| 42 | Architecture Map | technical | `architecture.tah`, `architecture.hat` | Explain systems as components, flows, and boundaries. |
| 43 | Runtime Matrix | technical | `sunset_wars_runtime_matrix.tah`, `operatingSystem.tah` | Compare runtime lanes and constraints. |
| 44 | Algorithm Walkthrough | technical | `algorithms.tah` | Teach algorithms as steps, state, and complexity. |
| 45 | Compiler Pipeline Show | technical | `compilers.tah` | Explain compiler stages as a conveyor. |
| 46 | C++ Memory Map | technical | `cPlus.tah`, `operatingSystem.tah` | Explain ownership, lifetime, and memory risk. |
| 47 | Python Core Recipe | technical | `python_core.tah` | Explain Python concepts as practical recipes. |
| 48 | Data Design Canvas | technical | `dataDesign.tah`, `postgres_mastery.tah` | Explain entities, relationships, queries, and constraints. |
| 49 | Deep Learning Layers | technical | `deepLearning.tah` | Explain neural concepts as layers and signals. |
| 50 | Category Theory Morphism | learning | `categoryTheory.tah` | Teach abstract ideas through objects and arrows. |
| 51 | SICP Environment Frame | learning | `sicp.tah`, `sicp_expert.tah` | Explain evaluation through frames and bindings. |
| 52 | Little Schemer Dialogue | learning | `theLittleSchemer.tah` | Teach recursion through small question-answer turns. |
| 53 | Unix Pipeline Art | technical | `unixArt.tah`, `operatingSystem.tah` | Explain command workflows as composable pipes. |
| 54 | Operating System Scheduler | technical | `operatingSystem.tah`, `operatingSystem_concept.tah` | Explain scheduling and resource tradeoffs. |
| 55 | Recursive Link Walk | technical | `operatingSystem_recursive.tah`, `operatingSystem_links.tah` | Explain linked concepts as recursive traversal. |
| 56 | Rasterizer Stage Show | technical | `re_rasterizer.tah`, `re_rasterizer.hat` | Explain graphics pipelines and raster stages. |
| 57 | Security Threat Board | technical | `security_architect.tah`, `market_rules.tah` | Present asset, threat, control, and residual risk. |
| 58 | Postgres Query Plan | technical | `postgres_mastery.tah`, `dataDesign.tah` | Explain query plans and performance bottlenecks. |
| 59 | Spatial Computing Scene | technical | `spatial_computing.tah` | Explain spatial interaction as user, object, space, feedback. |
| 60 | Sunset Pulse Command Map | system | `sunset_pulse.tah`, `sunset_pulse_expertise.tah` | Explain Pulse commands as route, worker, context, result. |
| 61 | Sunset Wars Runtime Brief | system | `sunset_wars.tah`, `sunset_wars_runtime_matrix.tah` | Explain Sunset Wars runtime decisions. |
| 62 | Pulse Master Index Card | system | `pulse_master_v3_6.tah`, `pulse_master_v3_6.hat` | Summarize master archive source families. |
| 63 | User Memory Lens | system | `user_memories.tah`, `user_memories.unified.tah` | Personalize safely without exposing private memory. |
| 64 | Yield Intel Card | market | `yield_intel.tah`, `texas_real_estate.tah` | Explain yield context with financial caveats. |
| 65 | Web Foundation Source Card | technical | `web_foundations.tah`, `wiki_real_estate.tah` | Relay web-derived facts with source caution. |
| 66 | Wiki Real Estate Explainer | learning | `wiki_real_estate.tah`, `texas_real_estate.tah` | Explain general real-estate concepts plainly. |
| 67 | Dallas Wiki Crosscheck | place | `wiki_dallas.tah`, `dallas_community_intel.tah` | Compare broad Dallas context against local intelligence. |
| 68 | TAH Source Card | system | any `.tah` file | Default explanation pattern for retrieved TAH context. |

## Selection Rules

1. The router retrieves and ranks TAH shards first.
2. The relay planner prefers the worker's default template when its source anchors are present.
3. If another template directly matches the retrieved source files, the planner can choose it.
4. If nothing matches, it falls back to `TAH Source Card`.
5. The chosen delivery mode changes the performance format without changing retrieval.
6. The final screen is always appended as the provenance and learning recap.

## Example

A neighborhood command can retrieve `local_business_context.tah` and choose `Neighborhood Field Guide`.

- In `briefing` mode, it becomes a compact action card.
- In `slideshow` mode, each section becomes a slide.
- In `puppetshow` mode, each section becomes a scene.
- In `field-board` mode, each section becomes a map or board zone.
- In `script` mode, each section becomes an agent talk-track line.

The final screen then becomes:

- Final slide for `slideshow`
- Final scene for `puppetshow`
- Final board zone for `field-board`
- Final script beat for `script`
- Final briefing footer for `briefing`
