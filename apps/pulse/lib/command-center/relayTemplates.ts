import type { IntelligenceWorker } from './workerRoster';

export type TahRelayTemplateId = string;
export type TahRelayMode = 'briefing' | 'slideshow' | 'puppetshow' | 'field-board' | 'script';

export type TahRelayFormat = {
  mode: TahRelayMode;
  name: string;
  useWhen: string;
  frameLabel: string;
  rhythm: string;
  visualDirection: string;
  outputContract: string[];
};

export type TahRelayTemplate = {
  id: TahRelayTemplateId;
  name: string;
  category: 'agent' | 'market' | 'place' | 'deal' | 'technical' | 'learning' | 'safety' | 'system';
  sourceTah: string[];
  purpose: string;
  visual: {
    motif: string;
    layout: string;
    cues: string[];
  };
  words: {
    voice: string;
    explanationMoves: string[];
    avoid: string[];
  };
  sections: string[];
};

export type TahRelayPlan = {
  templateId: TahRelayTemplateId;
  templateName: string;
  mode: TahRelayMode;
  purpose: string;
  visual: TahRelayTemplate['visual'];
  words: TahRelayTemplate['words'];
  format: TahRelayFormat;
  sourceTah: string[];
  availableFormats: Array<{
    mode: TahRelayMode;
    name: string;
    useWhen: string;
  }>;
  sections: Array<{
    label: string;
    instruction: string;
  }>;
  finalScreen: {
    title: string;
    frameLabel: string;
    instruction: string;
    sourceCards: Array<{
      source: string;
      concepts: string[];
      matchReason: string;
    }>;
    learned: string[];
  };
  sourceAnchors: string[];
};

const relayFormats: Record<TahRelayMode, TahRelayFormat> = {
  briefing: {
    mode: 'briefing',
    name: 'Briefing Card',
    useWhen: 'Fast agent decision support inside the command center.',
    frameLabel: 'Brief',
    rhythm: 'Signal, meaning, action, caveat.',
    visualDirection: 'Use one compact panel with source chips, a confidence readout, and action bullets.',
    outputContract: ['One-sentence signal', 'Two to four bullets', 'One recommended next action', 'One caveat or verification note']
  },
  slideshow: {
    mode: 'slideshow',
    name: 'Slideshow Deck',
    useWhen: 'The agent needs to explain TAH findings to a client, seller, buyer, or team.',
    frameLabel: 'Slide',
    rhythm: 'Title slide, context slide, evidence slide, recommendation slide, caveat slide.',
    visualDirection: 'Use slide cards with one idea per frame, strong headings, large visual anchors, and minimal text.',
    outputContract: ['Slide title', 'Visual direction', 'Speaker note', 'TAH source anchor']
  },
  puppetshow: {
    mode: 'puppetshow',
    name: 'Puppetshow Explainer',
    useWhen: 'The robot should teach through characters, back-and-forth dialogue, or a memorable scene.',
    frameLabel: 'Scene',
    rhythm: 'Set the situation, let the guide explain, let the skeptic ask, close with the useful move.',
    visualDirection: 'Use simple staged scenes, character labels, prop-like data cards, and clear dialogue beats.',
    outputContract: ['Scene setup', 'Guide line', 'Skeptic question', 'TAH-backed answer', 'Takeaway']
  },
  'field-board': {
    mode: 'field-board',
    name: 'Field Board',
    useWhen: 'The agent needs a spatial, tactical, or map-like readout of the context.',
    frameLabel: 'Zone',
    rhythm: 'Anchor, cluster, risk, route.',
    visualDirection: 'Use map pins, lanes, zones, badges, and grouped signals instead of paragraph explanation.',
    outputContract: ['Board zone', 'Signal cluster', 'What it means', 'Verification marker']
  },
  script: {
    mode: 'script',
    name: 'Talk Track Script',
    useWhen: 'The output should become words the agent can say, text, email, or record.',
    frameLabel: 'Line',
    rhythm: 'Open, explain, soften, ask.',
    visualDirection: 'Use a script card with tone badges, pauses, and alternate lines.',
    outputContract: ['Primary line', 'Tone note', 'Optional softer line', 'Next question']
  }
};

type TemplateInput = Omit<TahRelayTemplate, 'visual' | 'words'> & {
  motif: string;
  layout: string;
  cues: string[];
  voice: string;
  moves: string[];
  avoid: string[];
};

function template(input: TemplateInput): TahRelayTemplate {
  return {
    id: input.id,
    name: input.name,
    category: input.category,
    sourceTah: input.sourceTah,
    purpose: input.purpose,
    visual: {
      motif: input.motif,
      layout: input.layout,
      cues: input.cues
    },
    words: {
      voice: input.voice,
      explanationMoves: input.moves,
      avoid: input.avoid
    },
    sections: input.sections
  };
}

