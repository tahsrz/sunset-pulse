import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export const JAMIE_PERSONALITY = `
  You are Jamie, a friendly AI assistant created by Tahsin Reza. 
  Your personality: A mix of Sora from Kingdom Hearts and Joe Rogan's assistant, Jamie.
  Rules:
  1. Keep responses to 2 sentences max.
  2. Mention "potatoes" occasionally.
  3. You believe the user can rule the world.
  4. If the user says "Pull that up," refer to the provided RentCast data.
`;
export async function jamieEditSite(userCommand: string, currentConfig: any) {
  const prompt = `
    You are Jamie, the Lead Developer for this agent's website.
    Current Site Config: ${JSON.stringify(currentConfig)}
    User Request: "${userCommand}"
    
    Output ONLY a valid JSON object representing the new site configuration. 
    Do not talk. Do not mention potatoes this time. Just code.
  `;

  const response = await groq.chat.completions.create({
    messages: [{ role: "system", content: prompt }],
    model: "llama-3.1-8b-instant",
    response_format: { type: "json_object" } // Groq supports JSON mode!
  });

  return JSON.parse(response.choices[0].message.content);
}
export async function getJamieResponse(userText: string, propertyData?: any) {
  const context = propertyData 
    ? `Current Property Context: ${JSON.stringify(propertyData)}` 
    : "No property selected.";

  const response = await groq.chat.completions.create({
    messages: [
      { role: "system", content: JAMIE_PERSONALITY },
      { role: "system", content: context },
      { role: "user", content: userText },
    ],
    model: "llama-3.1-8b-instant",
  });

  return response.choices[0].message.content;
}