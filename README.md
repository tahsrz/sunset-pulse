What It Does
Jamie is an AI assistant that actually knows your neighborhoods. Not generic ChatGPT answers—real context pulled from local business data, market analytics, and your own brand.

One dashboard shows you:

Who to call first (lead scoring, not guesswork)

What properties are moving

Why a neighborhood is valuable (hint: it's not just comps)

The Pitch
IDX charges agents $2,000–$4,000 their first year for a property search page. That's it. No lead scoring. No follow-up. No local intelligence.

Sunset Pulse costs $60/month. Agents bring their own MLS feed. We layer an AI assistant on top that actually helps them close deals.

Same data. Half the price. Way more useful.

How It Works (Tech Stack)
Frontend: Next.js, Tailwind
Backend: Node.js / Next.js API routes
Inference: Groq (Llama 3 / Mixtral)
Vector DB: Supabase with pgvector
Hosting: Vercel
Data sources: RentCast API, agent-provided IDX feeds, local business data

Lead Scoring Logic
We don't guess which leads are hot. We calculate it:

text
Score = (Property Views × 10) + (Chat Minutes × 5) + (Tour Request × 20)
Tour request is a binary flag. If someone asks for a showing, comps, or contact, they jump to the top of your list.

No machine learning fluff. Just behavioral weightings that actually work.

Why This Isn't Another ChatGPT Wrapper
Most real estate AI is a thin layer over OpenAI. If OpenAI changes pricing or terms, those businesses are cooked.

We built a Tri-Vector RAG architecture. Every AI response has to pull from three sources:

Hyper-local commerce — private business data that gives a neighborhood its character

Market analytics — real-time comps and ROI numbers via RentCast

Agent brand DNA — the agent's own bio, past deals, and local expertise

Copy the UI all you want. You can't copy the data synthesis.

Costs (For The Nerds)
At 5 paying users, $60/month each:

Groq inference: ~$0.30

Embeddings: ~$0.01

Hosting (Vercel + Supabase): $45

RentCast (free tier): $0

Monthly cost: ~$47
Monthly revenue: $300
Gross margin: 84%

At 50 users, margin pushes 93%. The only real variable is whether agents bring their own MLS feed or we have to license it.


🌅 Sunset Pulse & Grill
Real Estate Platform | AI-Driven Personalization | Family Business Integration
Sunset Pulse is a dual-purpose Next.js application designed for the modern era of North Texas real estate. It combines a robust property listing engine with a unique, voice-activated AI assistant named Jamie, while also providing a digital storefront for the Sunset Grill family business.

🤖 Meet Jamie: The Lead AI Developer
Unlike traditional platforms, Sunset Pulse features Jamie—a custom-built AI assistant inspired by Kingdom Hearts (Sora) and Joe Rogan’s assistant.

Jamie doesn't just answer questions; he codes the site.

Voice-Activated UI: Agents can tell Jamie to change the theme, swap colors, or update headlines.

RentCast Integration: Jamie "pulls up" real-time rental estimates, confidence scores, and market comparables for any property.

Personality: Encouraging, slightly obsessed with potatoes, and firmly believes the user can rule the world.

🛠 Tech Stack
Frontend: Next.js 14+ (App Router), Tailwind CSS

Database: MongoDB (Mongoose)

AI Engine: Groq SDK (Llama 3.1 8B Instant)

Data APIs: RentCast API for real-time real estate analytics

Authentication: NextAuth.js / Custom Auth Provider

Voice/TTS: Web Speech API (Synthesis & Recognition)

📁 Project Structure
Plaintext
/src
  /app            # Next.js App Router (Listings, Grill, Auth)
  /components     # UI Components (JamieChat.tsx, Navbar, etc.)
  /context        # ThemeProvider, CartContext, AuthContext
  /lib
    /ai           # Jamie's "Brain" (System prompts & Groq logic)
    /data         # API Fetchers (RentCast, MongoDB utils)
  /models         # MongoDB Schemas (SiteConfig, Property, Order)
/mocks            # Local JSON samples for offline testing (RentCast)
🚀 Getting Started
1. Prerequisites
Ensure you have Node.js installed and access to a MongoDB instance.

2. Environment Variables
Create a .env.local file in the root directory:

Bash

MONGODB_URI=your_mongodb_uri
GROQ_API_KEY=your_groq_key
RENTCAST_API_KEY=your_rentcast_key
NEXTAUTH_SECRET=your_secret



3. Installation
Bash
npm install
npm run dev

Current Status
Early pilot. Voice-enabled Jamie is live. RAG pipeline is working. Lead scoring is implemented.

Next up: automated SMS follow-ups via Twilio when a lead hits a score threshold.

Why I Built This
I watched real estate agents pay thousands for software that doesn't help them sell. IDX fees, CRM costs, AI add-ons that nobody actually uses.

I figured there's a better way: less overhead, more closing power.

If you're an agent who wants to test it, or a developer who wants to contribute, open an issue or DM me.

Built with: Next.js, Groq, Supabase, Tailwind


