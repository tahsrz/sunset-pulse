import fs from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * GET /api/jamie/training/gauntlet
 * Returns a random linguistic challenge for "The Scythe's Edge" game.
 * Aggregates from Supabase (Long-Term Memory) with local fallback.
 */
export async function GET() {
  try {
    let challenges: any[] = [];

    // 1. Fetch from Supabase (Scythe Registry)
    const { data: dbRegistry } = await supabase
      .from('scythe_registry')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (dbRegistry && dbRegistry.length > 0) {
      const dbChallenges = dbRegistry.map((entry: any) => ({
        type: 'PURIFICATION_TEST',
        options: [
          { id: 'robotic', text: entry.original, label: 'Machine' },
          { id: 'purified', text: entry.replacement, label: 'Purified' }
        ].sort(() => Math.random() - 0.5),
        correct_id: 'purified',
        rationale: entry.rationale,
        difficulty: 'MEDIUM'
      }));
      challenges = [...challenges, ...dbChallenges];
    }

    // 2. Fetch from Supabase (Latest Briefing for News challenges)
    const { data: latestBriefing } = await supabase
      .from('daily_briefings')
      .select('news_articles')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (latestBriefing?.news_articles) {
      const newsChallenges = latestBriefing.news_articles.map((article: any) => ({
        type: 'HUMAN_VERACITY_TEST',
        options: [
          { id: 'real', text: article.title, label: 'North Texas Human' },
          { id: 'ai_generated', text: `Unlock the potential of ${article.title.toLowerCase()} as we delve into market synergies.`, label: 'AI Generated' }
        ].sort(() => Math.random() - 0.5),
        correct_id: 'real',
        rationale: "The AI version uses formulaic transitions ('Unlock', 'delve', 'synergies') that Ozriel has flagged as machine tendencies.",
        difficulty: 'HARD'
      }));
      challenges = [...challenges, ...newsChallenges];
    }

    // 3. Fallback to Local JSON if Supabase is sparse
    if (challenges.length < 5) {
      const registryPath = path.join(process.cwd(), 'utils/jamie/memory/scythe_registry.json');
      if (fs.existsSync(registryPath)) {
        const localRegistry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
        const localChallenges = localRegistry.map((entry: any) => ({
          type: 'PURIFICATION_TEST',
          options: [
            { id: 'robotic', text: entry.original, label: 'Machine' },
            { id: 'purified', text: entry.replacement, label: 'Purified' }
          ].sort(() => Math.random() - 0.5),
          correct_id: 'purified',
          rationale: entry.rationale,
          difficulty: 'MEDIUM'
        }));
        challenges = [...challenges, ...localChallenges];
      }
    }

    // 4. Ultimate Fallback
    if (challenges.length === 0) {
      challenges = [{
        type: 'CALIBRATION',
        options: [
          { id: 'robotic', text: "It is important to note that the market is currently experiencing growth.", label: "Machine" },
          { id: 'purified', text: "The market's finally moving.", label: "Human" }
        ].sort(() => Math.random() - 0.5),
        correct_id: 'purified',
        rationale: "Robotic preambles like 'It is important to note' are primary AI tells.",
        difficulty: 'EASY'
      }];
    }

    // Return a random challenge
    const randomChallenge = challenges[Math.floor(Math.random() * challenges.length)];

    return NextResponse.json({
      game: "The Scythe's Edge: A Turing Gauntlet",
      challenge: randomChallenge,
      total_available_challenges: challenges.length,
      source: challenges.length > 5 ? 'Supabase' : 'Local Fallback',
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Gauntlet API Error:', error);
    return NextResponse.json({ error: 'Failed to initiate the Gauntlet.' }, { status: 500 });
  }
}
