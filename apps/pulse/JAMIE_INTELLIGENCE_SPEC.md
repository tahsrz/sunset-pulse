# 🧠 Jamie Intelligence: Technical Specification

This document details the cognitive architecture, multi-agent orchestration, and integration protocols for **Jamie**, the primary AI persona of Sunset Pulse.

---

## 1. The Persona: "Tactical Friendliness"
Jamie is designed as a high-speed real estate researcher with a specific behavioral profile:
- **Archetype**: 80% Sora (High-fidelity visuals) + 20% Jamie (Joe Rogan's "Pull that up" assistant).
- **Communication**: Strict **2-sentence maximum** for standard responses.
- **Compliance**: Built-in **FHA Gatekeeper** protocols to prevent steering or biased data analysis.
- **Quirk**: An unexplained affinity for potatoes used as metaphors for market stability ("Solid ground").

---

## 2. The Council of Judges (The Abidan System)
When a "Deep Analysis" is triggered (e.g., "Jamie, pull up the numbers"), the system activates the **Council of Judges**. This is a parallelized multi-agent workflow that aggregates insights from specialized "Abidan" agents.

| Agent | Focus Area | Responsibility |
| :--- | :--- | :--- |
| **Market Scout** | Local Trends | Appreciation rates, neighborhood activity, comps. |
| **Asset Analyst** | Financials | Yield projections, rent estimates, physical specs. |
| **Makiel** | Future Outlook | 5-10 year growth predictions and infrastructure. |
| **Gadrael** | Stability | Risk management, zoning, and FHA compliance. |
| **Durandiel** | Spatial | Infrastructure mapping, utility access, transit. |
| **Telariel** | Community | Network signals, historical listings, social vibe. |
| **Rezael** | Navigation | Buyer strategy and market timing. |
| **Zakariel** | Coordination | Closing efficiency and timeline planning. |
| **Suriel (Phoenix)** | Aggregation | Consolidates all raw intel into a cohesive summary. |
| **Ozriel (Reaper)** | Evaluation | Final balanced view and "Potential Score" generation. |

### Orchestration Logic
1. **Trigger**: Keywords like "analysis", "numbers", or "insights".
2. **Selection**: Randomly selects between 1 and 4 judges (customizable via `minJudges`/`maxJudges` in Site Config).
3. **Parallel Execution**: Agents run concurrently via OpenRouter (typically Llama-3.1-405b).
4. **Synthesis**: Suriel aggregates, Ozriel evaluates, and Jamie delivers the final briefing.

---

## 3. Data Persistence & Memory
Jamie maintains context across sessions using a hybrid storage model:

### A. Supabase (Long-Term)
- **Leads Table**: Stores user preferences, budget, and property interest.
- **Re-engagement Hook**: Stores the JSONB A-Z engagement grid for future messaging.
- **Site Config**: Globally manages Jamie's system prompt and model matrix.

### B. Local JSON (Transient/Interaction)
- `utils/jamie/last_interaction.json`: Tracks idle time to trigger "dreams" or re-engagement.
- `utils/jamie/memory/daily_briefing.json`: Stores the current market state for quick recall.
- `utils/jamie/memory/daily_joke.json`: A touch of levity for session recaps.

---

## 4. Messaging Integration (The Bridge)

### Telegram (Remote Command)
Jamie can be reached via Telegram for "operator-level" control.
- **Flow**: User -> Telegram Bot -> Next.js Webhook -> Jamie Core -> Response.
- **Visuals**: Bot can auto-reply with Jamie's visual "Pulse" videos (generated via the Rotoscope pipeline).

### Twilio (Lead Acquisition)
Used for automated, high-probability lead alerts.
- **Engagement Grid**: Uses the `JAMIE_RE_ENGAGEMENT_PROTOCOL` to generate 26 unique follow-up styles (A-Z) tailored to the lead's specific property interest.

---

## 5. Jamie Tab & MLS Anchor

Jamie appears on-site as a persistent docked tab rather than a redirecting navigation agent.

### Tab Behavior
- Closed state: Jamie is a slim viewport-edge tab.
- Open state: Jamie expands into a docked side panel.
- Left-hand mode moves both the tab and the panel to the left edge.
- Jamie should answer in-place and must not automatically push users to `/idx`.

### MLS Anchor
- The open Jamie tab includes an explicit `MLS` control.
- Clicking `MLS` toggles an embedded NTREIS Matrix IDX iframe inside Jamie.
- Opening the MLS drawer does not change the user's current page.
- The embedded MLS iframe is available only to authenticated users.
- If no user is logged in, Jamie shows a login prompt instead of rendering MLS content.
- The standalone `/idx` route is also protected and redirects anonymous users to `/login?redirect=/idx`.

The operating principle is: Jamie may keep MLS close at hand, but MLS visibility is user-requested and auth-gated.

---

## 6. Visual Synchronicity: TacticalCloth
Jamie's physical manifestation on the site is the `<TacticalCloth />` component.
- **Reactive Physics**: Verlet integration reacts to user interaction.
- **State Linkage**: Jamie's "mood" (moodColor) and activity status (status="BROADCASTING") are synchronized with the LLM's response stream.
- **Conditioning**: Grayscale scanlines and tactical green overlays maintain the "Intelligence Briefing" aesthetic.

---

**End of Specification.**
*Reference `lib/ai/jamie.ts` for implementation details.*
