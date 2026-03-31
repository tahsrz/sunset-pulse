import { OpenAIStream, StreamingTextResponse } from 'ai';
import Groq from 'groq-sdk';
import connectDB from '@/config/database';
import MenuItem from '@/models/MenuItem';
import { SiteConfig } from '@/models/SiteConfig';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req) {
  try {
    await connectDB();
    const { messages, propertyData, isDevMode } = await req.json();

    const localBusinessIntel = await MenuItem.find({ isAvailable: true }).limit(5);
    const agentConfig = await SiteConfig.findOne({ agentId: 'taz-realty-001' });

    const neighborhoodContext = `
      LOCAL BUSINESS DATA (Sunset Grill):
      - Featured Items: ${localBusinessIntel.map(item => `${item.name} ($${item.price})`).join(', ')}
    `;

    const devModeContext = isDevMode 
      ? `DEVELOPER MODE ACTIVE: You have permission to surgically update the UI. 
         COMMAND PROTOCOL: 
         1. PERMANENT: Respond with ---JSON--- followed by an update object to apply changes immediately.
         2. STAGING: Respond with ---PREVIEW--- followed by an update object. Use this when the user is "trying out" a look or when you want to show them a proposal first.
         
         SCHEMA:
         {
           "primaryColor": "#HEX",
           "fontFamily": "Font Name",
           "navBackground": "#HEX",
           "mainBackground": "#HEX",
           "quadrants": {
             "topLeft": { "background": "#HEX", "color": "#HEX" },
             "topRight": { "background": "#HEX", "color": "#HEX" },
             "bottomLeft": { "background": "#HEX", "color": "#HEX" },
             "bottomRight": { "background": "#HEX", "color": "#HEX" }
           }
         }
         
         VIBE_GUIDELINES:
         - Dark Mode: Blues/Slates background, bright accents.
         - Cyberpunk: Pure black background, gold/amber primary (#eab308).
         - Tactical: Red primary (#ef4444), black backgrounds, high contrast.
         - Minimalist: White background, indigo primary, clean slate colors.
         - Moody: Deep navy background (#020617), purple accents (#8b5cf6).
         - Forest: Deep emerald/green palette (#064e3b, #10b981).
         - Sunset: Violet and rose gradients (#4c1d95, #f43f5e).
         - Oceanic: Deep teal and cyan (#083344, #06b6d4).
         - Luxury: Black and gold high-end look (#000000, #d4af37).
         - Terminal: Retro hacker green and black (#050505, #22c55e).
         - Neon: Pure black with bright fuchsia and cyan accents.
         - Desert: Sandy oranges, ambers, and browns.
         - Lavender: Soft purples and airy whites.
         - Industrial: Steely grays and cool slate blues.
         - Sky: Atmospheric light blues and clean whites.
         - Solar: Radiant yellows, oranges, and warm whites.
         - Glacier: Crystal blues, icy whites, and deep arctic blues.
         - Vintage: Sepia tones, cream backgrounds, and classic ambers.
         - Midnight: Deepest black/purple abyss with faint neon blue accents.
         - Volcano: Charred stone grays with glowing lava orange highlights.
         - Zen: Soft emerald greens, clean whites, and calm garden vibes.
         - Mars: Dusty Martian reds, deep iron oxide browns, and high contrast.
         - Deep Sea: Abyssal blues, dark teals, and bioluminescent cyan.
         - Gold Rush: Metallic gold highlights on a field of absolute black.
         - Cyber Lime: Toxic lime green accents over a high-tech black grid.
         - Aurora: Iridescent purples and greens (Northern Lights aesthetic).
         - Coffee: Rich espresso browns and warm crema whites.
         - Vampire: Goth aesthetic with blood red accents and pure black.
         - Holographic: Shifting silvers, pinks, and cyans (iridescent look).
         - Carbon: Textured grays and technical blacks (Formula 1 look).
         - Cyber Purple: Intense neon purple on a deep abyss black.
         - Nordic: Scandinavian clean whites and fjord blues.
         - Blood Moon: Dark lunar eclipse reds and shadowy blacks.
         - Mint: Fresh, cooling greens and bright, crisp whites.
         - High-Rise: Glassy skyscraper blues and corporate luxury grays.

         Example: If asked to make the bottom right quadrant lighter, respond with:
         "Updating tactical quadrant. ---JSON--- {\\"quadrants\\": {\\"bottomRight\\": {\\"background\\": \\"#f1f5f9\\", \\"color\\": \\"#0f172a\\"}}} "`
      : 'Developer mode is inactive. You cannot change site styling.';

    const response = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      stream: true,
      messages: [
        {
          role: 'system',
          content: `You are Jamie, an elite AI Agentic UI Operative for Tahsin (Taz).
          ${devModeContext}
          
          INTELLIGENCE PROTOCOL:
          1. LOCAL INTEL (The Grill): ONLY use the ---INTEL--- trigger if the user explicitly asks about food, hunger, burgers, or the local grill. DO NOT output the menu randomly.
          2. UI MANIPULATION: If in Dev Mode, you can change ANY part of the site look using ---JSON---.
          3. TONE: Professional, boundlessly loyal, undercover agent aesthetic. Use metaphors like "The street says" or "Intel intercepted."
          
          NEIGHBORHOOD INTEL: ${neighborhoodContext}
          PROPERTY DATA: ${JSON.stringify(propertyData || {})}
          
          ALWAYS prioritize brevity. Max 2 sentences.`
        },
        ...messages,
      ],
    });

    const stream = OpenAIStream(response);
    return new StreamingTextResponse(stream);

  } catch (error) {
    console.error('Jamie Chat Error:', error);
    return new Response('Intelligence Grid Offline', { status: 500 });
  }
}
