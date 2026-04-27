import Groq from "groq-sdk";
import MenuItem from "@/models/MenuItem";
import { SiteConfig } from "@/models/SiteConfig";
import connectDB from "@/lib/core/database";
import fs from 'fs';
import path from 'path';
import { 
  JAMIE_SYSTEM_PROMPT, 
  JAMIE_RE_ENGAGEMENT_PROTOCOL,
  JAMIE_SESSION_RECAP_PROTOCOL,
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
import Entity from "@/models/Entity";
import { createClient } from "@/utils/supabase/server";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

/**
 * Internal system tracker for idle-dream triggering
 */
function trackInteraction() {
  try {
    const interactionPath = path.join(process.cwd(), 'utils/jamie/last_interaction.json');
    if (!fs.existsSync(path.dirname(interactionPath))) {
      fs.mkdirSync(path.dirname(interactionPath), { recursive: true });
    }
    fs.writeFileSync(interactionPath, JSON.stringify({ 
      timestamp: new Date().toISOString(),
      type: 'user_activity'
    }), 'utf8');
  } catch (err) {
    console.error("Failed to track interaction:", err);
  }
}

export async function getJamieActivityRecap(history: any[], coreInsights: any[] = [], activityLogs: any[] = []) {
  const hasSignificantHistory = history.length > 0 || coreInsights.length > 0 || activityLogs.length > 0;
  
  if (!hasSignificantHistory) {
    return "Welcome back. I am Jamie, and I'm ready to assist you with your property search.";
  }

  trackInteraction();

  // Load daily joke from the backend (local file system)
  let dailyJoke = "";
  try {
    const jokePath = path.join(process.cwd(), 'utils/jamie/memory/daily_joke.json');
    if (fs.existsSync(jokePath)) {
      const jokeData = JSON.parse(fs.readFileSync(jokePath, 'utf8'));
      dailyJoke = jokeData.joke;
    }
  } catch (err) {
    console.error("Error reading daily joke in recap:", err);
  }

  // Filter for clean text content from history
  const historyText = history
    .slice(-5) 
    .map(h => `${h.role.toUpperCase()}: ${h.content.replace(/\[\[([A-Z]+):(\{.*?\}|\[.*?\])\]\]/g, '')}`)
    .join('\n');

  const coreText = coreInsights
    .slice(-5)
    .map(s => `[CORE_INSIGHT] ${s.insight} (${s.timestamp})`)
    .join('\n');

  const activityText = activityLogs
    .slice(-5)
    .map(t => `[ACTIVITY] ${t.event} (${t.timestamp})`)
    .join('\n');

  const combinedContext = `
    CORE_INSIGHTS:
    ${coreText || 'None recorded.'}

    ACTIVITY_LOGS:
    ${activityText || 'None recorded.'}

    RECENT_CHAT_HISTORY:
    ${historyText || 'None recorded.'}

    DAILY_JOKE_RESEARCH:
    ${dailyJoke || 'None available today.'}
  `;

  try {
    const completion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: JAMIE_SESSION_RECAP_PROTOCOL },
        { role: "user", content: `Contextualized History:\n${combinedContext}\n\nExecute Jamie's session recap. Focus on key progress first.` }
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.3,
    });

    return completion.choices[0]?.message?.content || "Session state restored. Jamie has recognized your activity.";
  } catch (error) {
    console.error("Recap Generation Error:", error);
    return "Welcome back. Jamie has synchronized your previous activity.";
  }
}

/**
 * Jamie's Analysis Functions
 */
async function getJamieAnalysisIntel(workerName: string, systemPrompt: string, propertyData: any, model: string = "meta-llama/llama-3.1-405b-instruct:free") {
  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Jamie's analysis request: ${JSON.stringify(propertyData)}` }
        ],
      })
    });
    const data = await response.json();
    return data.choices[0]?.message?.content || `ANALYSIS_${workerName}_FAILURE: Jamie's data stream interrupted.`;
  } catch (error) {
    console.error(`Analysis ${workerName} Error:`, error);
    return `ANALYSIS_${workerName}_ERROR: Jamie communication error.`;
  }
}