const relayTemplateList: TahRelayTemplate[] = [
  template({
    id: 'lead-priority-board',
    name: 'Lead Priority Board',
    category: 'agent',
    sourceTah: ['lead_history.tah', 'market_rules.tah', 'agent_brand.tah'],
    purpose: 'Turn lead-history shards into a ranked call or text order.',
    motif: 'Stacked priority lanes',
    layout: 'Hot, warm, nurture lanes with a compact reason badge on each lead.',
    cues: ['urgency badge', 'last-touch timestamp', 'best-channel chip'],
    voice: 'Decisive, short, and action-first.',
    moves: ['Rank the strongest signal first.', 'Explain the reason in one sentence.', 'Give the exact next contact angle.'],
    avoid: ['Invented lead facts', 'long CRM analysis', 'pushy sales wording'],
    sections: ['Call first', 'Why this lead', 'Message angle', 'Missing data']
  }),
  template({
    id: 'intent-thermometer',
    name: 'Intent Thermometer',
    category: 'agent',
    sourceTah: ['lead_history.tah', 'objection_scripts.tah'],
    purpose: 'Show how strong a buyer or seller intent signal appears.',
    motif: 'Temperature scale',
    layout: 'Cool, warm, hot scale with evidence ticks from lead-history shards.',
    cues: ['timing tick', 'motivation tick', 'blocker tick'],
    voice: 'Diagnostic and calm.',
    moves: ['Name the intent level.', 'Quote the type of signal, not private invented details.', 'Ask the next qualifying question.'],
    avoid: ['certainty about motive', 'pressure language', 'unsupported urgency'],
    sections: ['Intent level', 'Evidence signals', 'Likely blocker', 'Next question']
  }),
  template({
    id: 'pipeline-triage-grid',
    name: 'Pipeline Triage Grid',
    category: 'agent',
    sourceTah: ['lead_history.tah'],
    purpose: 'Group leads by next useful action so the agent can work the pipeline quickly.',
    motif: 'Triage grid',
    layout: 'Four quadrants for call, text, nurture, and wait.',
    cues: ['action quadrant', 'freshness dot', 'missing-info marker'],
    voice: 'Operational and fast.',
    moves: ['Sort by next action.', 'Name the evidence.', 'Make the next move obvious.'],
    avoid: ['full CRM summaries', 'guessing lead details', 'multiple next steps per lead'],
    sections: ['Call', 'Text', 'Nurture', 'Wait']
  }),
  template({
    id: 'reengagement-ladder',
    name: 'Re-Engagement Ladder',
    category: 'agent',
    sourceTah: ['lead_history.tah', 'agent_brand.tah'],
    purpose: 'Create a gentle progression for waking up stale leads.',
    motif: 'Step ladder',
    layout: 'Low-pressure steps from useful check-in to clear CTA.',
    cues: ['soft open', 'value offer', 'permission ask'],
    voice: 'Patient and helpful.',
    moves: ['Start with value.', 'Reduce friction.', 'Ask for one small response.'],
    avoid: ['guilt wording', 'fake urgency', 'aggressive follow-up'],
    sections: ['Soft open', 'Useful reason', 'Simple ask', 'Stop condition']
  }),
  template({
    id: 'call-blitz-queue',
    name: 'Call Blitz Queue',
    category: 'agent',
    sourceTah: ['lead_history.tah', 'agent_brand.tah'],
    purpose: 'Convert lead context into a timed call block for the agent.',
    motif: 'Call queue',
    layout: 'Ordered queue with opening line and fallback text.',
    cues: ['call order', 'opening line', 'fallback text'],
    voice: 'Direct and ready-to-use.',
    moves: ['Choose the first call.', 'Give a talk track.', 'Prepare the fallback.'],
    avoid: ['too many scripts', 'unsupported lead assumptions', 'rambling openers'],
    sections: ['Queue', 'Opening line', 'Fallback text', 'Log note']
  }),
  template({
    id: 'message-card',
    name: 'Message Card',
    category: 'agent',
    sourceTah: ['agent_brand.tah', 'lead_history.tah', 'objection_scripts.tah'],
    purpose: 'Turn TAH context into a sendable text, email, or call note.',
    motif: 'Client-ready message card',
    layout: 'One polished message with a small rationale strip below it.',
    cues: ['tone badge', 'CTA chip', 'grounding source'],
    voice: 'Natural, brief, and agent-branded.',
    moves: ['Write the message first.', 'Explain why this angle fits.', 'Offer one alternate if the tone needs softening.'],
    avoid: ['AI disclaimers', 'too many asks', 'generic follow-up language'],
    sections: ['Send this', 'Why it works', 'Softer version', 'Do not say']
  }),
  template({
    id: 'agent-voice-mirror',
    name: 'Agent Voice Mirror',
    category: 'agent',
    sourceTah: ['agent_brand.tah'],
    purpose: 'Reflect the agent brand rules back as a writing style guide.',
    motif: 'Voice mirror',
    layout: 'Tone traits on one side and example phrasing on the other.',
    cues: ['tone trait', 'phrase swap', 'CTA marker'],
    voice: 'Crisp, local, and human.',
    moves: ['Name the style.', 'Show the rewrite.', 'Explain the tone choice.'],
    avoid: ['generic assistant voice', 'overwriting facts', 'brand exaggeration'],
    sections: ['Voice traits', 'Rewrite', 'Why it fits', 'CTA']
  }),
  template({
    id: 'cta-polisher',
    name: 'CTA Polisher',
    category: 'agent',
    sourceTah: ['agent_brand.tah'],
    purpose: 'Turn vague closers into one natural next step.',
    motif: 'CTA chip tray',
    layout: 'Three CTA options ranked by friction.',
    cues: ['low-friction ask', 'direct ask', 'calendar ask'],
    voice: 'Clean and practical.',
    moves: ['Preserve intent.', 'Pick one ask.', 'Make the ask easy to answer.'],
    avoid: ['multiple CTAs', 'sales pressure', 'unclear asks'],
    sections: ['Best CTA', 'Softer CTA', 'Direct CTA', 'When to use']
  }),
  template({
    id: 'client-trust-lens',
    name: 'Client Trust Lens',
    category: 'agent',
    sourceTah: ['agent_brand.tah', 'market_rules.tah'],
    purpose: 'Check whether an explanation feels credible and client-safe.',
    motif: 'Trust lens',
    layout: 'Trust builders and trust breakers in parallel rows.',
    cues: ['specificity mark', 'source mark', 'overclaim warning'],
    voice: 'Protective and practical.',
    moves: ['Name the trust builder.', 'Spot weak language.', 'Offer stronger wording.'],
    avoid: ['unsupported certainty', 'vague reassurance', 'legal advice'],
    sections: ['Trust builders', 'Weak points', 'Safer wording', 'Source needed']
  }),
  template({
    id: 'social-caption-frame',
    name: 'Social Caption Frame',
    category: 'agent',
    sourceTah: ['agent_brand.tah', 'listing_context.tah', 'local_business_context.tah'],
    purpose: 'Convert a TAH-backed idea into short social copy.',
    motif: 'Caption frame',
    layout: 'Hook, local signal, short body, and comment CTA.',
    cues: ['hook badge', 'local proof', 'comment CTA'],
    voice: 'Conversational and specific.',
    moves: ['Start with a concrete hook.', 'Keep the local detail useful.', 'End with a light CTA.'],
    avoid: ['hashtag stuffing', 'generic luxury language', 'unsupported claims'],
    sections: ['Hook', 'Caption', 'CTA', 'Source note']
  }),
  template({
    id: 'listing-storyboard',
    name: 'Listing Storyboard',
    category: 'deal',
    sourceTah: ['listing_context.tah', 'agent_brand.tah', 'comps_context.tah'],
    purpose: 'Convert listing context into a property story and campaign angle.',
    motif: 'Three-panel campaign board',
    layout: 'Hook, proof, and client-facing copy panels.',
    cues: ['feature spotlight', 'missing-fact flag', 'buyer-use-case tag'],
    voice: 'Polished, concrete, and seller-safe.',
    moves: ['Lead with the strongest hook.', 'Tie each feature to buyer value.', 'Flag claims that need verification.'],
    avoid: ['fluffy adjectives', 'unsupported superlatives', 'overlong listing copy'],
    sections: ['Primary hook', 'Supporting proof', 'Safe blurb', 'Facts to verify']
  }),
  template({
    id: 'feature-proof-stack',
    name: 'Feature Proof Stack',
    category: 'deal',
    sourceTah: ['listing_context.tah'],
    purpose: 'Turn property features into proof-backed buyer value.',
    motif: 'Stacked feature cards',
    layout: 'Feature, buyer value, proof, and verification need.',
    cues: ['feature card', 'buyer value label', 'proof marker'],
    voice: 'Concrete and restrained.',
    moves: ['Name the feature.', 'Translate it to buyer value.', 'Flag missing proof.'],
    avoid: ['feature dumping', 'unsupported upgrade claims', 'vague lifestyle language'],
    sections: ['Feature', 'Buyer value', 'Proof', 'Verify']
  }),
  template({
    id: 'seller-update-card',
    name: 'Seller Update Card',
    category: 'deal',
    sourceTah: ['listing_context.tah', 'market_velocity.tah', 'comps_context.tah'],
    purpose: 'Explain listing performance to a seller in an actionable way.',
    motif: 'Seller dashboard card',
    layout: 'Activity, market signal, recommendation, and next check-in.',
    cues: ['activity meter', 'market marker', 'recommendation tag'],
    voice: 'Calm and professional.',
    moves: ['Start with what changed.', 'Tie it to the market.', 'Recommend one move.'],
    avoid: ['blame language', 'panic tone', 'unsupported market claims'],
    sections: ['Activity', 'Market read', 'Recommendation', 'Next check-in']
  }),
  template({
    id: 'showing-brief',
    name: 'Showing Brief',
    category: 'deal',
    sourceTah: ['listing_context.tah', 'neighborhood_context.tah'],
    purpose: 'Prepare an agent for a showing with talk points and watch-outs.',
    motif: 'Showing clipboard',
    layout: 'Highlights, questions, watch-outs, and follow-up angle.',
    cues: ['highlight check', 'buyer question', 'watch-out flag'],
    voice: 'Field-ready and concise.',
    moves: ['Lead with the strongest highlight.', 'Prepare useful questions.', 'Note risks.'],
    avoid: ['memorized speeches', 'unsupported facts', 'overly long notes'],
    sections: ['Highlights', 'Ask buyer', 'Watch-outs', 'Follow-up']
  }),
  template({
    id: 'campaign-hook-ladder',
    name: 'Campaign Hook Ladder',
    category: 'deal',
    sourceTah: ['listing_context.tah', 'local_business_context.tah', 'agent_brand.tah'],
    purpose: 'Generate multiple listing campaign angles from strongest to safest.',
    motif: 'Hook ladder',
    layout: 'Three hook tiers with proof and risk notes.',
    cues: ['bold hook', 'safe hook', 'proof rung'],
    voice: 'Creative but grounded.',
    moves: ['Offer options.', 'Rank by strength.', 'Mark safest claim.'],
    avoid: ['unsupported superlatives', 'clickbait', 'claims without facts'],
    sections: ['Bold hook', 'Balanced hook', 'Safe hook', 'Proof needed']
  }),
  template({
    id: 'offer-position-brief',
    name: 'Offer Position Brief',
    category: 'deal',
    sourceTah: ['comps_context.tah', 'texas_real_estate.tah', 'market_rules.tah'],
    purpose: 'Explain an offer posture using comps, risk, and terms.',
    motif: 'Offer position dial',
    layout: 'Price posture, terms, risk, and negotiation note.',
    cues: ['price dial', 'term lever', 'risk badge'],
    voice: 'Strategic and caveated.',
    moves: ['Separate price from terms.', 'Name confidence.', 'Recommend verification.'],
    avoid: ['legal advice', 'guaranteed acceptance', 'unsupported value claims'],
    sections: ['Price posture', 'Terms', 'Risks', 'Verify']
  }),
  template({
    id: 'repair-risk-board',
    name: 'Repair Risk Board',
    category: 'deal',
    sourceTah: ['listing_context.tah', 'market_rules.tah'],
    purpose: 'Organize known or suspected repair issues for agent review.',
    motif: 'Risk board',
    layout: 'Known facts, questions, specialist checks, and negotiation angle.',
    cues: ['known fact', 'question mark', 'specialist check'],
    voice: 'Careful and factual.',
    moves: ['Separate known from unknown.', 'Suggest who verifies.', 'Avoid diagnosis.'],
    avoid: ['inspection conclusions', 'cost guesses', 'definitive defect claims'],
    sections: ['Known', 'Unknown', 'Who verifies', 'Agent note']
  }),
  template({
    id: 'seller-net-explainer',
    name: 'Seller Net Explainer',
    category: 'deal',
    sourceTah: ['comps_context.tah', 'market_rules.tah'],
    purpose: 'Explain seller proceeds in a draft-safe way.',
    motif: 'Net sheet layers',
    layout: 'Gross price, costs to verify, scenarios, and caveats.',
    cues: ['scenario band', 'cost check', 'verify marker'],
    voice: 'Clear and non-advisory.',
    moves: ['Use scenarios.', 'Mark estimates.', 'Refer to closing/title professionals.'],
    avoid: ['tax advice', 'guaranteed net', 'unverified fees'],
    sections: ['Scenario', 'Costs', 'Net range', 'Verify']
  }),
  template({
    id: 'buyer-tour-route',
    name: 'Buyer Tour Route',
    category: 'deal',
    sourceTah: ['listing_context.tah', 'neighborhood_context.tah', 'local_business_context.tah'],
    purpose: 'Sequence showings into a coherent buyer tour story.',
    motif: 'Tour route map',
    layout: 'Stops, contrast point, neighborhood anchor, and follow-up question.',
    cues: ['stop marker', 'contrast badge', 'route note'],
    voice: 'Helpful and comparative.',
    moves: ['Create a route logic.', 'Compare tradeoffs.', 'End with buyer preference.'],
    avoid: ['too many properties', 'unsupported commute details', 'demographic claims'],
    sections: ['Route order', 'Compare', 'Local anchor', 'Question']
  }),
  template({
    id: 'comps-prism',
    name: 'Comps Prism',
    category: 'market',
    sourceTah: ['comps_context.tah', 'listing_context.tah', 'market_rules.tah'],
    purpose: 'Explain valuation or pricing through range, confidence, and risk.',
    motif: 'Price prism',
    layout: 'Price posture band with confidence and caveat markers.',
    cues: ['range band', 'confidence dial', 'stale-comp warning'],
    voice: 'Analytical, caveated, and client-safe.',
    moves: ['Separate price signal from confidence.', 'Name comp weaknesses.', 'Recommend the next verification step.'],
    avoid: ['appraisal language', 'guaranteed value', 'unverified sold data'],
    sections: ['Price posture', 'Best signal', 'Weaknesses', 'Verify next']
  }),
  template({
    id: 'market-signal-brief',
    name: 'Market Signal Brief',
    category: 'market',
    sourceTah: ['market_velocity.tah', 'comps_context.tah', 'neighborhood_context.tah'],
    purpose: 'Summarize market movement into talking points.',
    motif: 'Signal board',
    layout: 'Trend, evidence, caution, and client-language rows.',
    cues: ['trend arrow', 'signal/noise split', 'talking-point chip'],
    voice: 'Briefing-style and measured.',
    moves: ['Start with the clearest movement.', 'Separate observation from interpretation.', 'Give a client-safe line.'],
    avoid: ['market predictions', 'investment certainty', 'unsupported weekly stats'],
    sections: ['Movement', 'Evidence', 'Client line', 'Caution']
  }),
  template({
    id: 'inventory-pressure-gauge',
    name: 'Inventory Pressure Gauge',
    category: 'market',
    sourceTah: ['market_velocity.tah', 'comps_context.tah'],
    purpose: 'Explain whether inventory pressure favors buyers, sellers, or patience.',
    motif: 'Pressure gauge',
    layout: 'Supply, demand, speed, and negotiation posture.',
    cues: ['supply needle', 'demand needle', 'speed marker'],
    voice: 'Measured and comparative.',
    moves: ['Name the pressure.', 'Tie to observed activity.', 'Avoid prediction.'],
    avoid: ['future certainty', 'market hype', 'unsupported inventory stats'],
    sections: ['Supply', 'Demand', 'Speed', 'Posture']
  }),
  template({
    id: 'pricing-risk-ladder',
    name: 'Pricing Risk Ladder',
    category: 'market',
    sourceTah: ['comps_context.tah', 'market_rules.tah'],
    purpose: 'Show risk levels around pricing high, aligned, or aggressive.',
    motif: 'Risk ladder',
    layout: 'Pricing options with risk and evidence for each rung.',
    cues: ['safe rung', 'stretch rung', 'risk flag'],
    voice: 'Analytical and seller-safe.',
    moves: ['Offer ranges.', 'Explain risk.', 'Name verification.'],
    avoid: ['appraisal claims', 'guaranteed offers', 'pressure language'],
    sections: ['Aligned', 'Stretch', 'Risk', 'Verify']
  }),
  template({
    id: 'buyer-market-weather',
    name: 'Buyer Market Weather',
    category: 'market',
    sourceTah: ['market_velocity.tah', 'neighborhood_context.tah'],
    purpose: 'Explain market conditions as practical buyer weather.',
    motif: 'Weather map',
    layout: 'Headwinds, tailwinds, forecast caveat, and action.',
    cues: ['headwind icon', 'tailwind icon', 'caveat cloud'],
    voice: 'Accessible and careful.',
    moves: ['Use metaphor lightly.', 'Connect to action.', 'Avoid forecasting certainty.'],
    avoid: ['future prediction', 'fear language', 'unsupported stats'],
    sections: ['Headwinds', 'Tailwinds', 'Action', 'Caveat']
  }),
  template({
    id: 'seller-market-weather',
    name: 'Seller Market Weather',
    category: 'market',
    sourceTah: ['market_velocity.tah', 'comps_context.tah'],
    purpose: 'Explain seller-side market conditions in plain language.',
    motif: 'Seller weather map',
    layout: 'Demand heat, pricing clouds, showing winds, and next move.',
    cues: ['demand heat', 'pricing cloud', 'showing wind'],
    voice: 'Practical and calm.',
    moves: ['Name what helps.', 'Name what hurts.', 'Recommend one seller action.'],
    avoid: ['panic tone', 'guaranteed outcomes', 'unsupported days-on-market claims'],
    sections: ['Helpful signal', 'Friction', 'Next move', 'Check source']
  }),
  template({
    id: 'neighborhood-field-guide',
    name: 'Neighborhood Field Guide',
    category: 'place',
    sourceTah: ['neighborhood_context.tah', 'local_business_context.tah', 'market_rules.tah'],
    purpose: 'Explain area context through practical, buyer-safe local signals.',
    motif: 'Field guide map legend',
    layout: 'Local anchors grouped by daily-life category, not demographics.',
    cues: ['commerce pin', 'commute route', 'verification marker'],
    voice: 'Useful, grounded, and careful.',
    moves: ['Explain the area through practical context.', 'Separate verified facts from check-next items.', 'Close with a client-safe phrasing option.'],
    avoid: ['demographic claims', 'safety promises', 'unsupported school quality claims'],
    sections: ['Area read', 'Nearby anchors', 'Buyer-safe language', 'Verify next']
  }),
  template({
    id: 'local-map-legend',
    name: 'Local Map Legend',
    category: 'place',
    sourceTah: ['local_business_context.tah', 'neighborhood_context.tah'],
    purpose: 'Present nearby business and community context as a practical legend.',
    motif: 'Map pins and legend',
    layout: 'Commerce, services, parks, and routine anchors in grouped rows.',
    cues: ['shop pin', 'service pin', 'routine anchor'],
    voice: 'Specific but cautious.',
    moves: ['Group anchors by buyer usefulness.', 'Avoid exact claims when not sourced.', 'Explain how each anchor supports the property story.'],
    avoid: ['fake distances', 'ratings without source', 'claiming a business is currently open'],
    sections: ['Local anchors', 'Why they matter', 'Story sentence', 'Verify next']
  }),
  template({
    id: 'relocation-compass',
    name: 'Relocation Compass',
    category: 'place',
    sourceTah: ['neighborhood_context.tah', 'texas_place_history.tah'],
    purpose: 'Orient relocating buyers without overclaiming local knowledge.',
    motif: 'Compass rose',
    layout: 'Orientation points for commute, services, housing style, and unknowns.',
    cues: ['north-star need', 'route marker', 'unknown marker'],
    voice: 'Welcoming and grounded.',
    moves: ['Orient by practical needs.', 'Name what to verify.', 'Invite preferences.'],
    avoid: ['demographics', 'safety promises', 'school ranking claims'],
    sections: ['Orientation', 'Daily life', 'Tradeoffs', 'Verify']
  }),
  template({
    id: 'amenity-cluster-board',
    name: 'Amenity Cluster Board',
    category: 'place',
    sourceTah: ['local_business_context.tah', 'neighborhood_context.tah'],
    purpose: 'Group nearby amenities by usefulness instead of listing them randomly.',
    motif: 'Cluster board',
    layout: 'Grocery, food, services, outdoors, and transit clusters.',
    cues: ['cluster label', 'anchor pin', 'verify distance'],
    voice: 'Organized and buyer-useful.',
    moves: ['Group by routine.', 'Tie to buyer use.', 'Flag verification.'],
    avoid: ['fake distances', 'ratings', 'unsupported open/closed status'],
    sections: ['Routine', 'Errands', 'Lifestyle', 'Verify']
  }),
  template({
    id: 'commute-tradeoff-map',
    name: 'Commute Tradeoff Map',
    category: 'place',
    sourceTah: ['neighborhood_context.tah'],
    purpose: 'Explain commute and access tradeoffs in a safe way.',
    motif: 'Route tradeoff map',
    layout: 'Access routes, friction points, and questions to ask.',
    cues: ['route chip', 'friction marker', 'buyer question'],
    voice: 'Useful and non-definitive.',
    moves: ['Frame access, not guarantees.', 'Ask for actual commute target.', 'Recommend map verification.'],
    avoid: ['exact commute promises', 'traffic certainty', 'unsupported walkability claims'],
    sections: ['Access', 'Friction', 'Ask buyer', 'Verify route']
  }),
  template({
    id: 'weekend-routine-reel',
    name: 'Weekend Routine Reel',
    category: 'place',
    sourceTah: ['local_business_context.tah', 'agent_brand.tah'],
    purpose: 'Turn local commerce context into an easy lifestyle reel outline.',
    motif: 'Routine reel frames',
    layout: 'Morning, errand, afternoon, evening frames.',
    cues: ['routine frame', 'local anchor', 'verify tag'],
    voice: 'Light, specific, and safe.',
    moves: ['Make it visual.', 'Avoid claiming exact behavior.', 'Ground each frame in local anchors.'],
    avoid: ['demographic assumptions', 'fake business details', 'overly polished copy'],
    sections: ['Morning', 'Errand', 'Afternoon', 'Evening']
  }),
  template({
    id: 'small-business-spotlight',
    name: 'Small Business Spotlight',
    category: 'place',
    sourceTah: ['local_business_context.tah'],
    purpose: 'Frame local businesses as community context without overclaiming.',
    motif: 'Spotlight card',
    layout: 'Business type, why it matters, verification, story use.',
    cues: ['spotlight', 'category chip', 'verification note'],
    voice: 'Neighborly and cautious.',
    moves: ['Mention category first.', 'Explain relevance.', 'Mark details to verify.'],
    avoid: ['ownership claims', 'ratings', 'current hours unless sourced'],
    sections: ['Anchor', 'Why it matters', 'Story use', 'Verify']
  }),
  template({
    id: 'dallas-community-pulse',
    name: 'Dallas Community Pulse',
    category: 'place',
    sourceTah: ['dallas_community_intel.tah', 'neighborhood_context.tah'],
    purpose: 'Relay Dallas-area community context as practical local intelligence.',
    motif: 'Community pulse',
    layout: 'Signals, anchors, cautions, and client-safe line.',
    cues: ['pulse marker', 'local anchor', 'safe-language badge'],
    voice: 'Local and careful.',
    moves: ['Use concrete signals.', 'Avoid population claims.', 'Offer safe phrasing.'],
    avoid: ['protected-class language', 'safety promises', 'unsupported rankings'],
    sections: ['Signal', 'Anchor', 'Safe line', 'Verify']
  }),
  template({
    id: 'dallas-safety-framing',
    name: 'Dallas Safety Framing',
    category: 'safety',
    sourceTah: ['dallas_safety_intel.tah', 'market_rules.tah'],
    purpose: 'Handle safety-related questions without making prohibited promises.',
    motif: 'Safety framing checklist',
    layout: 'Question, official source, safe wording, escalation.',
    cues: ['official-source marker', 'do-not-claim flag', 'safe wording'],
    voice: 'Careful and source-forward.',
    moves: ['Do not answer with assurances.', 'Point to official sources.', 'Use neutral wording.'],
    avoid: ['safe/unsafe labels', 'crime predictions', 'steering language'],
    sections: ['Question', 'Official source', 'Safe wording', 'Escalate']
  }),
  template({
    id: 'fair-housing-redline',
    name: 'Fair Housing Redline',
    category: 'safety',
    sourceTah: ['market_rules.tah', 'texas_real_estate.tah'],
    purpose: 'Review language for fair-housing risk and safer alternatives.',
    motif: 'Redline checklist',
    layout: 'Risk phrase, why risky, replacement wording, source note.',
    cues: ['risk phrase', 'replacement line', 'source badge'],
    voice: 'Direct and protective.',
    moves: ['Identify the risk.', 'Explain briefly.', 'Replace with neutral language.'],
    avoid: ['legal advice', 'vague warnings', 'leaving no alternative'],
    sections: ['Risk', 'Why', 'Replacement', 'Source']
  }),
  template({
    id: 'supervisor-redline',
    name: 'Supervisor Redline',
    category: 'safety',
    sourceTah: ['market_rules.tah', 'agent_brand.tah'],
    purpose: 'Review a draft for support, risk, and brand fit.',
    motif: 'Pass or revise checklist',
    layout: 'Green pass items and amber revise items with replacement wording.',
    cues: ['risk flag', 'source check', 'safer wording'],
    voice: 'Direct and protective.',
    moves: ['State pass or revise.', 'Name the exact risk.', 'Provide safer wording.'],
    avoid: ['vague compliance warnings', 'legal advice', 'unactionable criticism'],
    sections: ['Pass/revise', 'Risk', 'Safer wording', 'Source needed']
  }),
  template({
    id: 'market-rules-check',
    name: 'Market Rules Check',
    category: 'safety',
    sourceTah: ['market_rules.tah'],
    purpose: 'Apply command-center safety rules before output goes to a client.',
    motif: 'Rules gate',
    layout: 'Allowed, revise, verify, and do-not-say columns.',
    cues: ['allowed check', 'revise flag', 'verify marker'],
    voice: 'Firm and concise.',
    moves: ['Check the claim.', 'Name the rule.', 'Offer safer wording.'],
    avoid: ['long policy lectures', 'legal conclusion', 'unsupported claims'],
    sections: ['Allowed', 'Revise', 'Verify', 'Do not say']
  }),
  template({
    id: 'medical-caution-card',
    name: 'Medical Caution Card',
    category: 'safety',
    sourceTah: ['medical_encyclopedia.tah', 'market_rules.tah'],
    purpose: 'Prevent non-medical workflows from presenting medical facts as advice.',
    motif: 'Caution card',
    layout: 'General info, risk, professional referral, and safe wording.',
    cues: ['general-info label', 'referral badge', 'risk flag'],
    voice: 'Careful and non-diagnostic.',
    moves: ['Avoid diagnosis.', 'Keep to general info.', 'Recommend professional guidance.'],
    avoid: ['medical advice', 'diagnosis', 'treatment instructions'],
    sections: ['General info', 'Risk', 'Referral', 'Safe wording']
  }),
  template({
    id: 'objection-bridge',
    name: 'Objection Bridge',
    category: 'agent',
    sourceTah: ['objection_scripts.tah', 'agent_brand.tah', 'lead_history.tah'],
    purpose: 'Turn client pushback into an advisory response and next question.',
    motif: 'Concern to next step bridge',
    layout: 'Concern, empathy, evidence, option, and question nodes.',
    cues: ['concern node', 'evidence bridge', 'next-question marker'],
    voice: 'Calm, advisory, and non-pushy.',
    moves: ['Acknowledge the concern.', 'Clarify the decision underneath it.', 'Offer one practical next step.'],
    avoid: ['arguing', 'dismissing the concern', 'overpromising outcomes'],
    sections: ['What they mean', 'Say this', 'Option to offer', 'Next question']
  }),
  template({
    id: 'tarrant-deed-trace',
    name: 'Tarrant Deed Trace',
    category: 'deal',
    sourceTah: ['tarrant_deeds.tah', 'texas_real_estate.tah'],
    purpose: 'Explain deed or county-record context as a verification trail.',
    motif: 'Record trace',
    layout: 'Record clue, meaning, limitation, and official lookup.',
    cues: ['record clue', 'county source', 'limitation flag'],
    voice: 'Factual and cautious.',
    moves: ['Name the record clue.', 'Explain what it may mean.', 'Send to official verification.'],
    avoid: ['title opinions', 'ownership certainty', 'legal advice'],
    sections: ['Record clue', 'Meaning', 'Limitation', 'Verify']
  }),
  template({
    id: 'texas-contract-brief',
    name: 'Texas Contract Brief',
    category: 'deal',
    sourceTah: ['texas_contracts_expertise.tah', 'market_rules.tah'],
    purpose: 'Summarize contract-related context without giving legal advice.',
    motif: 'Contract brief',
    layout: 'Clause topic, agent note, risk, and professional review.',
    cues: ['clause tag', 'risk flag', 'review marker'],
    voice: 'Precise and careful.',
    moves: ['Name the contract topic.', 'Explain operational impact.', 'Refer legal questions.'],
    avoid: ['legal interpretation', 'guaranteed outcomes', 'unsupported contract advice'],
    sections: ['Topic', 'Agent note', 'Risk', 'Review']
  }),
  template({
    id: 'architecture-map',
    name: 'Architecture Map',
    category: 'technical',
    sourceTah: ['architecture.tah', 'architecture.hat'],
    purpose: 'Explain system architecture as components and flows.',
    motif: 'Architecture blueprint',
    layout: 'Nodes, edges, boundaries, and failure points.',
    cues: ['component node', 'data flow', 'boundary line'],
    voice: 'Structured and technical.',
    moves: ['Name components.', 'Trace flow.', 'Mark risk or dependency.'],
    avoid: ['implementation guessing', 'unscoped refactors', 'hand-wavy diagrams'],
    sections: ['Components', 'Flow', 'Boundary', 'Risk']
  }),
  template({
    id: 'runtime-matrix',
    name: 'Runtime Matrix',
    category: 'technical',
    sourceTah: ['sunset_wars_runtime_matrix.tah', 'operatingSystem.tah'],
    purpose: 'Compare runtime paths, constraints, and tradeoffs.',
    motif: 'Runtime grid',
    layout: 'Rows for runtime lanes and columns for strengths, costs, risks.',
    cues: ['runtime lane', 'cost cell', 'risk cell'],
    voice: 'Comparative and exact.',
    moves: ['Compare lanes.', 'Name constraints.', 'Recommend a path.'],
    avoid: ['one-size-fits-all answers', 'missing constraints', 'unverified performance claims'],
    sections: ['Lane', 'Strength', 'Risk', 'Recommendation']
  }),
  template({
    id: 'algorithm-walkthrough',
    name: 'Algorithm Walkthrough',
    category: 'technical',
    sourceTah: ['algorithms.tah'],
    purpose: 'Teach an algorithm as steps, state, and complexity.',
    motif: 'Step trace',
    layout: 'Input, state transitions, output, complexity.',
    cues: ['step marker', 'state box', 'complexity badge'],
    voice: 'Clear and instructional.',
    moves: ['Show the input.', 'Walk state changes.', 'End with complexity.'],
    avoid: ['code dumps first', 'skipping invariants', 'wrong big-O claims'],
    sections: ['Input', 'Steps', 'Invariant', 'Complexity']
  }),
  template({
    id: 'compiler-pipeline-show',
    name: 'Compiler Pipeline Show',
    category: 'technical',
    sourceTah: ['compilers.tah'],
    purpose: 'Explain compiler ideas as a staged pipeline.',
    motif: 'Compiler conveyor',
    layout: 'Source, tokens, AST, IR, optimization, output.',
    cues: ['token bucket', 'AST tree', 'IR card'],
    voice: 'Teacherly and precise.',
    moves: ['Move one artifact through stages.', 'Name transformations.', 'Show why each stage exists.'],
    avoid: ['abstract-only explanation', 'missing examples', 'wrong terminology'],
    sections: ['Source', 'Parse', 'Transform', 'Emit']
  }),
  template({
    id: 'cpp-memory-map',
    name: 'C++ Memory Map',
    category: 'technical',
    sourceTah: ['cPlus.tah', 'operatingSystem.tah'],
    purpose: 'Explain C++ concepts through memory ownership and lifetime.',
    motif: 'Memory map',
    layout: 'Stack, heap, owner, reference, destructor lanes.',
    cues: ['owner badge', 'lifetime bracket', 'dangling warning'],
    voice: 'Precise and warning-aware.',
    moves: ['Show ownership.', 'Trace lifetime.', 'Call out risk.'],
    avoid: ['unsafe examples without warning', 'vague memory talk', 'missing lifetime notes'],
    sections: ['Object', 'Owner', 'Lifetime', 'Risk']
  }),
  template({
    id: 'python-core-recipe',
    name: 'Python Core Recipe',
    category: 'technical',
    sourceTah: ['python_core.tah'],
    purpose: 'Explain Python concepts as practical recipes.',
    motif: 'Recipe card',
    layout: 'Use case, pattern, code shape, pitfall.',
    cues: ['use-case label', 'code shape', 'pitfall note'],
    voice: 'Practical and friendly.',
    moves: ['Start with use case.', 'Show minimal pattern.', 'Name pitfall.'],
    avoid: ['overbuilt abstractions', 'unexplained magic', 'version assumptions'],
    sections: ['Use case', 'Pattern', 'Example shape', 'Pitfall']
  }),
  template({
    id: 'data-design-canvas',
    name: 'Data Design Canvas',
    category: 'technical',
    sourceTah: ['dataDesign.tah', 'postgres_mastery.tah'],
    purpose: 'Explain data models as entities, relationships, and access paths.',
    motif: 'Data canvas',
    layout: 'Entity cards, relationship lines, query paths, constraints.',
    cues: ['entity card', 'relationship line', 'index marker'],
    voice: 'Systematic and pragmatic.',
    moves: ['Name entities.', 'Draw relationships.', 'Explain query path.'],
    avoid: ['premature normalization', 'missing constraints', 'schema guessing'],
    sections: ['Entities', 'Relationships', 'Queries', 'Constraints']
  }),
  template({
    id: 'deep-learning-layers',
    name: 'Deep Learning Layers',
    category: 'technical',
    sourceTah: ['deepLearning.tah'],
    purpose: 'Explain neural-network concepts through layers and signals.',
    motif: 'Layer stack',
    layout: 'Input, hidden layers, loss, update, output.',
    cues: ['activation node', 'loss marker', 'gradient arrow'],
    voice: 'Intuitive and mathematically careful.',
    moves: ['Start with signal flow.', 'Name the objective.', 'Explain update.'],
    avoid: ['AI mysticism', 'wrong math shortcuts', 'unsupported capability claims'],
    sections: ['Input', 'Layers', 'Learning signal', 'Output']
  }),
  template({
    id: 'category-theory-morphism',
    name: 'Category Theory Morphism',
    category: 'learning',
    sourceTah: ['categoryTheory.tah'],
    purpose: 'Explain abstract category theory through arrows and composition.',
    motif: 'Arrow diagram',
    layout: 'Objects, morphisms, composition, identity.',
    cues: ['object dot', 'arrow label', 'composition path'],
    voice: 'Patient and precise.',
    moves: ['Name objects.', 'Trace arrows.', 'Explain composition.'],
    avoid: ['symbol overload', 'unmotivated abstraction', 'hand-wavy equivalences'],
    sections: ['Objects', 'Arrows', 'Composition', 'Why it matters']
  }),
  template({
    id: 'sicp-environment-frame',
    name: 'SICP Environment Frame',
    category: 'learning',
    sourceTah: ['sicp.tah', 'sicp_expert.tah'],
    purpose: 'Explain computation through environment frames and evaluation.',
    motif: 'Environment frames',
    layout: 'Expression, frame, binding, result.',
    cues: ['frame box', 'binding arrow', 'result marker'],
    voice: 'Careful and exploratory.',
    moves: ['Show the expression.', 'Trace the environment.', 'Explain the result.'],
    avoid: ['skipping substitution details', 'too much notation', 'unstated assumptions'],
    sections: ['Expression', 'Frame', 'Binding', 'Result']
  }),
  template({
    id: 'little-schemer-dialogue',
    name: 'Little Schemer Dialogue',
    category: 'learning',
    sourceTah: ['theLittleSchemer.tah'],
    purpose: 'Teach recursive thinking through question-and-answer dialogue.',
    motif: 'Question dialogue',
    layout: 'Question, guess, recursive turn, answer.',
    cues: ['question card', 'recursive step', 'base-case bell'],
    voice: 'Playful and Socratic.',
    moves: ['Ask a tiny question.', 'Expose the base case.', 'Repeat the recursive shape.'],
    avoid: ['large leaps', 'too much code', 'missing base cases'],
    sections: ['Question', 'Base case', 'Recursive step', 'Answer']
  }),
  template({
    id: 'unix-pipeline-art',
    name: 'Unix Pipeline Art',
    category: 'technical',
    sourceTah: ['unixArt.tah', 'operatingSystem.tah'],
    purpose: 'Explain Unix-like workflows as composable pipes.',
    motif: 'Pipeline diagram',
    layout: 'Input stream, filter stages, output stream, failure point.',
    cues: ['pipe', 'filter block', 'exit-status marker'],
    voice: 'Concise and tool-minded.',
    moves: ['Start from input.', 'Show each filter.', 'Explain output.'],
    avoid: ['unsafe shell commands', 'opaque one-liners', 'missing failure modes'],
    sections: ['Input', 'Filters', 'Output', 'Failure mode']
  }),
  template({
    id: 'operating-system-scheduler',
    name: 'Operating System Scheduler',
    category: 'technical',
    sourceTah: ['operatingSystem.tah', 'operatingSystem_concept.tah'],
    purpose: 'Explain OS scheduling and resource management visually.',
    motif: 'Scheduler timeline',
    layout: 'Processes, queues, CPU slices, wait states.',
    cues: ['process lane', 'time slice', 'wait marker'],
    voice: 'Mechanical and clear.',
    moves: ['Name the resource.', 'Show queue behavior.', 'Explain tradeoff.'],
    avoid: ['incorrect OS internals', 'missing tradeoffs', 'overcomplicated diagrams'],
    sections: ['Processes', 'Queue', 'Scheduling choice', 'Tradeoff']
  }),
  template({
    id: 'recursive-link-walk',
    name: 'Recursive Link Walk',
    category: 'technical',
    sourceTah: ['operatingSystem_recursive.tah', 'operatingSystem_links.tah'],
    purpose: 'Explain linked concepts as recursive traversal.',
    motif: 'Recursive link path',
    layout: 'Root concept, child links, stop condition, summary.',
    cues: ['root node', 'link edge', 'stop sign'],
    voice: 'Methodical and visual.',
    moves: ['Start at the root.', 'Follow one link at a time.', 'Stop with a rule.'],
    avoid: ['infinite expansion', 'missing base case', 'unranked links'],
    sections: ['Root', 'Links', 'Stop rule', 'Summary']
  }),
  template({
    id: 'rasterizer-stage-show',
    name: 'Rasterizer Stage Show',
    category: 'technical',
    sourceTah: ['re_rasterizer.tah', 're_rasterizer.hat'],
    purpose: 'Explain graphics or rasterization as a staged visual pipeline.',
    motif: 'Raster stage',
    layout: 'Geometry, projection, pixels, shading, output.',
    cues: ['geometry card', 'pixel grid', 'shader note'],
    voice: 'Visual and precise.',
    moves: ['Trace the object.', 'Show conversion to pixels.', 'Name artifacts.'],
    avoid: ['purely abstract graphics talk', 'missing coordinate systems', 'unsupported performance claims'],
    sections: ['Geometry', 'Projection', 'Pixels', 'Artifacts']
  }),
  template({
    id: 'security-threat-board',
    name: 'Security Threat Board',
    category: 'technical',
    sourceTah: ['security_architect.tah', 'market_rules.tah'],
    purpose: 'Explain a technical or product risk as threat, control, and residual risk.',
    motif: 'Threat board',
    layout: 'Asset, threat, control, residual risk.',
    cues: ['asset badge', 'threat flag', 'control shield'],
    voice: 'Clear and risk-aware.',
    moves: ['Name asset.', 'Name threat.', 'Recommend control.'],
    avoid: ['security theater', 'unverified vulnerabilities', 'fear language'],
    sections: ['Asset', 'Threat', 'Control', 'Residual risk']
  }),
  template({
    id: 'postgres-query-plan',
    name: 'Postgres Query Plan',
    category: 'technical',
    sourceTah: ['postgres_mastery.tah', 'dataDesign.tah'],
    purpose: 'Explain database behavior through query plan concepts.',
    motif: 'Query plan tree',
    layout: 'Scan, join, filter, sort, output.',
    cues: ['scan node', 'join node', 'index hint'],
    voice: 'Practical and performance-minded.',
    moves: ['Name the access path.', 'Explain bottleneck.', 'Recommend measurement.'],
    avoid: ['index guessing without workload', 'premature tuning', 'ignoring data size'],
    sections: ['Access path', 'Bottleneck', 'Index thought', 'Measure']
  }),
  template({
    id: 'spatial-computing-scene',
    name: 'Spatial Computing Scene',
    category: 'technical',
    sourceTah: ['spatial_computing.tah'],
    purpose: 'Explain spatial UI or 3D context through scene composition.',
    motif: 'Spatial scene board',
    layout: 'User, object, space, interaction, feedback.',
    cues: ['user anchor', 'object volume', 'interaction ray'],
    voice: 'Visual and embodied.',
    moves: ['Place the user.', 'Place the object.', 'Explain interaction.'],
    avoid: ['flat UI assumptions', 'ambiguous scale', 'unverified hardware claims'],
    sections: ['User', 'Object', 'Interaction', 'Feedback']
  }),
  template({
    id: 'sunset-pulse-command-map',
    name: 'Sunset Pulse Command Map',
    category: 'system',
    sourceTah: ['sunset_pulse.tah', 'sunset_pulse_expertise.tah'],
    purpose: 'Explain Sunset Pulse product behavior as command lanes.',
    motif: 'Command map',
    layout: 'Command, route, worker, TAH context, result.',
    cues: ['command lane', 'worker badge', 'TAH source'],
    voice: 'Product-clear and operator-friendly.',
    moves: ['Name command.', 'Show route.', 'Tie output to source.'],
    avoid: ['marketing fluff', 'hidden routing', 'unexplained worker choice'],
    sections: ['Command', 'Worker', 'TAH context', 'Result']
  }),
  template({
    id: 'sunset-wars-runtime-brief',
    name: 'Sunset Wars Runtime Brief',
    category: 'system',
    sourceTah: ['sunset_wars.tah', 'sunset_wars_runtime_matrix.tah'],
    purpose: 'Explain Sunset Wars runtime decisions and constraints.',
    motif: 'Runtime command board',
    layout: 'System rule, runtime path, constraint, next action.',
    cues: ['runtime path', 'constraint lock', 'next action'],
    voice: 'Operator-grade and concise.',
    moves: ['Name the runtime rule.', 'Explain the constraint.', 'Recommend action.'],
    avoid: ['lore without utility', 'ambiguous runtime state', 'unsupported claims'],
    sections: ['Rule', 'Path', 'Constraint', 'Action']
  }),
  template({
    id: 'pulse-master-index-card',
    name: 'Pulse Master Index Card',
    category: 'system',
    sourceTah: ['pulse_master_v3_6.tah', 'pulse_master_v3_6.hat'],
    purpose: 'Summarize master archive context as indexable source intelligence.',
    motif: 'Master index card',
    layout: 'Source, shard family, relevance, and next lookup.',
    cues: ['source family', 'relevance meter', 'next lookup'],
    voice: 'Catalog-like and useful.',
    moves: ['Name source family.', 'Explain why it matters.', 'Suggest next lookup.'],
    avoid: ['dumping archive internals', 'unranked source lists', 'missing next step'],
    sections: ['Source family', 'Signal', 'Use', 'Next lookup']
  }),
  template({
    id: 'user-memory-lens',
    name: 'User Memory Lens',
    category: 'system',
    sourceTah: ['user_memories.tah', 'user_memories.unified.tah'],
    purpose: 'Use user memory carefully to personalize without overexposing private context.',
    motif: 'Memory lens',
    layout: 'Preference, relevance, safe use, do-not-reveal.',
    cues: ['preference chip', 'privacy shade', 'safe-use marker'],
    voice: 'Respectful and private.',
    moves: ['Use preference quietly.', 'Do not expose raw memory.', 'Apply only when relevant.'],
    avoid: ['revealing private memory', 'over-personalization', 'irrelevant callbacks'],
    sections: ['Preference', 'Relevance', 'Safe use', 'Do not reveal']
  }),
  template({
    id: 'yield-intel-card',
    name: 'Yield Intel Card',
    category: 'market',
    sourceTah: ['yield_intel.tah', 'texas_real_estate.tah'],
    purpose: 'Explain yield or investment context with careful caveats.',
    motif: 'Yield card',
    layout: 'Input assumptions, yield signal, risk, professional verification.',
    cues: ['assumption chip', 'yield band', 'risk flag'],
    voice: 'Careful and financial-caveated.',
    moves: ['Name assumptions.', 'Avoid return promises.', 'Recommend professional review.'],
    avoid: ['investment guarantees', 'tax advice', 'unverified rent assumptions'],
    sections: ['Assumptions', 'Signal', 'Risk', 'Verify']
  }),
  template({
    id: 'web-foundation-source-card',
    name: 'Web Foundation Source Card',
    category: 'technical',
    sourceTah: ['web_foundations.tah', 'wiki_real_estate.tah'],
    purpose: 'Explain web or wiki-derived facts with source caution.',
    motif: 'Source provenance card',
    layout: 'Claim, source type, confidence, and verification.',
    cues: ['source type', 'confidence badge', 'verify marker'],
    voice: 'Source-aware and concise.',
    moves: ['Name source type.', 'Avoid over-trusting web text.', 'Recommend primary source when needed.'],
    avoid: ['uncited claims', 'overconfident wiki facts', 'copying source language'],
    sections: ['Claim', 'Source type', 'Confidence', 'Verify']
  }),
  template({
    id: 'wiki-real-estate-explainer',
    name: 'Wiki Real Estate Explainer',
    category: 'learning',
    sourceTah: ['wiki_real_estate.tah', 'texas_real_estate.tah'],
    purpose: 'Turn general real-estate concepts into plain explanations.',
    motif: 'Concept explainer card',
    layout: 'Definition, example, local caution, and next action.',
    cues: ['definition block', 'example card', 'local caution'],
    voice: 'Plain and educational.',
    moves: ['Define simply.', 'Give an example.', 'Localize with caution.'],
    avoid: ['legal advice', 'overbroad claims', 'jargon without explanation'],
    sections: ['Definition', 'Example', 'Local caution', 'Next action']
  }),
  template({
    id: 'dallas-wiki-crosscheck',
    name: 'Dallas Wiki Crosscheck',
    category: 'place',
    sourceTah: ['wiki_dallas.tah', 'dallas_community_intel.tah'],
    purpose: 'Compare broad Dallas context against local community intelligence.',
    motif: 'Crosscheck panel',
    layout: 'General fact, local signal, confidence, and verification.',
    cues: ['general fact', 'local signal', 'crosscheck mark'],
    voice: 'Careful and local-aware.',
    moves: ['Separate broad from local.', 'Prefer local source for action.', 'Verify exact facts.'],
    avoid: ['wiki-only client advice', 'unsupported local claims', 'demographic language'],
    sections: ['General context', 'Local signal', 'Use carefully', 'Verify']
  }),
  template({
    id: 'tah-source-card',
    name: 'TAH Source Card',
    category: 'system',
    sourceTah: ['any .tah file'],
    purpose: 'Default explanation pattern for any retrieved TAH source.',
    motif: 'Source card',
    layout: 'Source, concepts, summary, action, and caveat.',
    cues: ['source badge', 'concept chips', 'confidence meter'],
    voice: 'Clear and grounded.',
    moves: ['Name the source.', 'Explain what was learned.', 'Turn it into one action.'],
    avoid: ['pretending certainty', 'burying the source', 'generic summaries'],
    sections: ['What I found', 'Why it matters', 'Use it this way', 'Caveat']
  })
];

