export type CallAssistMode = 'live' | 'post-call';

export type CallAssistContext = {
  callerName?: string;
  leadStage?: string;
  propertyAddress?: string;
  propertyPrice?: number;
  budget?: number;
  timeframe?: string;
  financingStatus?: string;
};

export type CallAssistConsent = {
  disclosureRead?: boolean;
  callerConsented?: boolean;
  recordingAllowed?: boolean;
};

export type CallAssistAnalyzeInput = {
  transcript: string;
  mode?: CallAssistMode;
  context?: CallAssistContext;
  consent?: CallAssistConsent;
};

export type CallAssistCardKind = 'consent' | 'objection' | 'next-question' | 'compliance' | 'fact' | 'follow-up';

export type CallAssistCard = {
  id: string;
  kind: CallAssistCardKind;
  title: string;
  body: string;
  priority: number;
  suggestedLine?: string;
};

export type CallAssistAnalysis = {
  consent: {
    ready: boolean;
    warning: string | null;
  };
  stage: 'consent-needed' | 'discovery' | 'qualifying' | 'showing-ready' | 'post-call';
  intentScore: number;
  talkTrack: string;
  cards: CallAssistCard[];
  summary: string;
  followUpDraft: string;
  memoryPatch: {
    callerName: string | null;
    objections: string[];
    nextActions: string[];
    mentionedProperty: string | null;
    budgetFit: 'unknown' | 'under-budget' | 'near-budget' | 'over-budget';
  };
  transcriptStats: {
    wordCount: number;
    questionCount: number;
    signalCount: number;
  };
};

const OBJECTION_PATTERNS = [
  {
    id: 'price',
    pattern: /\b(expensive|too high|price|cost|afford|payment|monthly|rate|interest)\b/i,
    title: 'Price Objection',
    body: 'Caller is circling cost. Move from price defense to payment comfort and tradeoffs.',
    suggestedLine: 'Totally fair. What monthly range would feel comfortable if the home itself is right?'
  },
  {
    id: 'spouse',
    pattern: /\b(spouse|husband|wife|partner|talk it over|think about it)\b/i,
    title: 'Decision Partner',
    body: 'A second decision maker is likely involved. Offer a clean recap and a specific next step.',
    suggestedLine: 'Would it help if I sent a short recap you can look at together?'
  },
  {
    id: 'timing',
    pattern: /\b(not ready|later|next year|wait|lease|timeline|timeframe)\b/i,
    title: 'Timing Friction',
    body: 'Timing is the real blocker. Clarify whether this is informational, urgent, or nurture.',
    suggestedLine: 'What would need to happen before moving from looking to actively touring?'
  },
  {
    id: 'just-looking',
    pattern: /\b(just looking|browsing|curious|not serious)\b/i,
    title: 'Soft Intent',
    body: 'Keep pressure low. Ask one useful preference question and earn permission for follow-up.',
    suggestedLine: 'No pressure. What caught your eye enough to ask about this one?'
  }
];

const COMPLIANCE_PATTERNS = [
  {
    id: 'appreciation',
    pattern: /\b(guarantee|guaranteed|will appreciate|definitely go up|sure investment|guaranteed return)\b/i,
    title: 'Avoid Guaranteed Outcome',
    body: 'Do not promise appreciation, ROI, financing, or resale results.',
    suggestedLine: 'I can show recent comparable activity, but future value is never guaranteed.'
  },
  {
    id: 'neighborhood',
    pattern: /\b(safe neighborhood|unsafe|crime-free|good families|bad area|demographics)\b/i,
    title: 'Neighborhood Claim Risk',
    body: 'Avoid protected-class, safety, and demographic characterizations. Point to objective sources.',
    suggestedLine: 'I can send public resources so you can evaluate the area directly.'
  },
  {
    id: 'schools',
    pattern: /\b(best school|great school|bad school|school district guarantees|assigned school)\b/i,
    title: 'School Claim Risk',
    body: 'School assignments and quality claims need verification from the district.',
    suggestedLine: 'School boundaries can change, so we should verify directly with the district.'
  }
];

