import fs from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';

/**
 * GET /api/jamie/training/gauntlet
 * Returns a random linguistic challenge for "The Scythe's Edge" game.
 */
export async function GET() {
  try {
    const registryPath = path.join(process.cwd(), 'utils/jamie/memory/scythe_registry.json');
    const briefingPath = path.join(process.cwd(), 'utils/jamie/memory/daily_briefing.json');
    
    let challenges = [];

    // 1. Load data from Ozriel's Scythe Registry
    if (fs.existsSync(registryPath)) {
      const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
      
      // Map registry entries into "Robotic vs Purified" challenges
      const registryChallenges = registry.map((entry: any) => ({
        type: 'PURIFICATION_TEST',
        options: [
          { id: 'robotic', text: entry.original, label: 'Machine' },
          { id: 'purified', text: entry.replacement, label: 'Purified' }
        ].sort(() => Math.random() - 0.5), // Shuffle options
        correct_id: 'purified',
        rationale: entry.rationale,
        difficulty: 'MEDIUM'
      }));
      
      challenges = [...challenges, ...registryChallenges];
    }

    // 2. Load "Real" news articles for "Human vs Machine" challenges
    if (fs.existsSync(briefingPath)) {
      const briefing = JSON.parse(fs.readFileSync(briefingPath, 'utf8'));
      if (briefing.news_articles && briefing.news_articles.length > 0) {
        const realNewsChallenges = briefing.news_articles.map((article: any) => ({
          type: 'HUMAN_VERACITY_TEST',
          options: [
            { id: 'real', text: article.title, label: 'North Texas Human' },
            { id: 'ai_generated', text: `Unlock the potential of ${article.title.toLowerCase()} as we delve into market synergies.`, label: 'AI Generated' }
          ].sort(() => Math.random() - 0.5),
          correct_id: 'real',
          rationale: "The AI version uses formulaic transitions ('Unlock', 'delve', 'synergies') that Ozriel has flagged as machine tendencies.",
          difficulty: 'HARD'
        }));
        
        challenges = [...challenges, ...realNewsChallenges];
      }
    }

    // 3. Fallback if registry is empty
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
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Gauntlet API Error:', error);
    return NextResponse.json({ error: 'Failed to initiate the Gauntlet.' }, { status: 500 });
  }
}
