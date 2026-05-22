export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import connectDB from '@/lib/core/database';
import Story from '@/models/Story';
import Entity from '@/models/Entity';
import { SiteConfig } from '@/models/SiteConfig';
import Groq from 'groq-sdk';
import { purifyText } from '@/lib/ai/purifier';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    await connectDB();
    const { id } = params;
    const { searchParams } = new URL(req.url);
    const envoyOverride = searchParams.get('envoyId');

    // 1. Fetch the Story
    const story = await Story.findOne({ uid: id });
    if (!story) return NextResponse.json({ error: 'Story not found' }, { status: 404 });

    // 2. Determine Envoy (Override or Global Default)
    let envoyId = envoyOverride;
    
    if (!envoyId) {
      const config = await SiteConfig.findOne({ agentId: 'taz-realty-001' }).lean();
      envoyId = (config as any)?.activeEnvoyId || 'ENVOY-JAMIE';
    }

    const envoy = (await Entity.findOne({ uid: envoyId }).lean()) as any;
    if (!envoy) return NextResponse.json({ error: 'Envoy not found' }, { status: 404 });

    // 3. Narrative Intelligence Grid: Check for missing interpretations or visual cues
    let hasChanges = false;
    const updatedPages = await Promise.all(
      story.pages.map(async (page: any) => {
        // Only generate if tacticalInterpretation is missing OR not yet purified
        if (!page.tacticalInterpretation || !page.isPurified) {
          console.log(`📡 [STORYTIME_INTEL] Processing interpretation for Page ${page.pageNumber}...`);
          
          let rawInterpretation = page.tacticalInterpretation;

          if (!rawInterpretation) {
            const prompt = `
              ENVOY_PROFILE: ${envoy.logic.systemPrompt}
              TASK: Re-interpret this children's book text into your tactical persona. 
              STRICT LIMIT: Keep it under 25 words. Maintain your unique tone.
              TEXT: "${page.originalText}"
            `;

            const completion = await groq.chat.completions.create({
              messages: [
                { role: 'system', content: 'You are an elite tactical AI operative specializing in narrative re-interpretation.' },
                { role: 'user', content: prompt }
              ],
              model: 'llama-3.1-8b-instant',
              temperature: 0.6,
            });

            rawInterpretation = completion.choices[0]?.message?.content || page.originalText;
          }

          // Invoke Ozriel's Scythe Purification Layer
          console.log(`⚔️ [OZRIEL_SCYTHE] Purifying Page ${page.pageNumber}...`);
          const purification = await purifyText(rawInterpretation);
          
          page.tacticalInterpretation = purification.purified_text;
          page.humanityScore = purification.humanity_score;
          page.isPurified = true;
          hasChanges = true;
        }

        // Auto-generate visual cues if none
        if (page.visualCue === 'none' || !page.visualCue) {
          const cuePrompt = `
            TEXT: "${page.tacticalInterpretation}"
            TASK: Select the most appropriate visual cue for this text.
            OPTIONS: ripple, pulse, shake, glitch, none
            RESPONSE: Just the word.
          `;
          
          const cueCompletion = await groq.chat.completions.create({
            messages: [{ role: 'user', content: cuePrompt }],
            model: 'llama-3.1-8b-instant',
            temperature: 0.1,
          });

          const suggestedCue = cueCompletion.choices[0]?.message?.content?.toLowerCase().trim();
          const validCues = ['ripple', 'pulse', 'shake', 'glitch', 'none'];
          page.visualCue = validCues.includes(suggestedCue as any) ? suggestedCue : 'none';
          hasChanges = true;
        }

        return page;
      })
    );

    if (hasChanges) {
      console.log(`✅ [STORYTIME_INTEL] Synchronizing Story Document: ${story.title}`);
      await story.save();
    }

    return NextResponse.json({
      storyTitle: story.title,
      envoyName: envoy.name,
      envoyVisual: envoy.visual,
      pages: updatedPages
    });
  } catch (error) {
    console.error('Storytime API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
