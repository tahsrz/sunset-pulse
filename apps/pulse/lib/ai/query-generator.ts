// Jamie's Predictive Query Generator
// Analyzes the 20-vector context and predicts high-stakes "Intelligence Intercepts."

import { IntelligenceContext } from './intelligence-model';

export interface PredictiveQuery {
  id: string;
  label: string;
  query: string;
  intent: 'RISK' | 'STRATEGY' | 'RECON';
}

export function generatePredictiveQueries(context: IntelligenceContext): PredictiveQuery[] {
  const c = context.external.census;
  const queries: PredictiveQuery[] = [];

  // 1. Stability Check (Based on Homeownership & Rent Burden)
  if (c && c.rentBurden > 30) {
    queries.push({
      id: 'stress_analysis',
      label: 'Analyze Affordability Stress',
      query: `Analyze if the current rent burden of ${c.rentBurden}% in this tract makes this lead more likely to convert to ownership now.`,
      intent: 'RISK'
    });
  }

  // 2. Asset Strategy (Based on Year Built)
  if (c && c.medianYearBuilt < 1980) {
    queries.push({
      id: 'vintage_recon',
      label: 'Predict Maintenance Friction',
      query: `Given the asset vintage (Median Built: ${c.medianYearBuilt}), generate a re-engagement hook focusing on modernization and property value appreciation.`,
      intent: 'RECON'
    });
  }

  // 3. Labor Strategy (Based on WFH & Tech Density)
  if (c && (c.wfhRate > 15 || c.techDensity > 15)) {
    queries.push({
      id: 'remote_strategy',
      label: 'Generate Remote-First Hook',
      query: `Lead is in a high-tech/WFH hub (${c.techDensity}% tech density). Craft an invite focusing on home office potential and broadband infrastructure.`,
      intent: 'STRATEGY'
    });
  }

  // 4. Default Strategy (Engagement)
  queries.push({
    id: 'conversion_path',
    label: 'Map Conversion Path',
    query: `Based on ${context.property.views} views and ${context.property.chatMinutes}m chat, predict the "Aha!" moment needed to trigger a Tour Request.`,
    intent: 'STRATEGY'
  });

  return queries.slice(0, 4);
}