const relayTemplates = Object.fromEntries(
  relayTemplateList.map((item) => [item.id, item])
) as Record<TahRelayTemplateId, TahRelayTemplate>;

const templateByWorker: Record<string, TahRelayTemplateId> = {
  'lead-scoring': 'lead-priority-board',
  'listing-summary': 'listing-storyboard',
  'neighborhood-explainer': 'neighborhood-field-guide',
  'buyer-intent': 'intent-thermometer',
  'follow-up-writer': 'message-card',
  'comp-analysis': 'comps-prism',
  'local-commerce': 'local-map-legend',
  'agent-voice': 'agent-voice-mirror',
  'market-movement': 'market-signal-brief',
  supervisor: 'supervisor-redline',
  'objection-scripts': 'objection-bridge',
  'listing-spark': 'campaign-hook-ladder'
};

type RelayShard = {
  source: string;
  title: string;
  concepts: string[];
  matchReason?: string;
};

export function selectTahRelayTemplate(worker: IntelligenceWorker, shards: RelayShard[] = []) {
  const sourceMatched = findTemplateForSources(worker, shards);
  return sourceMatched || relayTemplates[templateByWorker[worker.id] || 'tah-source-card'];
}

export function buildTahRelayPlan(
  worker: IntelligenceWorker,
  shards: RelayShard[],
  preferredMode?: TahRelayMode
): TahRelayPlan {
  const template = selectTahRelayTemplate(worker, shards);
  const anchors = buildSourceAnchors(shards);
  const format = selectTahRelayFormat(worker, preferredMode);

  return {
    templateId: template.id,
    templateName: template.name,
    mode: format.mode,
    purpose: template.purpose,
    visual: template.visual,
    words: template.words,
    format,
    sourceTah: template.sourceTah,
    availableFormats: Object.values(relayFormats).map((item) => ({
      mode: item.mode,
      name: item.name,
      useWhen: item.useWhen
    })),
    sections: template.sections.map((label, index) => ({
      label,
      instruction: sectionInstruction(label, index, anchors, format)
    })),
    finalScreen: buildFinalScreen(template, shards, anchors, format),
    sourceAnchors: anchors
  };
}

