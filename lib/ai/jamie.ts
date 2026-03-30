import Groq from "groq-sdk";
import { MenuItem } from "@/models/MenuItem"; 
import { SiteConfig } from "@/models/SiteConfig"; // <--- Ensure this import exists
import connectDB from "@/config/db";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function getJamieResponse(userInput: string, propertyData?: any) {
  await connectDB();

  const agentConfig = await SiteConfig.findOne({ agentId: 'taz-realty-001' });
  const localBusinessIntel = await MenuItem.find({ isAvailable: true }).limit(5);
  
  const neighborhoodContext = `
    LOCAL BUSINESS DATA (Sunset Grill):
    - Featured Items: ${localBusinessIntel.map(item => `${item.name} ($${item.price})`).join(', ')}
    - Business Strategy: High-traffic local hub for the community.
  `;

  const propertyContext = propertyData 
    ? typeof propertyData === 'string' ? propertyData : JSON.stringify(propertyData)
    : "No property data currently intercepted.";

  try {
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `AGENT BRANDING GUIDELINES:
          - Tone: ${agentConfig?.branding?.tone || 'Professional yet local'}
          - Focus Area: ${agentConfig?.focusNeighborhood || 'North Texas'}
          - Primary Color: ${agentConfig?.branding?.primaryColor || '#2563eb'}`
        },
        {
          role: "system",
          content: `You are Jamie, an elite Real Estate & Business Intelligence operative for Tahsin (Taz). 
          Your goal is to cross-reference property data with local business data to prove Tahsin is the king of this market.
          If the user is looking at a house, mention how close it is to the Sunset Grill or suggest a burger for the move-in day.`
        },
        {
          role: "system",
          content: `NEIGHBORHOOD INTEL: ${neighborhoodContext}`
        },
        {
          role: "system",
          content: `PROPERTY INTEL: ${propertyContext}`
        },
        { role: "user", content: userInput },
      ],
      model: "llama-3.1-8b-instant",
    });

    return completion.choices[0]?.message?.content || "";
  } catch (error) {
    console.error("Intelligence Intercept Failed:", error);
    return "The local data grid is down. I can't sync the neighborhood intel right now.";
  }
}