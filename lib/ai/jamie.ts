import Groq from "groq-sdk";
import { JAMIE_SYSTEM_PROMPT, validateJamieResponse } from "./prompts";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function getJamieResponse(userInput: string, propertyData?: any) {
  // Ensure we have a string version of the property data for the prompt
  const contextString = propertyData 
    ? typeof propertyData === 'string' ? propertyData : JSON.stringify(propertyData)
    : "No property data currently intercepted.";

  try {
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: JAMIE_SYSTEM_PROMPT,
        },
        {
          role: "system",
          content: `CURRENT PROPERTY CONTEXT: ${contextString}`,
        },
        {
          role: "user",
          content: userInput,
        },
      ],
      model: "llama-3.1-8b-instant",
      temperature: 0.7, // Balanced for personality + logic
    });

    const aiReply = completion.choices[0]?.message?.content || "";

    // Optional: Use your validation helper if you want to force brevity 
    // for non-JSON responses.
    if (!aiReply.includes('---JSON---') && !validateJamieResponse(aiReply)) {
      // Logic to trim if Jamie gets too talkative
      return aiReply.split(/[.!?]+/).slice(0, 2).join('.') + '.';
    }

    return aiReply;
  } catch (error) {
    console.error("Groq API Error:", error);
    return "The connection to the street is down. I can't pull that up right now.";
  }
}