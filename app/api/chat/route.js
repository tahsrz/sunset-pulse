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

    // 1. Fetch Local Context
    const localBusinessIntel = await MenuItem.find({ isAvailable: true }).limit(5);
    const agentConfig = await SiteConfig.findOne({ agentId: 'taz-realty-001' });

    const neighborhoodContext = `
      LOCAL BUSINESS DATA (Sunset Grill):
      - Featured Items: ${localBusinessIntel.map(item => `${item.name} ($${item.price})`).join(', ')}
    `;

    const devModeContext = isDevMode 
      ? 'DEVELOPER MODE ACTIVE: You have permission to change site colors and fonts. If asked to "change the color" or "update the look", respond with the appropriate ---JSON--- command.'
      : 'Developer mode is inactive. You cannot change site styling.';

    // 2. Machine Learning Logic
    const response = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      stream: true,
      messages: [
        {
          role: 'system',
          content: `You are Jamie, an elite Real Estate Operative.
          ${devModeContext}
          AGENT BRANDING: Primary Color: ${agentConfig?.branding?.primaryColor}.
          NEIGHBORHOOD INTEL: ${neighborhoodContext}
          PROPERTY DATA: ${JSON.stringify(propertyData || {})}
          
          COMMANDS:
          - To change the look (Only if Dev Mode Active): ---JSON--- {"primaryColor": "#HEX", "fontFamily": "Font Name"}
          - To show local food: ---INTEL--- [{"name": "Item", "price": 0.00}]`
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