export function analyzeCallAssist(input: CallAssistAnalyzeInput): CallAssistAnalysis {
  const transcript = normalizeTranscript(input.transcript);
  const lower = transcript.toLowerCase();
  const context = input.context || {};
  const consent = input.consent || {};
  const wordCount = transcript ? transcript.split(/\s+/).length : 0;
  const questionCount = (transcript.match(/\?/g) || []).length;
  const consentReady = Boolean(consent.disclosureRead && consent.callerConsented);

  if (!consentReady) {
    const warning = 'Read the call-assist disclosure and capture caller consent before listening, recording, or storing call notes.';
    return {
      consent: { ready: false, warning },
      stage: 'consent-needed',
      intentScore: 0,
      talkTrack: 'Consent first. Jamie stays quiet until the caller has agreed.',
      cards: [{
        id: 'consent-required',
        kind: 'consent',
        title: 'Consent Gate',
        body: warning,
        priority: 100,
        suggestedLine: 'Before we continue, I use call notes to help keep details accurate. Is that okay?'
      }],
      summary: 'Call assist is locked until consent is captured.',
      followUpDraft: '',
      memoryPatch: {
        callerName: context.callerName || null,
        objections: [],
        nextActions: ['Capture disclosure and caller consent.'],
        mentionedProperty: context.propertyAddress || null,
        budgetFit: calculateBudgetFit(context)
      },
      transcriptStats: { wordCount, questionCount, signalCount: 0 }
    };
  }

  const objectionCards = OBJECTION_PATTERNS
    .filter((item) => item.pattern.test(transcript))
    .map((item, index) => ({
      id: `objection-${item.id}`,
      kind: 'objection' as const,
      title: item.title,
      body: item.body,
      priority: 90 - index,
      suggestedLine: item.suggestedLine
    }));

  const complianceCards = COMPLIANCE_PATTERNS
    .filter((item) => item.pattern.test(transcript))
    .map((item, index) => ({
      id: `compliance-${item.id}`,
      kind: 'compliance' as const,
      title: item.title,
      body: item.body,
      priority: 98 - index,
      suggestedLine: item.suggestedLine
    }));

  const nextQuestion = buildNextQuestion(lower, context, objectionCards);
  const factCard = buildFactCard(context);
  const followUpCard = buildFollowUpCard(transcript, context);
  const cards = [
    ...complianceCards,
    ...objectionCards,
    nextQuestion,
    ...(factCard ? [factCard] : []),
    followUpCard
  ].sort((a, b) => b.priority - a.priority).slice(0, 6);

  const signalCount = cards.filter((card) => card.kind !== 'follow-up').length;
  const intentScore = scoreIntent(lower, context, objectionCards.length, signalCount);
  const stage = input.mode === 'post-call'
    ? 'post-call'
    : inferStage(lower, intentScore);
  const objections = objectionCards.map((card) => card.title);
  const nextActions = cards
    .filter((card) => card.kind === 'next-question' || card.kind === 'follow-up')
    .map((card) => card.suggestedLine || card.body);

  return {
    consent: { ready: true, warning: consent.recordingAllowed === false ? 'Caller consented to notes, but recording is off.' : null },
    stage,
    intentScore,
    talkTrack: buildTalkTrack(stage, cards, context),
    cards,
    summary: buildSummary(transcript, context, objections, intentScore),
    followUpDraft: buildFollowUpDraft(context, transcript, nextQuestion.suggestedLine || nextQuestion.body),
    memoryPatch: {
      callerName: context.callerName || null,
      objections,
      nextActions,
      mentionedProperty: context.propertyAddress || null,
      budgetFit: calculateBudgetFit(context)
    },
    transcriptStats: { wordCount, questionCount, signalCount }
  };
}

function normalizeTranscript(value: string) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function buildNextQuestion(
  lowerTranscript: string,
  context: CallAssistContext,
  objections: CallAssistCard[]
): CallAssistCard {
  const hasPriceObjection = objections.some((card) => card.id === 'objection-price');
  if (hasPriceObjection) {
    return {
      id: 'next-question-payment',
      kind: 'next-question',
      title: 'Ask Payment Comfort',
      body: 'Anchor on payment comfort instead of defending list price.',
      priority: 86,
      suggestedLine: 'What payment range would make this feel worth exploring?'
    };
  }

  if (!context.timeframe && !/\b(today|this week|this month|30 days|60 days|90 days|summer|fall|spring|winter)\b/i.test(lowerTranscript)) {
    return {
      id: 'next-question-timeframe',
      kind: 'next-question',
      title: 'Clarify Timing',
      body: 'Timeline is still missing.',
      priority: 82,
      suggestedLine: 'When would you ideally like to make a move if the right place shows up?'
    };
  }

  if (!context.financingStatus && !/\b(preapproved|cash|financing|lender|loan|mortgage)\b/i.test(lowerTranscript)) {
    return {
      id: 'next-question-financing',
      kind: 'next-question',
      title: 'Clarify Financing',
      body: 'Financing status is still unknown.',
      priority: 80,
      suggestedLine: 'Are you already preapproved, paying cash, or still figuring out financing?'
    };
  }

  return {
    id: 'next-question-tour',
    kind: 'next-question',
    title: 'Move Toward Tour',
    body: 'Intent is warm enough to test for a concrete next step.',
    priority: 78,
    suggestedLine: 'Would you want to see it in person if the numbers line up?'
  };
}

