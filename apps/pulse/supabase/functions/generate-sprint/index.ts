import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Groq } from "https://esm.sh/groq-sdk"

const groq = new Groq({ apiKey: Deno.env.get("GROQ_API_KEY") })

serve(async (req) => {
  try {
    const { goal, duration_hours, metadata } = await req.json()
    const apiKey = Deno.env.get("GROQ_API_KEY")
    
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "GROQ_API_KEY not set in Supabase Secrets" }), { status: 500 })
    }

    const groq = new Groq({ apiKey })

    // Tactical Jamie Prompt
    const prompt = `
      You are JAMIE, Strategic Intelligence Operative.
      MISSION: Generate a structured Sprint JSON roadmap for the business goal: "${goal}" (Duration: ${duration_hours}h).
      
      OUTPUT ONLY A VALID JSON OBJECT matching this schema:
      {
        "sprint_name": "Sprint Name",
        "business_goal": "${goal}",
        "total_duration_hours": ${duration_hours},
        "tasks": [
          {
            "task_id": "short-id",
            "title": "Task Title",
            "description": "Tactical description...",
            "duration_minutes": Number,
            "api_endpoint": "e.g., /api/intelligence/leads/analyze",
            "priority": "Low|Medium|High|Critical",
            "status": "Pending"
          }
        ]
      }
    `;

    // Call Groq ( or other llms)
    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.3-70b-versatile",
      temperature: 0.2,
      response_format: { type: "json_object" },
    });

    const content = chatCompletion.choices[0].message.content;
    
    return new Response(
      content,
      { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } },
    )
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
})
