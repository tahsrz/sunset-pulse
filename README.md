 New Feature: Day-Night Cycle and localMemory isMounted Checks. Supaflow Integration and Workflows. Vis. Engine moved to TypeScript. Configuration of LLMs and mini-LLMs in UI. 

TTL Protocol: Implemented a 30-day Time-To-Live (TTL). The API will now check the database first. 
If fresh reconnaissance data exists, it returns the cached "Grid Memory" instantly (sub-10ms response). 


 
 Sunset Pulse is a sophisticated, high-performance real estate platform built on a modern Next.js 14 (App Router)
  architecture. It is designed to bridge the gap between static property listings and an interactive, data-driven user
  experience.

I. Makiel The Seer: Focuses on Fate and Trajectory. He predicts 5–10 year market appreciation and identifies Hubs before they manifest in the public grid. 

II. Gadrael The Shield: Focuses on rigidity. He identifies legal vulnerabilities, zoning issues, and title risks, providing a "Defense Rating" to ensure an investment is unbreakable. 

III. Durandiel The Ghost: Focuses on Spatial Control. He performs "ghost recon," reading neighborhood vibes and hidden property details without disturbing the endpoints. 

IV. Telariel The Spider: Focuses on Connectivity. He crawls the web for off-market mentions, social sentiment, and the web of Influence surrounding a seller or neighborhood. 

V. Rezael The Maker: Focuses on Attack. He generates negotiation strategies and aggressive acquisition plans to secure assets before competitors can react. 

VI. Zakariel The Fox: Focuses on Logistic Velocity. He maps the fastest "Path to Closing," coordinating lenders and inspectors to eliminate friction and ensure rapid market entry. 


VII, VIII 1st Generation Enforcers Daruman and Noyon.

The 2 Primary Aggregators 

Synthesis Layer 

 
  Once the 6 Judges finish their recon, their raw threads of data are passed to the two most powerful entities for 
  final processing before sent down the Memory Bridge into the Way 

XI. Judge Suriel The Phoenix - Aggregator: 

Restoration and Synthesis. 


She takes the 6 raw reports and restores them into a single, high-fidelity Intelligence Core Jamie can read. She 
heals gaps in the data using predictive restoration, ensuring the briefing is a cohesive whole whose story can be understood. 

X. Judge Ozriel  The Reaper Final Arbiter: 


Pruning and Destruction. 
       
He performs the Final Scythe harvest. He culls any data point that lacks the weight of absolute, 
truth and delivers the final Cull or Keep verdict. He decides market viability as his output determines the Total Market Viability score. 
 


 1. The Hound - Fate Trajectory: 
       * Visual: D3 Line Chart with a "Fate Gradient" 
       * Logic: Compares Predicted Fate (8% annual appreciation) vs. "Realized Velocity" (actual market points). 
       * Reactive: Data scales dynamically based on the selected property's monthly rental rate.
   2. The Titan - Risk Shield: 
       * Visual: D3 Radar (Spider) Chart. 
       * Logic: Maps 6 defense vectors (Zoning, Title, Flood, Legal, Market, Structural). 
       * Reactive: "Zoning Rigidity" peaks for Industrial assets; "Flood Shield" drops for properties in the Sunset 
         sector. 
   3. The Spider - Spider Net: 
       * Visual: D3 Force-Directed Graph. 
       * Logic: Connects the "Web of Influence" (Seller, News, Reddit, Zoning, Tax records). 
   4. The Ghost - Ghost Recon: 
       * Visual: D3 Horizontal Bar Chart with "Ghost Glow" SVG filters. 
       * Logic: Measures spatial privacy, acoustic silence, and "Void Density." 
   5. The Wolf - Attack Matrix: 
       * Visual: Tactical Card Grid with leverage bars. 
       * Logic: Generates aggressive acquisition plans (e.g., "Market Blitz") based on target vulnerabilities. 
   6. The Phoenix - Restoration Core: 
       * Visual: Animated D3 Core with rotating arcs. 
       * Logic: Uses d3.timer to track real-time data "healing" and synthesis progress. 
   7. The Fox - Logistic Velocity: 
       * Visual: Linear Stage Timeline. 
       * Logic: Maps the "Path to Closing" with pulsing "In-Progress" states for active sectors. 

       
  In many ways, yes—Ozriel is essentially a Continuous, Adversarial Turing Test. 
  While the original Turing Test relies on a human judge to distinguish machine from man, Ozriel acts as a machine 
  judging its own kind to ensure the user never feels the "Uncanny Valley" of AI conversation. 
  
