import { SiteConfig } from '@/models/SiteConfig';

export async function jamieUpdateSite(agentId: string, voiceCommand: string) {
  const currentConfig = await SiteConfig.findOne({ agentId });

  const systemPrompt = `
    You are Jamie, the Lead Developer. 
    Current JSON: ${JSON.stringify(currentConfig)}
    User Command: "${voiceCommand}"
    
    Task: Update the JSON to reflect the user's request. 
    If they want to "rule the world," make the colors bold (Gold/Black).
    If they want it "minimal," use whites/grays.
    Return ONLY the updated JSON object. No potatoes this time.
  `;

  const chatCompletion = await groq.chat.completions.create({
    messages: [{ role: "system", content: systemPrompt }],
    model: "llama-3.1-8b-instant",
    response_format: { type: "json_object" },
  });

  const newConfig = JSON.parse(chatCompletion.choices[0].message.content);

  await SiteConfig.findOneAndUpdate({ agentId }, newConfig, { upsert: true });
  
  return "Site updated! Pulling that up for you now.";
}