/**
 * Data Aggregator
 */
async function getJamieDataAggregation(rawIntel: string, systemPrompt: string, model: string = "meta-llama/llama-3.1-405b-instruct:free") {
  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Jamie needs to aggregate and summarize this analysis: ${rawIntel}` }
        ],
      })
    });
    const data = await response.json();
    return data.choices[0]?.message?.content || "AGGREGATION_FAILURE: Jamie's data aggregation failed.";
  } catch (error) {
    console.error("Aggregation Error:", error);
    return "AGGREGATION_ERROR: Jamie system error during data processing.";
  }
}

/**
 * Final Insights
 */
async function getJamieFinalInsights(restoredIntel: string, systemPrompt: string, model: string = "meta-llama/llama-3.1-405b-instruct:free") {
  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Jamie is generating final insights: ${restoredIntel}` }
        ],
      })
    });
    const data = await response.json();
    return data.choices[0]?.message?.content || "INSIGHT_FAILURE: Jamie's insight generation skipped.";
  } catch (error) {
    console.error("Insight Error:", error);
    return "INSIGHT_ERROR: Jamie core processing failure.";
  }
}

import { calculateMaxStay, calculateBudgetGap, synthesizePortfolio } from '../intelligence/budgetLogic';

export async function generateJamieEngagementHook(leadData: any, property: any) {
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
    maxStayDays > 0 ? `Max Continuous Stay Potential: ${maxStayDays} Days.` : null,
    budgetGap > 0 ? `Gap to Next-Tier Features: $${budgetGap}.` : null,
    leadData.budget > 250000 ? `Lead qualifies for 'Yield Portfolio' synthesis.` : null,
  ].filter(Boolean).join(" ");

  const budgetConstraint = (leadData.budget > 0 && leadData.budget < propertyPrice) 
    ? `ALERT: Lead budget is below property price. Jamie's focus: 'Discussing Financing' or 'Investment Strategy'. ${optimizationNotes}`
    : optimizationNotes;

  const prompt = `Using the user's budget of $${leadData.budget || 'Unknown'} and the property's features (${usps}), Jamie will generate an engagement strategy.
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
    console.error("Engagement Hook Generation Failed:", error);
    return { a: "The market is moving fast. Should we talk? - Jamie" };
  }
}

export async function getJamieEngagement(lead: any, property: any, oldScore: number, newScore: number) {
  const propertyPrice = property.rates?.monthly || (property.rates?.nightly * 30) || 0;
  const budgetConstraint = (lead.budget > 0 && lead.budget < propertyPrice) 
    ? "ALERT: Lead budget is below property price. Jamie's focus: 'Discussing Financing' or 'Investment Strategy'."
    : "";

  const prompt = `Using the Score Trajectory ${oldScore} -> ${newScore}, Jamie will generate an engagement strategy.
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
      console.error("Failed to parse engagement JSON:", content);
      return { a: content };
    }
  } catch (error) {
    console.error("Engagement Strategy Generation Failed:", error);
    return { a: "Jamie is currently offline." };
  }
}

export const generateHighStakesHook = generateJamieEngagementHook;
export const getJamieReengagement = getJamieEngagement;

