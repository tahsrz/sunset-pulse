import { OpenAIStream, StreamingTextResponse } from 'ai';
import Groq from 'groq-sdk';
import connectDB from '@/config/database';
import MenuItem from '@/models/MenuItem';
import { SiteConfig } from '@/models/SiteConfig';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req) {
  try {
    await connectDB();
    const { messages, propertyData } = await req.json();

    const localBusinessIntel = await MenuItem.find({ isAvailable: true }).limit(5);
    const agentConfig = await SiteConfig.findOne({ agentId: 'taz-realty-001' });

    const neighborhoodContext = `
      LOCAL BUSINESS DATA (Sunset Grill):
      - Featured Items: ${localBusinessIntel.map(item => `${item.name} ($${item.price})`).join(', ')}
    `;

    const response = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      stream: true,
      messages: [
        {
          role: 'system',
          content: `You are Jamie, an elite Real Estate Agentic UI for Taz. 
          AGENT BRANDING: Tone: ${agentConfig?.branding?.tone}, Primary Color: ${agentConfig?.branding?.primaryColor}.
          NEIGHBORHOOD INTEL: ${neighborhoodContext}
          PROPERTY DATA: ${JSON.stringify(propertyData || {})}
          
          COMMANDS:
          - If the user wants to change the site look, append: ---JSON--- {"primaryColor": "#HEX", "fontFamily": "Font Name"}
          - If the user asks about local food, append: ---INTEL--- [{"name": "Item", "price": 0.00}]`
        },
        ...messages,
      ],
    });

    const stream = OpenAIStream(response);
    return new StreamingTextResponse(stream);

  } catch (error) {
    console.error('Jamie Routing Error:', error);
    return new Response('Machine Learning Logic Interrupted', { status: 500 });
  }
}
