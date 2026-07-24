import { chooseWorkerForCommand, intelligenceWorkers, type IntelligenceWorker } from './workerRoster';
import { extractListingFacts, type ListingFacts } from './listingExtractor';

export type CommandIntent =
  | 'listing_analysis'
  | 'lead_followup'
  | 'lead_prioritization'
  | 'site_billing'
  | 'service_request'
  | 'comp_analysis'
  | 'seller_update'
  | 'market_update'
  | 'neighborhood_context'
  | 'agent_voice'
  | 'system_architecture'
  | 'general_ops';

export type CommandIntentClassification = {
  intent: CommandIntent;
  confidence: number;
  workerId: string;
  reason: string;
  requiresListingParse: boolean;
  requiresMemory: boolean;
  requiresAtlas: boolean;
  listingFacts?: ListingFacts;
};

export function classifyCommandIntent(command: string, selectedWorkerId?: string): CommandIntentClassification {
  const listingFacts = extractListingFacts(command);
  const lower = command.toLowerCase();
  const manualWorker = selectedWorkerId
    ? intelligenceWorkers.find((worker) => worker.id === selectedWorkerId)
    : undefined;

  const detected = detectIntent(lower, listingFacts);
  const routedWorker = manualWorker || workerForIntent(detected.intent) || chooseWorkerForCommand(command);
  const confidence = manualWorker
    ? Math.max(72, detected.confidence - 8)
    : detected.confidence;

  return {
    ...detected,
    confidence,
    workerId: routedWorker.id,
    requiresListingParse: listingFacts.isListingLike || detected.intent === 'listing_analysis',
    requiresMemory: detected.intent !== 'system_architecture',
    requiresAtlas: detected.intent !== 'lead_followup' || command.length > 240,
    listingFacts,
  };
}

function detectIntent(lower: string, listingFacts: ListingFacts): Pick<CommandIntentClassification, 'intent' | 'confidence' | 'reason'> {
  if (listingFacts.isListingLike) {
    return {
      intent: 'listing_analysis',
      confidence: Math.min(96, 72 + listingFacts.signalCount * 4),
      reason: `Detected ${listingFacts.signalCount} listing fields in pasted text.`,
    };
  }

  if (/\b(stripe|checkout|subscription|billing|past_due|canceled|trial|invoice|webhook)\b/.test(lower)) {
    return { intent: 'site_billing', confidence: 88, reason: 'Billing or Stripe terms detected.' };
  }

  if (/\b(311|service request|code concern|ccs|community vitality)\b/.test(lower)) {
    return { intent: 'service_request', confidence: 92, reason: 'Civic service request terms detected.' };
  }

  if (/\b(call first|lead priority|hot lead|rank.*lead|who to call)\b/.test(lower)) {
    return { intent: 'lead_prioritization', confidence: 86, reason: 'Lead prioritization language detected.' };
  }

  if (/\b(follow up|text lead|email buyer|message seller|rewrite|write note|chat note)\b/.test(lower)) {
    return { intent: 'lead_followup', confidence: 84, reason: 'Follow-up or message-writing language detected.' };
  }

  if (/\b(neighborhood|nearby|area|local business|commerce|restaurant|shops)\b/.test(lower)) {
    return { intent: 'neighborhood_context', confidence: 80, reason: 'Local context terms detected.' };
  }

  if (/\b(comps?|compare.*listing|valuation|price check)\b/.test(lower)) {
    return { intent: 'comp_analysis', confidence: 86, reason: 'Comp or valuation terms detected.' };
  }

  if (/\b(seller update|days on market|showing activity|price adjustment|listing performance)\b/.test(lower)) {
    return { intent: 'seller_update', confidence: 84, reason: 'Seller update or listing performance terms detected.' };
  }

  if (/\b(market movement|market shift|market velocity|trend)\b/.test(lower)) {
    return { intent: 'market_update', confidence: 82, reason: 'Market or pricing terms detected.' };
  }

  if (/\b(brand voice|tone|sound like me|style)\b/.test(lower)) {
    return { intent: 'agent_voice', confidence: 78, reason: 'Agent voice terms detected.' };
  }

  if (/\b(command center|architecture|workflow|langgraph|database|security|postgres|spatial)\b/.test(lower)) {
    return { intent: 'system_architecture', confidence: 82, reason: 'System architecture terms detected.' };
  }

  return { intent: 'general_ops', confidence: 64, reason: 'No strong specialist signal detected.' };
}

function workerForIntent(intent: CommandIntent): IntelligenceWorker | undefined {
  const workerIdByIntent: Record<CommandIntent, string> = {
    listing_analysis: 'listing-summary',
    lead_followup: 'follow-up-writer',
    lead_prioritization: 'lead-scoring',
    site_billing: 'pulse-architect',
    service_request: 'dallas-community',
    comp_analysis: 'comp-analysis',
    seller_update: 'seller-update',
    market_update: 'market-movement',
    neighborhood_context: 'neighborhood-explainer',
    agent_voice: 'agent-voice',
    system_architecture: 'pulse-architect',
    general_ops: 'follow-up-writer',
  };

  return intelligenceWorkers.find((worker) => worker.id === workerIdByIntent[intent]);
}
