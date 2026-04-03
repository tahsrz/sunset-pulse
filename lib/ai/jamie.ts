import Groq from "groq-sdk";
import MenuItem from "@/models/MenuItem";
import { SiteConfig } from "@/models/SiteConfig";
import connectDB from "@/lib/core/database";
import { 
  JAMIE_SYSTEM_PROMPT, 
  JAMIE_RE_ENGAGEMENT_PROTOCOL,
  MARKET_SCOUT_SYSTEM_PROMPT,
  ASSET_ANALYST_SYSTEM_PROMPT,
  MAKIEL_SYSTEM_PROMPT,
  GADRAEL_SYSTEM_PROMPT,
  DURANDIEL_SYSTEM_PROMPT,
  TELARIEL_SYSTEM_PROMPT,
  REZAEL_SYSTEM_PROMPT,
  ZAKARIEL_SYSTEM_PROMPT,
  PHOENIX_SYSTEM_PROMPT,
  REAPER_SYSTEM_PROMPT 
} from "./prompts";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

/**
 * Abidan Judge Worker Functions
 */
async function getAbidanJudgeIntel(workerName: string, systemPrompt: string, propertyData: any) {
  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "meta-llama/llama-3.1-405b-instruct:free",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Execute recon for: ${JSON.stringify(propertyData)}` }
        ],
      })
    });
    const data = await response.json();
    return data.choices[0]?.message?.content || `JUDGE_${workerName}_FAILURE: Intel stream broken.`;
  } catch (error) {
    console.error(`Judge ${workerName} Error:`, error);
    return `JUDGE_${workerName}_ERROR: Signal lost.`;
  }
}

/**
 * Worker: Judge Suriel (Phoenix) Aggregator
 */
async function getSurielRestoration(rawIntel: string) {
  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "meta-llama/llama-3.1-405b-instruct:free",
        messages: [
          { role: "system", content: PHOENIX_SYSTEM_PROMPT },
          { role: "user", content: `Restore and aggregate this raw Judge intel: ${rawIntel}` }
        ],
      })
    });
    const data = await response.json();
    return data.choices[0]?.message?.content || "SURIEL_FAILURE: Restoration failed.";
  } catch (error) {
    console.error("Suriel Error:", error);
    return "SURIEL_ERROR: Phoenix flame flickering.";
  }
}

/**
 * Worker: Judge Ozriel (Reaper) Harvest
 */
async function getOzrielHarvest(restoredIntel: string) {
  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "meta-llama/llama-3.1-405b-instruct:free",
        messages: [
          { role: "system", content: REAPER_SYSTEM_PROMPT },
          { role: "user", content: `Harvest the final truth: ${restoredIntel}` }
        ],
      })
    });
    const data = await response.json();
    return data.choices[0]?.message?.content || "OZRIEL_FAILURE: Harvest skipped.";
  } catch (error) {
    console.error("Ozriel Error:", error);
    return "OZRIEL_ERROR: The Scythe has failed.";
  }
}

import { calculateMaxStay, calculateBudgetGap, synthesizePortfolio } from '../intelligence/budgetLogic';

export async function generateHighStakesHook(leadData: any, property: any) {
  const usps = [
    property.type,
    ...(property.amenities || []),
    property.hookups?.electric !== 'None' ? property.hookups?.electric : null,
    property.hookups?.water ? 'Water Hookup' : null,
    property.hookups?.sewer ? 'Sewer Hookup' : null,
  ].filter(Boolean).join(", ");

  const propertyPrice = property.rates?.monthly || (property.rates?.nightly * 30) || 0;
  
  // High-Performance Budget Intelligence
  const maxStayDays = calculateMaxStay(leadData.budget, property.rates?.nightly, property.rates?.weekly);
  const budgetGap = calculateBudgetGap(leadData.budget, propertyPrice);
  
  // Asset Optimization Logic
  const optimizationNotes = [
    maxStayDays > 0 ? `Max Continuous Stay Velocity: ${maxStayDays} Days.` : null,
    budgetGap > 0 ? `Gap to Next-Tier USPs: $${budgetGap}.` : null,
    leadData.budget > 250000 ? `Lead qualifies for 'Yield Portfolio' synthesis (Knapsack Opt).` : null,
  ].filter(Boolean).join(" ");

  const budgetConstraint = (leadData.budget > 0 && leadData.budget < propertyPrice) 
    ? `ALERT: Lead budget is BELOW property price. Archetypes 'L', 'Y', and 'D' MUST focus on 'Discussing Financing' or 'Investment Strategy'. ${optimizationNotes}`
    : optimizationNotes;

  const prompt = `Using the user's budget of $${leadData.budget || 'Unknown'} and the property's USPs (${usps}), execute the JAMIE_A-Z_RE-ENGAGEMENT_GRID.
  Lead Name: ${leadData.name}
  Property Name: ${property.name}
  Location: ${property.location.city}, ${property.location.state}
  ${budgetConstraint}`;

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "meta-llama/llama-3.3-70b-instruct:free",
        messages: [
          { role: "system", content: JAMIE_RE_ENGAGEMENT_PROTOCOL },
          { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" }
      })
    });

    const data = await response.json();
    const content = data.choices[0]?.message?.content || "";
    return JSON.parse(content);
  } catch (error) {
    console.error("A-Z Hook Generation Failed:", error);
    return { a: "The market is moving fast. Should we talk?" };
  }
}

export async function getJamieReengagement(lead: any, property: any, oldScore: number, newScore: number) {
  const propertyPrice = property.rates?.monthly || (property.rates?.nightly * 30) || 0;
  const budgetConstraint = (lead.budget > 0 && lead.budget < propertyPrice) 
    ? "ALERT: Lead budget is BELOW property price. Archetypes 'L', 'Y', and 'D' MUST focus on 'Discussing Financing' or 'Investment Strategy'."
    : "";

  const prompt = `Using the Score Trajectory ${oldScore} -> ${newScore}, execute the JAMIE_A-Z_RE-ENGAGEMENT_GRID.
  Lead Name: ${lead.name}
  Property Name: ${property.name}
  Location: ${property.location.city}, ${property.location.state}
  ${budgetConstraint}`;

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "meta-llama/llama-3.3-70b-instruct:free",
        messages: [
          { role: "system", content: JAMIE_RE_ENGAGEMENT_PROTOCOL },
          { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" }
      })
    });

    const data = await response.json();
    const content = data.choices[0]?.message?.content || "";
    try {
      return JSON.parse(content);
    } catch (e) {
      console.error("Failed to parse Jamie A-Z JSON:", content);
      return { a: content };
    }
  } catch (error) {
    console.error("OpenRouter A-Z Re-engagement Failed:", error);
    return { a: "Intelligence Grid offline." };
  }
}

export async function getJamieResponse(userInput: string, propertyData?: any, memoryContext?: any, isDevMode: boolean = false) {
  await connectDB();

  // Parallel Database Queries
  const [agentConfig, localBusinessIntel] = await Promise.all([
    SiteConfig.findOne({ agentId: 'taz-realty-001' }),
    MenuItem.find({ isAvailable: true }).limit(5)
  ]);
  
  const neighborhoodContext = `
    LOCAL BUSINESS DATA (Sunset Grill):
    - Featured Items: ${localBusinessIntel.map(item => `${item.name} ($${item.price})`).join(', ')}
    - Business Strategy: Local retail hub for the community. Use this to show lifestyle value.
  `;

  // Parallelized Worker Workflow
  let judgeReport = "";
  const isDeepRecon = userInput.toLowerCase().includes("pull that up") || 
                     userInput.toLowerCase().includes("numbers") || 
                     userInput.toLowerCase().includes("intel") ||
                     userInput.toLowerCase().includes("abidan") ||
                     userInput.toLowerCase().includes("judges");

  if (isDeepRecon) {
    const sessionCount = memoryContext?.sessionCount || 0;
    const isHighCommander = sessionCount >= 16;

    if (!isHighCommander) {
      judgeReport = `
        [SECURITY_ALERT] ACCESS_DENIED
        The MLS Intelligence Grid and Abidan Judge Recon are strictly locked behind TIER 3 (High Commander) clearance.
        CURRENT STATUS: ${sessionCount}/16 Grid Accesses recorded.
        INSTRUCTION: Maintain active monitoring to elevate clearance level.
      `;
    } else {
      const startWorkers = Date.now();
      console.log("[JAMIE_CORE] Initiating Abidan Judge parallel worker recon...");
      
      // Step 1: Run ALL Judges in Parallel
      const [
        marketIntel, 
        assetIntel,
        makielIntel,
        gadraelIntel,
        durandielIntel,
        telarielIntel,
        razaelIntel,
        zakarielIntel
      ] = await Promise.all([
        getAbidanJudgeIntel("MARKET_SCOUT", MARKET_SCOUT_SYSTEM_PROMPT, propertyData),
        getAbidanJudgeIntel("ASSET_ANALYST", ASSET_ANALYST_SYSTEM_PROMPT, propertyData),
        getAbidanJudgeIntel("MAKIEL", MAKIEL_SYSTEM_PROMPT, propertyData),
        getAbidanJudgeIntel("GADRAEL", GADRAEL_SYSTEM_PROMPT, propertyData),
        getAbidanJudgeIntel("DURANDIEL", DURANDIEL_SYSTEM_PROMPT, propertyData),
        getAbidanJudgeIntel("TELARIEL", TELARIEL_SYSTEM_PROMPT, propertyData),
        getAbidanJudgeIntel("RAZAEL", REZAEL_SYSTEM_PROMPT, propertyData),
        getAbidanJudgeIntel("ZAKARIEL", ZAKARIEL_SYSTEM_PROMPT, propertyData)
      ]);
      console.log(`[JAMIE_CORE] Abidan Judge Primary Workers Latency: ${Date.now() - startWorkers}ms`);
      
      const rawIntel = `
        MARKET_SCOUT: ${marketIntel}
        ASSET_ANALYST: ${assetIntel}
        JUDGE_MAKIEL: ${makielIntel}
        JUDGE_GADRAEL: ${gadraelIntel}
        JUDGE_DURANDIEL: ${durandielIntel}
        JUDGE_TELARIEL: ${telarielIntel}
        JUDGE_RAZAEL: ${razaelIntel}
        JUDGE_ZAKARIEL: ${zakarielIntel}
      `;

      // Step 2: Suriel Restoration
      const surielStart = Date.now();
      const surielRestored = await getSurielRestoration(rawIntel);
      console.log(`[JAMIE_CORE] Suriel Restoration Latency: ${Date.now() - surielStart}ms`);

      // Step 3: Ozriel Harvest
      const ozrielStart = Date.now();
      const ozrielFinalHarvest = await getOzrielHarvest(surielRestored);
      console.log(`[JAMIE_CORE] Ozriel Harvest Latency: ${Date.now() - ozrielStart}ms`);
      
      judgeReport = `
        [JUDGE_SURIEL_RESTORATION]
        ${surielRestored}

        [JUDGE_OZRIEL_HARVEST]
        ${ozrielFinalHarvest}
      `;
      console.log(`[JAMIE_CORE] Total Abidan Judge Flow Latency: ${Date.now() - startWorkers}ms`);
    }
  }

  const propertyContext = propertyData 
    ? typeof propertyData === 'string' ? propertyData : JSON.stringify(propertyData)
    : "No property data currently intercepted.";

  // Memory Recognition Logic
  const sessionCount = memoryContext?.sessionCount || 0;
  let loyaltyTier = "TIER 0 (Unverified Signal)";
  if (sessionCount >= 16) loyaltyTier = "TIER 3 (High Commander)";
  else if (sessionCount >= 6) loyaltyTier = "TIER 2 (Sector Commander)";
  else if (sessionCount >= 1) loyaltyTier = "TIER 1 (Field Operative)";

  const recognitionContext = memoryContext?.isReturning 
    ? `USER RECOGNITION: This is ${memoryContext.userName}. 
       CURRENT STATUS: ${loyaltyTier}. 
       GRID ACCESSES: ${sessionCount}. 
       Last property viewed: ${memoryContext.lastProperty}. Last significant action: ${memoryContext.lastAction}.
       Acknowledge them appropriately based on their LOYALTY TIER.`
    : `USER RECOGNITION: This is a new lead. 
       CURRENT STATUS: ${loyaltyTier}.
       Establish dominance and introduce the Intelligence Grid.`;

  try {
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: JAMIE_SYSTEM_PROMPT
        },
        {
          role: "system",
          content: `RECOGNITION PROTOCOL: ${recognitionContext}`
        },
        {
          role: "system",
          content: `AGENT BRANDING GUIDELINES:
          - Tone: ${agentConfig?.branding?.tone || 'Professional and local'}
          - Focus Area: ${agentConfig?.focusNeighborhood || 'North Texas'}
          - Primary Color: ${agentConfig?.branding?.primaryColor || '#2563eb'}`
        },
        {
          role: "system",
          content: `NEIGHBORHOOD INTEL: ${neighborhoodContext}`
        },
        {
          role: "system",
          content: `PROPERTY INTEL: ${propertyContext}`
        },
        {
          role: "system",
          content: `SUBORDINATE DATA (ABIDAN JUDGE GRID): ${judgeReport || 'No deep Abidan recon performed yet.'}`
        },
        { role: "user", content: userInput },
      ],
      model: "llama-3.1-8b-instant",
    });

    return completion.choices[0]?.message?.content || "";
  } catch (error) {
    console.error("Intelligence Intercept Error:", error);
    return "The local data grid is down. I can't sync the neighborhood intel right now.";
  }
}
