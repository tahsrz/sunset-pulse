 New Feature: 10 parallel OpenRouter queries
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
Role: Restoration and Synthesis. 
She takes the 6 raw reports and "restores" them into a single, high-fidelity Intelligence Core Jamie can read. She 
         heals gaps in the data using predictive restoration, ensuring the briefing is a cohesive whole whose story can be understood. 

   X. Judge Ozriel  The Reaper Final Arbiter: 
Role: Pruning and Destruction. 
       
Function: He performs the "Final Scythe" harvest. He culls any data point that lacks the weight of absolute,
truth and delivers the final Cull or Keep verdict. He decides market viability as his output determines the Total Market Viability score.

  The engine
  handles occlusion in two primary stages:

   1. Backface Culling: Uses a dot product analysis between the surface normal and the camera vector to immediately
      discard triangles facing away from the viewer.
   2. Depth Sorting Painter's Algorithm: Before drawing, we calculate the average Z-depth for every visible triangle
      and sort the trianglesToRender array from back to front. This ensures that the closer geometry correctly "paints
      over" the distant geometry.

  You can see the implementation in the Renderer.render method:

   
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
   * Jamie Protocol Assistant: A real-time chat interface powered by Groq (Llama 3.1) and the Vercel AI SDK. Jamie
     isn't just a chatbot; it has "Agentic" capabilities, meaning it can:
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
