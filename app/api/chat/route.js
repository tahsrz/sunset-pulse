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
         Respond with ---JSON--- followed by a modular update object.
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