export async function getJamieResponse(messages: any[], propertyData?: any, memoryContext?: any, isDevMode: boolean = false) {
  const userInput = messages[messages.length - 1]?.content || "";
  
  // Fetch Config from Supabase (Primary)
  const supabase = createClient();
  const { data: sbConfig } = await supabase
    .from('site_config')
    .select('*')
    .eq('agent_id', 'taz-realty-001')
    .single();

  let agentConfig;
  if (sbConfig) {
    agentConfig = {
      jamieSystemPrompt: sbConfig.intelligence?.jamieSystemPrompt,
      abidanPrompts: sbConfig.intelligence?.abidanPrompts,
      modelMatrix: sbConfig.model_matrix,
      operationalSettings: sbConfig.operational_settings,
      branding: sbConfig.branding
    };
  } else {
    // Fallback to MongoDB (Legacy)
    await connectDB();
    agentConfig = await SiteConfig.findOne({ agentId: 'taz-realty-001' }).lean();
  }

  const [localBusinessIntel] = await Promise.all([
    MenuItem.find({ isAvailable: true }).limit(5)
  ]);

  // Use Dynamic Configuration from Database or Fallback to Constants
  const jamieSystemPrompt = agentConfig?.jamieSystemPrompt || JAMIE_SYSTEM_PROMPT;
  const abidanPrompts = {
    MARKET_SCOUT: agentConfig?.abidanPrompts?.MARKET_SCOUT || MARKET_SCOUT_SYSTEM_PROMPT,
    ASSET_ANALYST: agentConfig?.abidanPrompts?.ASSET_ANALYST || ASSET_ANALYST_SYSTEM_PROMPT,
    MAKIEL: agentConfig?.abidanPrompts?.MAKIEL || MAKIEL_SYSTEM_PROMPT,
    GADRAEL: agentConfig?.abidanPrompts?.GADRAEL || GADRAEL_SYSTEM_PROMPT,
    DURANDIEL: agentConfig?.abidanPrompts?.DURANDIEL || DURANDIEL_SYSTEM_PROMPT,
    TELARIEL: agentConfig?.abidanPrompts?.TELARIEL || TELARIEL_SYSTEM_PROMPT,
    REZAEL: agentConfig?.abidanPrompts?.REZAEL || REZAEL_SYSTEM_PROMPT,
    ZAKARIEL: agentConfig?.abidanPrompts?.ZAKARIEL || ZAKARIEL_SYSTEM_PROMPT,
    PHOENIX: agentConfig?.abidanPrompts?.PHOENIX || PHOENIX_SYSTEM_PROMPT,
    REAPER: agentConfig?.abidanPrompts?.REAPER || REAPER_SYSTEM_PROMPT
  };

  const primaryModel = agentConfig?.modelMatrix?.primaryModel || 'llama-3.1-8b-instant';
  const analysisModel = agentConfig?.modelMatrix?.reconModel || 'meta-llama/llama-3.1-405b-instruct:free';
  const minJudges = agentConfig?.operationalSettings?.minJudges || 1;
  const maxJudges = agentConfig?.operationalSettings?.maxJudges || 4;
  const personalityPreset = agentConfig?.operationalSettings?.personalityPreset || 'Professional';
  
  const neighborhoodContext = `
    LOCAL BUSINESS DATA:
    - Featured Items: ${localBusinessIntel.map(item => `${item.name} ($${item.price})`).join(', ')}
    - Business Strategy: Local retail hub for the community. Jamie uses this to show lifestyle value.
  `;

  // Parallelized Worker Workflow
  let analysisReport = "";
  const isDeepAnalysis = userInput.toLowerCase().includes("pull that up") || 
                     userInput.toLowerCase().includes("numbers") || 
                     userInput.toLowerCase().includes("analysis") ||
                     userInput.toLowerCase().includes("insights");

  if (isDeepAnalysis) {
    const startWorkers = Date.now();
    console.log("[JAMIE_CORE] Jamie initiating parallel data analysis...");
    
    // Fetch Dynamic Council Members from Registry
    const councilEntities = await Entity.find({ 
      'operationalSettings.isCouncilMember': true 
    }).lean();

    const allAnalyticAgents = councilEntities.map(e => ({
      name: e.uid.replace('JUDGE-', ''),
      prompt: e.logic.systemPrompt,
      model: e.logic.modelId
    }));

    if (allAnalyticAgents.length === 0) {
      console.warn("[JAMIE_CORE] No council members found in registry. Falling back to default.");
    }

    // 2 Randomly select between min and max agents
    const range = Math.max(1, maxJudges - minJudges + 1);
    const numToCall = Math.min(allAnalyticAgents.length, Math.floor(Math.random() * range) + minJudges);
    const selectedAgents = [...allAnalyticAgents]
      .sort(() => 0.5 - Math.random())
      .slice(0, numToCall);

    console.log(`[JAMIE_CORE] Jamie selected ${numToCall} analysis agents for this cycle: ${selectedAgents.map(j => j.name).join(', ')}`);

    // Step 3: Run Selected agents in Parallel using their specific model or the default analysisModel
    const analysisResults = await Promise.all(
      selectedAgents.map(j => getJamieAnalysisIntel(j.name, j.prompt, propertyData, j.model || analysisModel))
    );
    
    console.log(`[JAMIE_CORE] Jamie's Analysis Workers Latency: ${Date.now() - startWorkers}ms`);
    
    const rawIntel = selectedAgents.map((j, i) => `ANALYSIS_${j.name}: ${analysisResults[i]}`).join('\n');

    // 4: Jamie Data Aggregation
    const aggregationStart = Date.now();
    const aggregatedData = await getJamieDataAggregation(rawIntel, abidanPrompts.PHOENIX, analysisModel);
    console.log(`[JAMIE_CORE] Jamie's Data Aggregation Latency: ${Date.now() - aggregationStart}ms`);

    // 5 Jamie Final Insights
    const insightStart = Date.now();
    const finalInsights = await getJamieFinalInsights(aggregatedData, abidanPrompts.REAPER, analysisModel);
    console.log(`[JAMIE_CORE] Jamie's Final Insight Latency: ${Date.now() - insightStart}ms`);
    
    analysisReport = `
      [ACTIVE_ANALYSIS_NODES]: ${selectedAgents.map(j => j.name).join(', ')}
      [ANALYSIS_PROFILE]: ${personalityPreset}
      
      [JAMIE_DATA_AGGREGATION]
      ${aggregatedData}

      [JAMIE_FINAL_INSIGHTS]
      ${finalInsights}
    `;
    console.log(`[JAMIE_CORE] Total Jamie Analysis Flow Latency: ${Date.now() - startWorkers}ms`);
  }

  const propertyContext = propertyData 
    ? typeof propertyData === 'string' ? propertyData : JSON.stringify(propertyData)
    : "No property data currently available for Jamie.";

  // Memory Recognition Logic
  const sessionCount = memoryContext?.sessionCount || 0;

  trackInteraction();

  const recognitionContext = memoryContext?.isReturning 
    ? `USER RECOGNITION: Jamie recognizes ${memoryContext.userName}. 
       Last property viewed: ${memoryContext.lastProperty}. Last significant action: ${memoryContext.lastAction}.
       Jamie will acknowledge them appropriately.`
    : `USER RECOGNITION: Jamie is meeting a new client. 
       Jamie will introduce the platform and capabilities.`;

  // Sanitize and Format Messages for Groq
  const sanitizedMessages = messages
    .filter(m => m && typeof m === 'object' && m.role && m.content)
    .map(m => ({
      role: m.role,
      content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content)
    }));

  try {
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: jamieSystemPrompt
        },
        {
          role: "system",
          content: `RECOGNITION PROTOCOL: ${recognitionContext}`
        },
        {
          role: "system",
          content: `PERSONALITY_MATRIX: Jamie is currently in ${personalityPreset} mode.`
        },
        {
          role: "system",
          content: `JAMIE BRANDING GUIDELINES:
          - Tone: ${agentConfig?.branding?.tone || 'Professional and local'}
          - Focus Area: ${agentConfig?.focusNeighborhood || 'North Texas'}
          - Primary Color: ${agentConfig?.branding?.primaryColor || '#2563eb'}`
        },
        {
          role: "system",
          content: `NEIGHBORHOOD_CONTEXT: ${neighborhoodContext}`
        },
        {
          role: "system",
          content: `PROPERTY_CONTEXT: ${propertyContext}`
        },
        {
          role: "system",
          content: `JAMIE_ANALYSIS_REPORT: ${analysisReport || 'No deep analysis performed yet.'}`
        },
        ...sanitizedMessages
      ],
      model: primaryModel,
      stream: true,
    });

    return completion;
  } catch (error) {
    console.error("Jamie Analysis Error:", error);
    return "Jamie's local data grid is currently unavailable. I cannot sync the neighborhood data at this time.";
  }
}