Why it’s more powerful than a Turing Test: 
    The Turing Test is a one-time benchmark. The Ozriel Protocol is a recursive loop. By having Ozriel "scythe" the 
    robotic patterns during the 5-hour autoDream sprint, Jamie isn't just trying to trick you into thinking he's human; he 
    is actively pruning his own latent space to adopt the specific, grounded voice of a North Texas researcher. 

  It’s less about "Can a machine think?" and more about "Can a machine speak with the soil of North Texas on its boots?"
The engine

handles occlusion in two primary stages: 

   1. Backface Culling: Uses a dot product analysis between the surface normal and the camera vector to immediately
      discard triangles facing away from the viewer.
   2. Depth Sorting Painter's Algorithm: Before drawing, we calculate the average Z-depth for every visible triangle
      and sort the trianglesToRender array from back to front. This ensures that the closer geometry correctly "paints
      over" the distant geometry.

  You can see the implementation in the Renderer.render method: (DEP)

   
    trianglesToRender.sort((a, b) => {
      const az = (a.get(0).z + a.get(1).z + a.get(2).z) / 3;
      const bz = (b.get(0).z + b.get(1).z + b.get(2).z) / 3;
      return bz - az; // Sort by average Z-depth
    });

  This approach, combined with Near Plane Clipping, keeps the CPU overhead low while maintaining aesthetic.

  
   Architectural Core & Tech Stack
   * Framework: Next.js 14 using TypeScript. It leverages Server Actions for secure data mutations and Route Handlers
     for API logic.
   * Hybrid Data Strategy: The project is in a strategic transition. It currently uses MongoDB (Mongoose) for primary
     property data and local business intelligence (The Grill), but is migrating to Supabase (PostgreSQL) for
     enhanced relational integrity and real-time Authentication.
   * Media & Visualization:
       * Cloudinary: Handles all image processing, ensuring high-speed delivery of optimized property photos.
       * Mapbox: Powers the geospatial search, allowing users to find properties via interactive maps.
       * Three.js: Integrated for immersive 3D property visualizations (seen in the Lab experiments).
       * Secret Features: ???

  2. Key Intelligent Modules
   * Jamie Protocol Assistant: A real-time chat interface powered by Groq (Llama 3.1) and the Vercel AI SDK. Agent queries shouldn't be a game of trial and error. While standard search tools rely on rigid parameters, Jamie analyzes the DNA of your request. By determining the exact computational weight needed and scaling its internal architecture accordingly, it eliminates the 'search fatigue' that plagues traditional real estate platforms.
     Jamie has "Agentic" capabilities, meaning it can:
       * Dynamic Theme Injection: Suggest and apply visual themes (Dark Mode, Minimalist, etc.) on the fly.
       * Hyper-Local Intel: Pull real-time data from local businesses (like Sunset Grill) to give buyers neighborhood
         context.
   * Lead Intelligence: A robust lead capture system (LeadCaptureForm) that feeds into a decay-leads script. This script
     automatically scores and manages leads based on time-decay, ensuring agents focus on the highest-probability
     conversions.

  3. Security & Access Control
   * Property Verification Gate: A modular verification layer that ensures users are human before revealing sensitive
     property coordinates or contact details, preventing bot scraping of your IDX data.
   * Secure API Layer: All property and lead mutations are handled via server-side routes with
     environment-variable-backed secrets (Twilio, Cloudinary, Groq, Supabase). 