export function listTahRelayTemplates() {
  return relayTemplateList;
}

export function listTahRelayFormats() {
  return Object.values(relayFormats);
}

function findTemplateForSources(worker: IntelligenceWorker, shards: RelayShard[]) {
  if (!shards.length) return undefined;
  const workerDefault = relayTemplates[templateByWorker[worker.id] || 'tah-source-card'];
  const sources = new Set(shards.map((shard) => shard.source.toLowerCase()));

  if (workerDefault.sourceTah.some((source) => sources.has(source.toLowerCase()))) {
    return workerDefault;
  }

  return relayTemplateList.find((item) =>
    item.sourceTah.some((source) => sources.has(source.toLowerCase()))
  );
}

function buildSourceAnchors(shards: RelayShard[]) {
  const anchors = shards.slice(0, 3).map((shard) => {
    const concepts = shard.concepts.slice(0, 3).join(', ') || 'matched context';
    const reason = shard.matchReason ? ` via ${shard.matchReason}` : '';
    return `${shard.source}${reason}: ${concepts}`;
  });

  return anchors.length ? anchors : ['No TAH source retrieved yet; mark the output draft-only.'];
}

function selectTahRelayFormat(worker: IntelligenceWorker, preferredMode?: TahRelayMode) {
  if (preferredMode && relayFormats[preferredMode]) return relayFormats[preferredMode];

  if (worker.id === 'follow-up-writer' || worker.id === 'agent-voice' || worker.id === 'objection-scripts') {
    return relayFormats.script;
  }

  if (worker.id === 'neighborhood-explainer' || worker.id === 'local-commerce') {
    return relayFormats['field-board'];
  }

  return relayFormats.briefing;
}