function buildFactCard(context: CallAssistContext): CallAssistCard | null {
  if (!context.propertyAddress && !context.propertyPrice && !context.budget) {
    return null;
  }

  const facts = [
    context.propertyAddress ? `Property: ${context.propertyAddress}` : null,
    context.propertyPrice ? `List price: ${formatCurrency(context.propertyPrice)}` : null,
    context.budget ? `Caller budget: ${formatCurrency(context.budget)}` : null,
    context.timeframe ? `Timeline: ${context.timeframe}` : null
  ].filter(Boolean);

  return {
    id: 'fact-current-context',
    kind: 'fact',
    title: 'Current Call Context',
    body: facts.join(' | '),
    priority: 64,
    suggestedLine: context.propertyAddress
      ? `The property I have pulled up is ${context.propertyAddress}.`
      : undefined
  };
}

function buildFollowUpCard(transcript: string, context: CallAssistContext): CallAssistCard {
  const propertyPhrase = context.propertyAddress ? ` about ${context.propertyAddress}` : '';
  return {
    id: 'follow-up-draft-ready',
    kind: 'follow-up',
    title: 'Follow-Up Draft Ready',
    body: transcript ? 'Jamie can turn this call into a short follow-up note.' : 'No transcript yet; follow-up will fill in after the call.',
    priority: 50,
    suggestedLine: `Send a recap${propertyPhrase} with the next step and one useful detail.`
  };
}

function scoreIntent(
  lowerTranscript: string,
  context: CallAssistContext,
  objectionCount: number,
  signalCount: number
) {
  let score = 38 + signalCount * 4;
  if (context.budget) score += 8;
  if (context.timeframe) score += 8;
  if (context.financingStatus) score += 8;
  if (/\b(tour|showing|see it|walk through|appointment|available tomorrow|available today)\b/i.test(lowerTranscript)) score += 22;
  if (/\b(preapproved|cash buyer|lender|down payment)\b/i.test(lowerTranscript)) score += 14;
  if (/\b(offer|write it up|contract|earnest money)\b/i.test(lowerTranscript)) score += 20;
  if (/\b(just looking|not serious|maybe later)\b/i.test(lowerTranscript)) score -= 14;
  if (objectionCount > 1) score -= 4;
  return clamp(score, 0, 99);
}

function inferStage(lowerTranscript: string, intentScore: number): CallAssistAnalysis['stage'] {
  if (/\b(tour|showing|see it|appointment|offer|contract)\b/i.test(lowerTranscript) || intentScore >= 76) {
    return 'showing-ready';
  }
  if (/\b(budget|preapproved|cash|timeframe|timeline|payment)\b/i.test(lowerTranscript) || intentScore >= 58) {
    return 'qualifying';
  }
  return 'discovery';
}

function buildTalkTrack(
  stage: CallAssistAnalysis['stage'],
  cards: CallAssistCard[],
  context: CallAssistContext
) {
  const highest = cards[0];
  if (highest?.kind === 'compliance') {
    return highest.suggestedLine || 'Pause and rephrase into objective, source-backed language.';
  }
  if (highest?.suggestedLine) return highest.suggestedLine;
  if (stage === 'showing-ready') return 'Offer a specific tour window and confirm the best follow-up channel.';
  if (context.propertyAddress) return `Keep ${context.propertyAddress} open and ask one qualifying question.`;
  return 'Keep the caller talking and collect one missing buying signal.';
}

function buildSummary(
  transcript: string,
  context: CallAssistContext,
  objections: string[],
  intentScore: number
) {
  const caller = context.callerName || 'Caller';
  const property = context.propertyAddress ? ` about ${context.propertyAddress}` : '';
  const objectionText = objections.length ? ` Objections detected: ${objections.join(', ')}.` : ' No major objection detected yet.';
  if (!transcript) {
    return `${caller} has an assisted call open${property}. Waiting for transcript.`;
  }
  return `${caller} is at ${intentScore}% intent${property}.${objectionText}`;
}

function buildFollowUpDraft(context: CallAssistContext, transcript: string, nextLine: string) {
  const caller = context.callerName || 'there';
  const property = context.propertyAddress ? ` on ${context.propertyAddress}` : '';
  const detail = transcript
    ? 'I pulled together the details we discussed'
    : 'I will send the key details once we finish';
  return `Hi ${caller}, good talking with you${property}. ${detail}. Next step: ${nextLine}`;
}

function calculateBudgetFit(context: CallAssistContext): CallAssistAnalysis['memoryPatch']['budgetFit'] {
  if (!context.budget || !context.propertyPrice) return 'unknown';
  const gap = context.propertyPrice - context.budget;
  const ratio = gap / context.propertyPrice;
  if (ratio <= -0.03) return 'under-budget';
  if (Math.abs(ratio) <= 0.08) return 'near-budget';
  return 'over-budget';
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(value);
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.round(value)));
}
