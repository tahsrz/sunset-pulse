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
