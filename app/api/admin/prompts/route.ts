import connectDB from '@/lib/core/database';
import { SiteConfig } from '@/models/SiteConfig';
import { 
  JAMIE_SYSTEM_PROMPT,
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
} from '@/lib/ai/prompts';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    await connectDB();
    let config = await SiteConfig.findOne({ agentId: 'taz-realty-001' });
    
    if (!config) {
      config = await SiteConfig.create({
        agentId: 'taz-realty-001',
        jamieSystemPrompt: JAMIE_SYSTEM_PROMPT,
        abidanPrompts: {
          MARKET_SCOUT: MARKET_SCOUT_SYSTEM_PROMPT,
          ASSET_ANALYST: ASSET_ANALYST_SYSTEM_PROMPT,
          MAKIEL: MAKIEL_SYSTEM_PROMPT,
          GADRAEL: GADRAEL_SYSTEM_PROMPT,
          DURANDIEL: DURANDIEL_SYSTEM_PROMPT,
          TELARIEL: TELARIEL_SYSTEM_PROMPT,
          REZAEL: REZAEL_SYSTEM_PROMPT,
          ZAKARIEL: ZAKARIEL_SYSTEM_PROMPT,
          PHOENIX: PHOENIX_SYSTEM_PROMPT,
          REAPER: REAPER_SYSTEM_PROMPT
        }
      });
    }

    return NextResponse.json({
      jamieSystemPrompt: config.jamieSystemPrompt || JAMIE_SYSTEM_PROMPT,
      abidanPrompts: {
        MARKET_SCOUT: config.abidanPrompts?.MARKET_SCOUT || MARKET_SCOUT_SYSTEM_PROMPT,
        ASSET_ANALYST: config.abidanPrompts?.ASSET_ANALYST || ASSET_ANALYST_SYSTEM_PROMPT,
        MAKIEL: config.abidanPrompts?.MAKIEL || MAKIEL_SYSTEM_PROMPT,
        GADRAEL: config.abidanPrompts?.GADRAEL || GADRAEL_SYSTEM_PROMPT,
        DURANDIEL: config.abidanPrompts?.DURANDIEL || DURANDIEL_SYSTEM_PROMPT,
        TELARIEL: config.abidanPrompts?.TELARIEL || TELARIEL_SYSTEM_PROMPT,
        REZAEL: config.abidanPrompts?.REZAEL || REZAEL_SYSTEM_PROMPT,
        ZAKARIEL: config.abidanPrompts?.ZAKARIEL || ZAKARIEL_SYSTEM_PROMPT,
        PHOENIX: config.abidanPrompts?.PHOENIX || PHOENIX_SYSTEM_PROMPT,
        REAPER: config.abidanPrompts?.REAPER || REAPER_SYSTEM_PROMPT
      },
      modelMatrix: config.modelMatrix || {
        primaryModel: 'llama-3.1-8b-instant',
        reconModel: 'meta-llama/llama-3.1-405b-instruct:free',
        miniModel: 'google/gemma-2-9b-it:free'
      },
      operationalSettings: config.operationalSettings || {
        minJudges: 1,
        maxJudges: 4,
        personalityPreset: 'Aggressive'
      }
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch prompts' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await connectDB();
    const body = await req.json();
    const { jamieSystemPrompt, abidanPrompts, modelMatrix, operationalSettings } = body;

    await SiteConfig.findOneAndUpdate(
      { agentId: 'taz-realty-001' },
      { 
        jamieSystemPrompt, 
        abidanPrompts,
        modelMatrix,
        operationalSettings,
        lastModifiedBy: 'Admin'
      },
      { upsert: true }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update prompts' }, { status: 500 });
  }
}
