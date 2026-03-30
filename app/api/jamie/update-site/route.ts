import { OpenAIStream, StreamingTextResponse } from 'ai';
import Groq from "groq-sdk";
import connectDB from "@/config/database";
import { MenuItem } from "@/models/MenuItem";
import { SiteConfig } from "@/models/SiteConfig";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: Request) {
  try {
    await connectDB();
    const { messages, propertyData } = await req.json();
    const lastMessage = messages[messages.length - 1].content;

    // 1. Fetch Hyper-Local Context (The "Grill" Moat)
    const localBusinessIntel = await MenuItem.find({ isAvailable: true }).limit(5);
    const agentConfig = await SiteConfig.findOne({ agentId: 'taz-realty-001' });

    const neighborhoodContext = `
      LOCAL BUSINESS DATA (Sunset Grill):
      - Featured Items: ${localBusinessIntel.map(item => `${item.name} ($${item.price})`).join(', ')}
      - Business Strategy: Local high-traffic hub.
    `;

    // 2. Trigger the Machine Learning Reasoning (Groq)
    const response = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      stream: true, // Crucial for useChat to work word-by-word
      messages: [
        {
          role: "system",
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

    // 3. Convert the Groq response into a stream for the Vercel AI SDK
    const stream = OpenAIStream(response);

    // 4. Return the stream so JamieChat can update the UI in real-time
    return new StreamingTextResponse(stream);

  } catch (error) {
    console.error("Jamie Routing Error:", error);
    return new Response("Machine Learning Logic Interrupted", { status: 500 });
  }
}