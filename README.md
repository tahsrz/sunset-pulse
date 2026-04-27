# SUNSET PULSE // MISSION READ ME
**LAST UPDATED:** 2026-04-23  
**STATUS:** JAMIE INTELLIGENCE EXPANSION (SUPABASE STABLE)

Sunset Pulse is a sophisticated, high-performance real estate platform built on a modern Next.js 14 (App Router) architecture. It is designed to bridge the gap between static property listings and an interactive, data-driven user experience.

### ⚡ Recent Neural Upgrades (v2.5)
- **Supabase Long-Term Memory**: Jamie's research is now fully persistent. Migrated the `daily_briefings` and `scythe_registry` to Supabase Postgres to enable historical intelligence tracking.  
- **Live Neural Notifications**: A global R3F ripple overlay now triggers across the site whenever Jamie consolidates a 5-hour research sprint, powered by Supabase Realtime.  
- **Ghost Recon 3D Overlays**: Real-world North Texas news anomalies are now projected as "Intel Spires" and "Corridor Highlights" directly within the 3D Property Viewer.  
- **Ozriel's Scythe Purifier**: A standalone linguistic tool at `/scythe` that uses the Scythe Registry to excise robotic patterns from your communications.  

---

### I. The Abidan Court (The Intelligence Layer)
The platform is governed by the Abidan Protocol, a multi-agent system where specialized "Judges" perform due diligence on every asset.

- **I. Makiel (The Hound)**: Predicts 5–10 year market appreciation hubs before they manifest in the public grid.  
- **II. Gadrael (The Titan)**: Identifies legal vulnerabilities and zoning risks, providing a "Defense Rating."  
- **III. Durandiel (The Ghost)**: Performs non-invasive "ghost recon" on neighborhood vibes and spatial density.  
- **IV. Telariel (The Spider)**: Crawls the web for off-market sentiment and the web of influence surrounding an asset.  
- **V. Razael (The Wolf)**: Generates aggressive negotiation strategies and acquisition plans.  
- **VI. Zakariel (The Fox)**: Maps the fastest "Path to Closing," coordinating lenders and inspectors.  

---

### II. The Aggregators (Jamie AI)
Once the Judges finish their recon, data is synthesized by two primary entities:

- **IX. Suriel (The Phoenix)**: Performs "Predictive Restoration," healing gaps in the data to create a cohesive intelligence core.  
- **X. Ozriel (The Reaper)**: The Final Arbiter. He "scythes" any data point lacking absolute truth and issues the final **CULL** or **KEEP** verdict.

---

### III. The War Room (D3.js Visualization)
The Intelligence Dashboard (`/abidan/war-room`) provides institutional-grade visualizations for every property:
1. **Fate Trajectory**: D3 Line Chart comparing predicted vs. actual market velocity.  
2. **Risk Shield**: D3 Radar Chart mapping 6 critical defense vectors.  
3. **Spider Net**: D3 Force-Directed Graph connecting tax records, news, and social sentiment.  
4. **Ghost Recon**: Qualitative spatial analysis using "Ghost Glow" SVG filters.  

---

### IV. Technical Infrastructure
- **Framework**: Next.js 14 (App Router) with TypeScript.  
- **Hybrid Data Strategy**: Primary property data resides in MongoDB, while Intelligence (Briefings, Scythe Registry, Auth) has migrated to **Supabase (PostgreSQL)**.  
- **Visualization Engine**: A custom-built, CPU-efficient 3D renderer using Backface Culling and Depth Sorting (Painter's Algorithm) for immersive property tours.  
- **Automation**: An idle-trigger system ("autoDream") initiates a 5-hour research sprint after 15 minutes of inactivity, ensuring the system researches while you sleep.

--- 
 
 1. Local "Brain" (SAM 2): The segmentation isn't happening on a metered cloud API (like Runway or Adobe). It's
      running on hardware via the local Python segmenter(sam2.1_hiera_tiny.pt). 
   2. FFmpeg.wasm Safety Net: The Studio.tsx uses browser-side FFmpeg. This means the expensive work of rendering the
      stylized video happens in your browser's memory, not on a paid server. 
   3. Confidence Gating: I've integrated a confidence check into the response. The system reported a 0.943 (94.3%)
      confidence for the Jamie video. If the subject was blurry, that score would drop, and the
      system is designed to return a mock fallback rather than trying to force a broken (and potentially expensive)
      render.
   4. The "Pre-Flight" Check: The JAMIE_VISUALS_WORKFLOW.md I wrote ensures you extract the first frame
      (jamie_first_frame.jpg) and verify it before you ever trigger a full project render.

  The Fail-Safes Added:
   * Mode Awareness: The segmenter returns mode: "live" or mode: "mock". If the model weights aren't loaded correctly,
     it defaults to a free "mock" box rather than crashing the pipeline.
   * Static Previews: We use ffmpeg locally to verify the video format (h264, 1920x1080) before the AI even touches it.

  Bottom line: We are using Meta's open-source SAM 2 on your machine. 
 We can iterate on Jamie's soul as much as we want without hitting a credit limit. 


**Property of the Sunset Collective // System: Abidan Core**  
"The Way remains. The Court observes."
