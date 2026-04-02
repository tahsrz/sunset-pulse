 New Feature: Valuation Model (View Counts, Chat Minutes, Tour Requests)

 1. Jamie AI Intelligence Agent
   * Re-engagement Protocol: A new high-stakes re-engagement system (JAMIE_RE_ENGAGEMENT_PROTOCOL) has been implemented
     in lib/ai/prompts.ts and lib/ai/jamie.ts. It uses OpenRouter (llama-3.3-70b-instruct) to generate
     hyper-personalized reactivation hooks for dormant leads based on "Intelligence Grid" telemetry.
   * Spatial Intelligence: Integration of "Jamie's Dreams" in the map view, providing AI-driven insights into specific
     coordinates.
   * Security Shield: Added a Guardian Shield interceptor in JamieChat.tsx to validate queries through a dedicated
     security API before processing.

  2. Lead Management & Scoring V6.0
   * Dynamic Scoring: Moved scoring logic to utils/leadIntelligence.js, incorporating view counts, chat minutes, tour
     requests, and budget/timeframe bonuses.
   * Probability Decay: Implemented a 5% daily decay factor for inactivity, encouraging timely follow-ups.
   * Engagement Velocity: Added a new metric to track how quickly a lead is moving through the funnel.
   * Enhanced Lead Model: Updated models/Lead.js with fields for budget, timeframe, leadCategory (Residential vs. RV),
     and engagementVelocity.

  3. Command Post & Explorer Upgrades
   * Command Post: Redesigned with a tactical "Strategic Overview." It now features category filters (RES vs. RV), a
     "Top Priority Intercept" section, and real-time "Deployment" tracking for active bookings.
   * Advanced Explorer Map:
       * Added 3D Terrain and Mapbox Directions integration.
       * Implemented Thermal Recon (Heatmaps) for property trends and clustering for high-density areas.
       * Lifestyle Pulse: New neighborhood intelligence scoring for selected areas.
   * Jamie Chat UI: Refactored into a modular system (Telariel, Makiel, Suriel, Zakariel) with a minimized mode and
     theme preview management.

  4. Infrastructure & Data
   * New Models: Added Booking.js and Valuation.js to handle asset reservations and MLS/ML-driven property valuations.
   * Query Builder: Centralized complex MongoDB searches in utils/propertyQueryBuilder.js, supporting geospatial
     polygon/radius searches and specialized RV filters.
   * API Standardization: Shifted to a unified response pattern using utils/apiResponse.js.
 Sunset Pulse is a sophisticated, high-performance real estate platform built on a modern Next.js 14 (App Router)
  architecture. It is designed to bridge the gap between static property listings and an interactive, data-driven user
  experience.

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
