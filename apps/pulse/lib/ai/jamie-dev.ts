import { SiteConfig } from '@/models/SiteConfig';
import Groq from 'groq-sdk';

function parseSiteConfigResponse(content: string | null | undefined): Record<string, unknown> {
  if (!content?.trim()) {
    throw new Error('Jamie returned no site configuration.');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error('Jamie returned invalid site configuration JSON.');
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Jamie returned a site configuration with an invalid shape.');
  }

  return parsed as Record<string, unknown>;
}

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

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

  const content = chatCompletion.choices[0]?.message.content;
  const newConfig = parseSiteConfigResponse(content);

  await SiteConfig.findOneAndUpdate({ agentId }, newConfig, { upsert: true });
  
  return "Site updated! Pulling that up for you now.";
}
