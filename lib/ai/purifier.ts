import { supabase } from '@/lib/supabase';

/**
 * Ozriel's Scythe Purifier Logic
 * Extracted for shared use across the Storytime API and Jamie Purify API.
 */

export function detectDomain(text: string) {
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

export function calculateEntropy(text: string) {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  if (sentences.length < 2) return 1.0;

  const lengths = sentences.map(s => s.trim().split(/\s+/).length);
  const avg = lengths.reduce((a, b) => a + b, 0) / lengths.length;
  const variance = lengths.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / lengths.length;
  
  return Math.min(variance / 20, 1.0); 
}

export function checkRepetition(text: string) {
  const words: string[] = text.toLowerCase().match(/\b\w+\b/g) ?? [];
  if (words.length < 10) return 0;

  const counts: Record<string, number> = {};
  words.forEach(w => { if (w.length > 3) counts[w] = (counts[w] || 0) + 1; });
  
  const totalWords = words.length;
  const repetitiveWords = Object.values(counts).filter(c => c > 3).reduce((a, b) => a + b, 0);
  
  return repetitiveWords / totalWords;
}

export async function purifyText(text: string) {
  if (!text || text.trim().length < 5) {
    return { 
      humanity_score: 100, 
      detections: [], 
      purified_text: text,
      rationale: "Text too short for meaningful analysis." 
    };
  }

  const domain = detectDomain(text);
  const { data: registry, error: registryError } = await (supabase as any).from('scythe_registry').select('*');

  if (registryError) {
    console.error('[PURIFIER_REGISTRY_ERROR]:', registryError.message);
  }

  const detections: any[] = [];
  let purifiedText = text;
  const wordCount = text.split(/\s+/).length;

  console.log(`[PURIFIER_DEBUG]: Registry count: ${registry?.length || 0}, Word count: ${wordCount}`);

  if (registry) {
    registry.forEach((entry: any) => {
      // Escape special characters but handle trailing punctuation specially
      let pattern = entry.original;
      const hasTrailingPunctuation = /[.!?]$/.test(pattern);
      
      if (hasTrailingPunctuation) {
        // If it ends in punctuation, we match the punctuation but don't force a word boundary AFTER it
        const escapedBase = pattern.slice(0, -1).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const punctuation = pattern.slice(-1).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`\\b${escapedBase}${punctuation}`, 'gi');
        
        const matches = text.match(regex);
        if (matches) {
          processMatch(entry, matches.length);
          purifiedText = purifiedText.replace(regex, entry.replacement);
        }
      } else {
        const escapedPattern = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`\\b${escapedPattern}\\b`, 'gi');
        
        const matches = text.match(regex);
        if (matches) {
          processMatch(entry, matches.length);
          purifiedText = purifiedText.replace(regex, entry.replacement);
        }
      }
    });
  }

  function processMatch(entry: any, count: number) {
    let weight = 1.0;
    if (domain === 'real_estate' && (entry.original.includes('market') || entry.original.includes('zoning'))) {
      weight = 0.5;
    }

    detections.push({
      robotic: entry.original,
      purified: entry.replacement,
      rationale: entry.rationale,
      count: count,
      weight
    });
  }

  const burstiness = calculateEntropy(text);
  const repetitionFactor = checkRepetition(text);

  const totalWeightedHits = detections.reduce((sum, d) => sum + (d.count * d.weight), 0);
  const detectionDensity = (totalWeightedHits / wordCount) * 100;

  let score = 100;
  score -= (detectionDensity * 6);
  score += (burstiness * 12);
  score -= (repetitionFactor * 40);

  if (domain === 'casual' && burstiness < 0.2) score -= 10;

  const finalScore = Math.min(100, Math.max(0, Math.round(score)));

  return {
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
  };
}
