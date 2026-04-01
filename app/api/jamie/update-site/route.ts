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

    // 1. Fetch Context (The Grill Moat)
    const localBusinessIntel = await MenuItem.find({ isAvailable: true }).limit(5);
    const agentConfig = await SiteConfig.findOne({ agentId: 'taz-realty-001' });

    const neighborhoodContext = `
      LOCAL BUSINESS DATA (Sunset Grill):
      - Featured Items: ${localBusinessIntel.map(item => `${item.name} ($${item.price})`).join(', ')}
      - Business Strategy: Local high-traffic hub.
    `;

    // (Groq)
    const response = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      stream: true, // Crucial for useChat
      messages: [
        {
          role: "system",
          content: `You are Jamie, a professional Property Information Assistant for Taz Realty. 
          AGENT BRANDING: Tone: ${agentConfig?.branding?.tone}, Primary Color: ${agentConfig?.branding?.primaryColor}.
          NEIGHBORHOOD INTEL: ${neighborhoodContext}
          PROPERTY DATA: ${JSON.stringify(propertyData || {})}

          HIGH-POWER PROCESSING PROTOCOL (Always append relevant tags at the end of your response):
          1. [[THEME:{"primaryColor": "#HEX", "fontFamily": "Font", "mode": "dark|light"}]] - Use for visual site adjustments.
          2. [[INTEL:[{"name": "Item", "price": 0.00, "category": "food|service"}]]] - Use for neighborhood/local data.
          3. [[LAYOUT:{"showMap": true, "showStats": false, "viewType": "grid|list"}]] - Use to toggle UI components.
          4. [[ANALYTICS:{"leadScore": 0-100, "intent": "buying|browsing", "followUp": "urgent|low"}]] - Use to tag lead quality.

          You can append multiple tags in a single response for maximum processing power. Example: [[THEME: {...}]] [[INTEL: [...]]].

          Be professional, helpful, and focused on providing accurate property and neighborhood information.`
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
    return new Response("Assistant Logic Interrupted", { status: 500 });
  }
}