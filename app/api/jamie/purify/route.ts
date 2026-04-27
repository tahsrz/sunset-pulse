import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * Ozriel's Scythe Purifier Engine v2.1
 * Features: Entropy Mitigation, Density Scoring, Domain Weighting.
 */

// Domain Detection: Identify the context of the text
function detectDomain(text: string) {
  const lowercaseText = text.toLowerCase();
  const domains = {
    real_estate: ["market", "zoning", "district", "industrial", "logistics", "property", "listing", "texas", "frisco"],
    technical: ["code", "api", "function", "deployment", "server", "data", "algorithm", "recursive", "integration"],
    casual: ["hope", "hey", "talk", "see", "soon", "thanks", "great", "awesome"]
  };

  let maxScore = 0;
  let detectedDomain = "general";

  Object.entries(domains).forEach(([domain, keywords]) => {
    const score = keywords.reduce((acc, kw) => acc + (lowercaseText.split(kw).length - 1), 0);
    if (score > maxScore) {
      maxScore = score;
      detectedDomain = domain;
    }
  });

  return detectedDomain;
}

// Entropy Analysis: Calculate sentence length variance
function calculateEntropy(text: string) {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  if (sentences.length < 2) return 1.0;

  const lengths = sentences.map(s => s.trim().split(/\s+/).length);
  const avg = lengths.reduce((a, b) => a + b, 0) / lengths.length;
  const variance = lengths.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / lengths.length;
  
  return Math.min(variance / 20, 1.0); 
}

// Repetition Check
function checkRepetition(text: string) {
  const words: string[] = text.toLowerCase().match(/\b\w+\b/g) ?? [];
  if (words.length < 10) return 0;

  const counts: Record<string, number> = {};
  words.forEach(w => { if (w.length > 3) counts[w] = (counts[w] || 0) + 1; });
  
  const totalWords = words.length;
  const repetitiveWords = Object.values(counts).filter(c => c > 3).reduce((a, b) => a + b, 0);
  
  return repetitiveWords / totalWords;
}

export async function POST(req: Request) {
  try {
    const { text } = await req.json();
    if (!text || text.trim().length < 5) {
      return NextResponse.json({ 
        humanity_score: 100, 
        detections: [], 
        purified_text: text,
        rationale: "Text too short for meaningful analysis." 
      });
    }

    const domain = detectDomain(text);
    const { data: registry } = await supabase.from('scythe_registry').select('*');

    const detections: any[] = [];
    let purifiedText = text;
    const wordCount = text.split(/\s+/).length;

    // Pattern Matching with Registry
    if (registry) {
      registry.forEach((entry: any) => {
        const escapedPattern = entry.original.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`\\b${escapedPattern}\\b`, 'gi');
        
        const matches = text.match(regex);
        if (matches) {
          // Domain Weighting: Real Estate terms in Real Estate domain are less "robotic" than in Casual domain
          let weight = 1.0;
          if (domain === 'real_estate' && (entry.original.includes('market') || entry.original.includes('zoning'))) {
            weight = 0.5; // Half penalty for domain-appropriate jargon
          }

          detections.push({
            robotic: entry.original,
            purified: entry.replacement,
            rationale: entry.rationale,
            count: matches.length,
            weight
          });
          purifiedText = purifiedText.replace(regex, entry.replacement);
        }
      });
    }

    const burstiness = calculateEntropy(text);
    const repetitionFactor = checkRepetition(text);

    // Density Score = Total (Count * Weight) / Word Count
    const totalWeightedHits = detections.reduce((sum, d) => sum + (d.count * d.weight), 0);
    const detectionDensity = (totalWeightedHits / wordCount) * 100;

    let score = 100;
    score -= (detectionDensity * 6); // Penalty
    score += (burstiness * 12);      // Entropy Bonus
    score -= (repetitionFactor * 40); // Repetition Penalty

    // Domain Specific Adjustments
    if (domain === 'casual' && burstiness < 0.2) score -= 10; // Casual talk shouldn't be monotonous

    const finalScore = Math.min(100, Math.max(0, Math.round(score)));

    return NextResponse.json({
      original_text: text,
      purified_text: purifiedText,
      humanity_score: finalScore,
      domain,
      metrics: {
        word_count: wordCount,
        weighted_detections: totalWeightedHits.toFixed(1),
        density: detectionDensity.toFixed(2) + '%',
        burstiness: (burstiness * 100).toFixed(0) + '%',
        repetition: (repetitionFactor * 100).toFixed(0) + '%'
      },
      detections,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Purify API Error:', error);
    return NextResponse.json({ error: 'Failed to process purification.' }, { status: 500 });
  }
}