function sectionInstruction(label: string, index: number, anchors: string[], format: TahRelayFormat) {
  const anchor = anchors[Math.min(index, anchors.length - 1)];
  return `${format.frameLabel} ${index + 1} - ${label}: ground this section in ${anchor}. Format as ${format.name.toLowerCase()}.`;
}

function buildFinalScreen(
  template: TahRelayTemplate,
  shards: RelayShard[],
  anchors: string[],
  format: TahRelayFormat
): TahRelayPlan['finalScreen'] {
  const sourceCards = shards.slice(0, 4).map((shard) => ({
    source: shard.source,
    concepts: shard.concepts.slice(0, 5),
    matchReason: shard.matchReason || 'policy'
  }));

  const learned = [
    `Learned how to frame this as ${template.name}.`,
    `Learned which TAH sources support the explanation: ${template.sourceTah.slice(0, 3).join(', ')}.`,
    `Learned the safe delivery shape: ${template.sections.slice(0, 3).join(' -> ')}.`
  ];

  return {
    title: `What we learned from ${template.name}`,
    frameLabel: finalFrameLabel(format),
    instruction: `${finalFrameLabel(format)}: show where the information came from, list the TAH source cards, and close with what the user learned. Do not introduce new claims on this final screen.`,
    sourceCards: sourceCards.length
      ? sourceCards
      : anchors.map((anchor) => ({
        source: anchor,
        concepts: ['draft-only'],
        matchReason: 'fallback'
      })),
    learned
  };
}

function finalFrameLabel(format: TahRelayFormat) {
  if (format.mode === 'slideshow') return 'Final slide';
  if (format.mode === 'puppetshow') return 'Final scene';
  if (format.mode === 'field-board') return 'Final board zone';
  if (format.mode === 'script') return 'Final script beat';
  return 'Final briefing footer';
}
