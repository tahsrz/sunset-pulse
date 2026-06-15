import { callOllama } from '../news/ollamaMini';

/**
 * TAH Linguistic Purifier v3.6
 * Uses a local LLM (Ollama/phi4-mini) to extract high-entropy technical keywords 
 * to maximize the hit-rate of the Global Bloom Filter in surgical retrieval.
 */
export const purifyQueryForTah = async (rawQuery: string): Promise<string[]> => {
  const prompt = `
    You are a surgical intelligence pre-processor for the TAH/Memoria Protocol. 
    Your goal is to extract 3-5 high-entropy, technical, and distinctive keywords or bigrams from the user query.
    
    CRITICAL:
    - Focus on technical nouns, acronyms, and proper names (e.g. "SIMD", "LPU", "MapReduce", "Cache Miss").
    - Exclude conversational filler (e.g. "tell me", "how does", "what is").
    - Exclude common English verbs and adjectives.
    - Return ONLY a comma-separated list of terms. No preamble.
    
    Query: "${rawQuery}"
  `.trim();
  
  try {
    const response = await callOllama(prompt, { temperature: 0.05, num_predict: 50 });
    // Clean up response in case of preamble
    const cleanResponse = response.replace(/^(Terms|Keywords|Surgical Terms):/i, '').trim();
    return cleanResponse
      .split(',')
      .map(t => t.trim().toLowerCase())
      .filter(t => t.length > 2);
  } catch (error) {
    console.warn('[TAH_PURIFIER_FALLBACK] Local LLM pre-processor offline. Using basic tokenization.');
    // Robust fallback: remove common stop words and return technical-looking tokens
    const stopWords = new Set(['what', 'how', 'does', 'the', 'and', 'for', 'with', 'about', 'tell', 'me', 'explain']);
    return rawQuery
      .toLowerCase()
      .split(/[\s,._-]+/)
      .filter(t => t.length > 3 && !stopWords.has(t));
  }
};
