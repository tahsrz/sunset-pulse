import fs from 'fs';
import path from 'path';
import {
  SegmentedExpertAtlasRetriever,
  type ExpertAtlasSearchResult,
  domainMaskForLabel
} from '@/lib/core/segmented_expert_atlas';
import { extractMemoriaTerms } from '@/lib/core/memoria_builder';
import {
  chooseWorkerForCommand,
  intelligenceWorkers,
  type IntelligenceWorker
} from './workerRoster';
import {
  countTermMatches,
  expandCommandTerms,
  expandedTextForSearch,
  scoreTermMatches,
  type WeightedTerm
} from './synonyms';
import { buildTahRelayPlan, type TahRelayMode, type TahRelayPlan } from './relayTemplates';
import {
  recallQueryMemories,
  saveQueryMemory,
  type QueryMemoryTrace
} from './queryMemory';

export type CommandCenterRequest = {
  command: string;
  selectedWorkerId?: string;
  relayMode?: TahRelayMode;
  supervisor?: boolean;
  context?: {
    leadId?: string;
    listingId?: string;
    neighborhoodId?: string;
  };
};

export type CommandCenterResponse = {
  commandId: string;
  intent: string;
  worker: {
    id: string;
    name: string;
    role: string;
    slot: IntelligenceWorker['slot'];
  };
  model: string;
  tahFiles: string[];
  result: {
    title: string;
    summary: string;
    actions: string[];
    confidence: number;
    relayPlan: TahRelayPlan;
    deliverable: {
      mode: TahRelayMode;
      title: string;
      copyReadyText: string;
      sourceSummary: string;
      frames: Array<{
        label: string;
        title: string;
        visualDirection: string;
        body: string;
        speakerNote: string;
        sourceAnchor: string;
      }>;
    };
  };
  trace: {
    routeMode: 'auto' | 'manual';
    selectedShards: Array<{
      expertId: number;
      title: string;
      source: string;
      score: number;
      concepts: string[];
      excerpt: string;
      metrics?: {
        complexity: number;
        density: number;
        vitality: number;
        contextLevel: 'summary' | 'interface' | 'full';
        matchReason: string;
      };
    }>;
    atlasDiagnostics?: {
      totalSegments: number;
      visitedSegments: number;
      rejectedSegments: number;
      candidateExperts: number;
      linkedExperts?: number;
      payloadReads: number;
      routeIndex: number;
    };
    retrievalPolicy?: TahRetrievalPolicyTrace;
    supervisorNotes?: string[];
    queryMemory?: QueryMemoryTrace;
  };
};

const ATLAS_BASE = path.join(process.cwd(), 'cartridges', 'expert-atlas', 'segmented_expert_atlas');
const ALL_DOMAIN_MASK = (1n << 64n) - 1n;

type CommandContextShard = {
  expertId: number;
  title: string;
  source: string;
  score: number;
  concepts: string[];
  text: string;
  complexity?: number;
  density?: number;
  vitality?: number;
  contextLevel?: 'summary' | 'interface' | 'full';
  matchReason?: string;
};

type CivicServiceRecord = {
  category: string;
  status: string;
  outcome: string;
  location: string;
  reported: string;
  coordinates: string;
  serviceRequest: string;
};

type TahRetrievalPolicyTrace = {
  name: string;
  contextMode: 'compact';
  targetComplexity: number;
  linkedExpansionDepth: number;
  synonymTerms: number;
  stages: Array<{
    name: string;
    input: number;
    kept: number;
    rejected: number;
  }>;
};

type RetrievalPolicyResult = {
  results: CommandContextShard[];
  trace: TahRetrievalPolicyTrace;
};

export function runCommandCenterCommand(input: CommandCenterRequest): CommandCenterResponse {
  const command = input.command.trim();
  if (!command) {
    throw new Error('Command is required.');
  }

  const manualWorker = input.selectedWorkerId
    ? intelligenceWorkers.find((worker) => worker.id === input.selectedWorkerId)
    : undefined;
  const worker = manualWorker || chooseWorkerForCommand(command);
  const routeMode = manualWorker ? 'manual' : 'auto';
  const commandId = `cmd_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  const recalledMemory = recallQueryMemories(command, worker);
  const context = retrieveTahContext(command, worker);
  const contextResults = mergeCommandContextShards(recalledMemory, context.results);
  const relayPlan = buildTahRelayPlan(worker, contextResults, input.relayMode);
  const result = synthesizeWorkerResult(command, worker, contextResults, relayPlan);
  const supervisorNotes = input.supervisor ? superviseResult(command, worker, result, contextResults) : undefined;
  const queryMemory = saveQueryMemory({
    commandId,
    command,
    intent: inferIntent(command, worker),
    worker,
    relayPlan,
    sources: contextResults.map((shard) => ({
      source: shard.source,
      concepts: shard.concepts,
      matchReason: shard.matchReason
    })),
    summary: result.summary,
    actions: result.actions
  });
  queryMemory.recalled = recalledMemory.length;

  return {
    commandId,
    intent: inferIntent(command, worker),
    worker: {
      id: worker.id,
      name: worker.name,
      role: worker.role,
      slot: worker.slot
    },
    model: worker.model,
    tahFiles: worker.tahLoadout,
    result,
    trace: {
      routeMode,
      selectedShards: contextResults.map((shard) => ({
        expertId: shard.expertId,
        title: shard.title,
        source: shard.source,
        score: Number(shard.score.toFixed(2)),
        concepts: shard.concepts.slice(0, 6),
        excerpt: excerpt(shard.text, 260),
        metrics: shard.contextLevel ? {
          complexity: roundMetric(shard.complexity),
          density: roundMetric(shard.density),
          vitality: roundMetric(shard.vitality),
          contextLevel: shard.contextLevel,
          matchReason: shard.matchReason || 'policy'
        } : undefined
      })),
      atlasDiagnostics: context.diagnostics,
      retrievalPolicy: context.policy,
      supervisorNotes,
      queryMemory
    }
  };
}

function mergeCommandContextShards(memoryShards: CommandContextShard[], retrievedShards: CommandContextShard[]) {
  const seen = new Set<string>();
  return [...memoryShards, ...retrievedShards].filter((shard) => {
    const key = `${shard.source}:${shard.expertId}:${shard.title}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 6);
}

function retrieveTahContext(command: string, worker: IntelligenceWorker) {
  const hatPath = `${ATLAS_BASE}.hat`;
  const tahPath = `${ATLAS_BASE}.tah`;

  if (!fs.existsSync(hatPath) || !fs.existsSync(tahPath)) {
    return { results: buildVirtualTahContext(command, worker), diagnostics: undefined };
  }

  try {
    const retriever = new SegmentedExpertAtlasRetriever(hatPath, tahPath);
    const searchText = [
      command,
      worker.name,
      worker.role,
      worker.tahLoadout.join(' ')
    ].join(' ');
    const expandedSearchText = expandedTextForSearch(searchText);
    const policyProfile = buildPolicyProfile(searchText, worker);
    const response = retriever.search({
      text: expandedSearchText,
      domainMask: domainMaskForLabel(expandedSearchText),
      targetComplexity: policyProfile.targetComplexity,
      minComplexity: policyProfile.minComplexity,
      maxComplexity: policyProfile.maxComplexity,
      topN: 8,
      maxSegments: 12,
      minTrust: 0.5,
      linkExpansionDepth: 1,
      linkExpansionLimit: 10
    });
    const loadoutText = expandedTextForSearch([
      worker.tahLoadout.join(' '),
      worker.commandFit.join(' '),
      worker.name
    ].join(' '));
    const loadoutResponse = retriever.search({
      text: loadoutText,
      domainMask: ALL_DOMAIN_MASK,
      targetComplexity: policyProfile.targetComplexity,
      minComplexity: policyProfile.minComplexity,
      maxComplexity: policyProfile.maxComplexity,
      topN: 8,
      maxSegments: 25,
      minTrust: 0.5,
      linkExpansionDepth: 1,
      linkExpansionLimit: 10
    });
    const mergedResults = mergeAtlasResults(response.results, loadoutResponse.results);
    const policyResult = applyTahRetrievalPolicy(mergedResults, worker, expandedSearchText, policyProfile);
    const finalResults = policyResult.results.length ? policyResult.results : buildVirtualTahContext(searchText, worker);
    const finalPolicy = policyResult.results.length
      ? policyResult.trace
      : {
        ...policyResult.trace,
        stages: [
          ...policyResult.trace.stages,
        stage('virtual loadout fallback', mergedResults.length, finalResults.length)
      ]
    };

    return {
      results: finalResults,
      diagnostics: response.diagnostics,
      policy: finalPolicy
    };
  } catch (error) {
    console.error('[COMMAND_CENTER] TAH retrieval failed:', error);
    return { results: buildVirtualTahContext(command, worker), diagnostics: undefined };
  }
}

function mergeAtlasResults(...groups: ExpertAtlasSearchResult[][]) {
  const byExpertId = new Map<number, ExpertAtlasSearchResult>();

  for (const result of groups.flat()) {
    const current = byExpertId.get(result.expertId);
    if (!current || result.score > current.score) {
      byExpertId.set(result.expertId, result);
    }
  }

  return [...byExpertId.values()];
}

function synthesizeWorkerResult(
  command: string,
  worker: IntelligenceWorker,
  shards: CommandContextShard[],
  relayPlan: TahRelayPlan
): CommandCenterResponse['result'] {
  const civicRecord = parseCivicServiceRecord(command);
  if (civicRecord && worker.id === 'dallas-community') {
    return synthesizeCivicServiceResult(command, worker, shards, relayPlan, civicRecord);
  }

  const topShard = shards[0];
  const sourcePhrase = topShard
    ? `I found a useful note in ${topShard.source} about ${topShard.concepts.slice(0, 3).join(', ') || 'this topic'}.`
    : 'I did not find a strong saved note yet, so I used the selected helper and its usual files.';

  const actions = buildActions(command, worker, shards);
  const confidence = Math.min(96, Math.max(62, Math.round(
    worker.stats.precision * 0.45 +
    worker.stats.contextFit * 0.35 +
    (shards.length ? 18 : 4)
  )));

  return {
    title: worker.sampleOutput.title,
    summary: `${sourcePhrase} ${worker.role} You asked: "${command}".`,
    actions,
    confidence,
    relayPlan,
    deliverable: buildCommandDeliverable(command, worker, shards, relayPlan, actions)
  };
}

function synthesizeCivicServiceResult(
  command: string,
  worker: IntelligenceWorker,
  shards: CommandContextShard[],
  relayPlan: TahRelayPlan,
  record: CivicServiceRecord
): CommandCenterResponse['result'] {
  const actions = [
    `Look up service request ${record.serviceRequest} in the Dallas 311 system if you need the live status.`,
    'Treat the address as the usable location because the coordinates are 0, 0.',
    'Use this as local service context only; do not turn it into a safety, value, or neighborhood-quality claim.'
  ];
  const confidence = Math.min(96, Math.max(84, worker.stats.precision));
  const summary = [
    `This is a Dallas 311 code-compliance service request for ${record.location}.`,
    `${record.category} means the city categorized it as a code concern; CCS is the code-compliance lane.`,
    `Status ${record.status} and outcome ${record.outcome} mean it appears open or not yet resolved.`,
    `Coordinates ${record.coordinates} usually mean the record did not geocode correctly, so verify by address and service request number.`
  ].join(' ');

  return {
    title: 'This is an open Dallas code-compliance request',
    summary,
    actions,
    confidence,
    relayPlan,
    deliverable: buildCivicServiceDeliverable(record, shards, relayPlan, actions)
  };
}

function buildCommandDeliverable(
  command: string,
  worker: IntelligenceWorker,
  shards: CommandContextShard[],
  relayPlan: TahRelayPlan,
  actions: string[]
): CommandCenterResponse['result']['deliverable'] {
  if (relayPlan.templateId === 'message-card') {
    return buildMessageCardDeliverable(command, worker, shards, relayPlan, actions);
  }

  const sourceSummary = summarizeSources(shards, worker);
  const sections = relayPlan.sections.slice(0, 4);
  const frames = sections.map((section, index) => {
    const shard = shards[index % Math.max(1, shards.length)];
    const signal = shard ? extractShardSignal(shard) : `Use ${worker.name} to answer: ${command}`;
    const action = actions[index % actions.length] || worker.sampleOutput.bullets[index % worker.sampleOutput.bullets.length] || 'Return the next practical move.';
    const sourceAnchor = shard
      ? `${shard.source} / ${shard.matchReason || 'retrieved context'}`
      : worker.tahLoadout[index % worker.tahLoadout.length] || 'worker loadout';

    return {
      label: `${relayPlan.format.frameLabel} ${index + 1}`,
      title: section.label,
      visualDirection: frameVisualDirection(relayPlan, section.label),
      body: frameBodyForMode(relayPlan.mode, section.label, signal, action),
      speakerNote: frameSpeakerNote(relayPlan.mode, section.label, signal, action, sourceAnchor),
      sourceAnchor
    };
  });

  frames.push({
    label: relayPlan.finalScreen.frameLabel,
    title: relayPlan.finalScreen.title,
    visualDirection: 'Show where the answer came from and what to do next. Do not add new claims.',
    body: [
      sourceSummary,
      relayPlan.finalScreen.learned.slice(0, 3).join(' '),
      `Next action: ${actions[0] || 'Review the retrieved context before sending externally.'}`
    ].join(' '),
    speakerNote: relayPlan.finalScreen.instruction,
    sourceAnchor: relayPlan.finalScreen.sourceCards
      .slice(0, 4)
      .map((card) => `${card.source} (${card.matchReason})`)
      .join(', ')
  });

  return {
    mode: relayPlan.mode,
    title: `${relayPlan.templateName}: ${worker.name}`,
    copyReadyText: frames.map(formatDeliverableFrame).join('\n\n'),
    sourceSummary,
    frames
  };
}

function buildCivicServiceDeliverable(
  record: CivicServiceRecord,
  shards: CommandContextShard[],
  relayPlan: TahRelayPlan,
  actions: string[]
): CommandCenterResponse['result']['deliverable'] {
  const sourceSummary = summarizeSources(
    shards.filter((shard) => shard.source.toLowerCase() !== 'query_memory.tah'),
    {
      tahLoadout: ['dallas_community_intel.tah', 'dallas_community_intel.hat']
    } as IntelligenceWorker
  );
  const sourceAnchor = sourceSummary.replace(/^I used:\s*/i, '').replace(/\.$/, '');
  const frames = [
    {
      label: 'Answer',
      title: 'What it means',
      visualDirection: 'Show the record as a simple status card with the address, request number, and open status.',
      body: `This is a Dallas 311 code-compliance record for ${record.location}. It is not a final finding; it is a reported city-service issue being tracked as ${record.serviceRequest}.`,
      speakerNote: 'Use this as the direct answer before showing source details.',
      sourceAnchor
    },
    {
      label: 'Fields',
      title: 'How to read it',
      visualDirection: 'Break the record into field chips: category, status, outcome, reported date, and request number.',
      body: `Category: ${record.category}. Status: ${record.status}. Outcome: ${record.outcome}. Reported: ${record.reported}.`,
      speakerNote: 'Explain field meanings in plain language, not system language.',
      sourceAnchor
    },
    {
      label: 'Caution',
      title: 'What not to assume',
      visualDirection: 'Show a small warning chip beside coordinates 0, 0.',
      body: `Coordinates ${record.coordinates} are not a useful map point here. Use the address and service request number instead.`,
      speakerNote: 'Do not infer safety, property value, or neighborhood quality from this record alone.',
      sourceAnchor
    },
    {
      label: 'Next action',
      title: 'What to do now',
      visualDirection: 'Show one clear action button: check Dallas 311 by service request number.',
      body: actions[0],
      speakerNote: actions[2],
      sourceAnchor
    }
  ];

  return {
    mode: relayPlan.mode,
    title: 'Plain interpretation of the Dallas service request',
    copyReadyText: frames.map(formatDeliverableFrame).join('\n\n'),
    sourceSummary,
    frames
  };
}

function buildMessageCardDeliverable(
  command: string,
  worker: IntelligenceWorker,
  shards: CommandContextShard[],
  relayPlan: TahRelayPlan,
  actions: string[]
): CommandCenterResponse['result']['deliverable'] {
  const sourceSummary = summarizeSources(shards, worker);
  const message = buildSendableMessage(command, worker);
  const frames = [
    {
      label: 'Send this',
      title: 'Ready message',
      visualDirection: 'Show the message itself, with one copy action.',
      body: message,
      speakerNote: 'This is the action. Copy or send this text after reviewing facts.',
      sourceAnchor: sourceSummary.replace(/^I used:\s*/i, '').replace(/\.$/, '')
    },
    {
      label: 'Why it works',
      title: 'Reason',
      visualDirection: 'Show one small rationale strip beneath the message.',
      body: actions[0] || worker.role,
      speakerNote: 'Keep this as support, not the main answer.',
      sourceAnchor: sourceSummary.replace(/^I used:\s*/i, '').replace(/\.$/, '')
    }
  ];

  return {
    mode: relayPlan.mode,
    title: 'Sendable message',
    copyReadyText: message,
    sourceSummary,
    frames
  };
}

function buildSendableMessage(command: string, worker: IntelligenceWorker) {
  const cleaned = command
    .replace(/^help me (rewrite|write)\s*/i, '')
    .replace(/^this\s*/i, '')
    .trim();

  if (/sunset chat|chat note|clear and friendly|wording/i.test(command)) {
    return 'Quick note for Sunset Chat: I cleaned this up so it is clear, friendly, and easy to respond to. What do you want the note to say?';
  }

  if (worker.id === 'follow-up-writer') {
    return cleaned
      ? `Hi, wanted to follow up on this: ${cleaned} Would you like me to send over the next best option or talk through it today?`
      : 'Hi, just checking in. Would you like me to send over the next best option or talk through what changed today?';
  }

  return cleaned || 'Here is the concise message to review before sending.';
}

function frameVisualDirection(relayPlan: TahRelayPlan, sectionLabel: string) {
  return `${relayPlan.visual.motif}: ${sectionLabel}. ${relayPlan.visual.layout}`;
}

function frameBodyForMode(mode: TahRelayMode, sectionLabel: string, signal: string, action: string) {
  if (mode === 'script') {
    return `${sectionLabel}: "${action}" Why: ${signal}`;
  }

  if (mode === 'puppetshow') {
    return `Guide: ${signal} Skeptic: What should the agent do? Guide: ${action}`;
  }

  if (mode === 'field-board') {
    return `What I found: ${signal} Next step: ${action}`;
  }

  if (mode === 'slideshow') {
    return `${signal} Next step: ${action}`;
  }

  return `${signal} Next step: ${action}`;
}

function frameSpeakerNote(mode: TahRelayMode, sectionLabel: string, signal: string, action: string, sourceAnchor: string) {
  const prefix = mode === 'script'
    ? 'Read this as a client-safe talk track.'
    : mode === 'slideshow'
      ? 'Use this as the speaker note for the slide.'
      : 'Use this as the explanation note for the frame.';

  return `${prefix} ${sectionLabel}: ${signal} Then recommend: ${action} From: ${sourceAnchor}.`;
}

function formatDeliverableFrame(frame: CommandCenterResponse['result']['deliverable']['frames'][number]) {
  return [
    `${frame.label}: ${frame.title}`,
    `Visual idea: ${frame.visualDirection}`,
    `Text: ${frame.body}`,
    `Talking note: ${frame.speakerNote}`,
    `From: ${frame.sourceAnchor}`
  ].join('\n');
}

function summarizeSources(shards: CommandContextShard[], worker: IntelligenceWorker) {
  const sourceNames = shards.length
    ? [...new Set(shards.map((shard) => shard.source))].slice(0, 5)
    : worker.tahLoadout.slice(0, 5);

  return `I used: ${sourceNames.join(', ')}.`;
}

function extractShardSignal(shard: CommandContextShard) {
  if (shard.source.toLowerCase() === 'query_memory.tah') {
    const concepts = shard.concepts.slice(0, 3).join(', ');
    return `A saved note matched this request${concepts ? ` (${concepts})` : ''}.`;
  }

  const cleaned = shard.text
    .replace(/\r?\n/g, ' ')
    .replace(/\b(TYPE|CREATED_AT|COMMAND|WORKER|TEMPLATE|MODE|SOURCES|LEARNED|ACTIONS|TITLE|CONCEPT|ALIASES|DOMAIN|TRUST|VITALITY|PURPOSE|OUTPUT SHAPE|SOURCE|SLUG|QUERY|CONTENT):\s*/gi, '')
    .replace(/Learned which TAH sources support the explanation:/gi, 'Files used:')
    .replace(/Learned how to frame this as/gi, 'Answer style:')
    .replace(/Learned the safe delivery shape:/gi, 'Answer flow:')
    .replace(/\bTAH sources\b/gi, 'TAH files')
    .replace(/\bTAH context\b/gi, 'TAH files')
    .replace(/\s+/g, ' ')
    .trim();

  const sentence = cleaned
    .split(/(?<=[.!?])\s+/)
    .find((item) => item.length >= 40 && item.length <= 260);

  return excerpt(sentence || cleaned || shard.title, 260);
}

function parseCivicServiceRecord(command: string): CivicServiceRecord | null {
  const normalized = command.replace(/\s+/g, ' ').trim();
  if (!/\b(service request|code concern|community vitality|311|ccs)\b/i.test(normalized)) {
    return null;
  }

  const category = matchField(normalized, /Community Vitality:\s*([^|]+?)\s+Status:/i)
    || matchField(normalized, /\b(Code Concern\s*-?\s*CCS)\b/i)
    || 'Code Concern - CCS';
  const status = matchField(normalized, /Status:\s*([^|]+?)\s*\|\s*Outcome:/i) || 'unknown';
  const outcome = matchField(normalized, /Outcome:\s*([^|]+?)\s+Location:/i) || 'unknown';
  const location = matchField(normalized, /Location:\s*(.+?)\s+Reported:/i) || 'location not found';
  const reported = matchField(normalized, /Reported:\s*(.+?)\s+Coordinates:/i) || 'reported date not found';
  const coordinates = matchField(normalized, /Coordinates:\s*([^|]+?)\s+Service Request:/i) || 'not listed';
  const serviceRequest = matchField(normalized, /Service Request:\s*([0-9][0-9 -]*[0-9])\b/i)?.replace(/\s+/g, '-')
    || 'not listed';

  return {
    category: category.replace(/\s+/g, ' ').trim(),
    status: status.replace(/\s+/g, ' ').trim(),
    outcome: outcome.replace(/\s+/g, ' ').trim(),
    location: location.replace(/\s+/g, ' ').trim(),
    reported: reported.replace(/\s+/g, ' ').trim(),
    coordinates: coordinates.replace(/\s+/g, ' ').trim(),
    serviceRequest
  };
}

function matchField(text: string, pattern: RegExp) {
  return text.match(pattern)?.[1]?.trim() || '';
}

function applyTahRetrievalPolicy(
  results: ExpertAtlasSearchResult[],
  worker: IntelligenceWorker,
  searchText: string,
  profile: ReturnType<typeof buildPolicyProfile>
): RetrievalPolicyResult {
  const stages: TahRetrievalPolicyTrace['stages'] = [];
  const workerTerms = buildWorkerTerms(worker, searchText);

  const metadataFiltered = results.filter((result) => {
    if (/^web_\d+/i.test(result.source)) return false;
    if (result.trust < 0.5 || result.vitality <= 0) return false;
    return result.complexity >= profile.minComplexity && result.complexity <= profile.maxComplexity;
  }).filter((result) => isCommandCenterDomainCandidate(result, worker));
  stages.push(stage('metadata filter', results.length, metadataFiltered.length));

  const conceptMatched = metadataFiltered.map((result) => {
    const haystack = [
      result.title,
      result.source,
      result.concepts.join(' '),
      result.text.slice(0, 500)
    ].join(' ').toLowerCase();

    const matches = countTermMatches(haystack, workerTerms);
    const weightedMatchScore = scoreTermMatches(haystack, workerTerms);
    const loadoutMatch = worker.tahLoadout.some((file) => result.source.toLowerCase().includes(file.replace(/\.tah$/i, '').toLowerCase()));
    const conceptOverlap = result.concepts.filter((concept) => workerTerms.some((item) => concept.includes(item.term) || item.term.includes(concept))).length;

    return {
      result,
      matches,
      weightedMatchScore,
      conceptOverlap,
      loadoutMatch,
      kept: weightedMatchScore >= 1.4 || conceptOverlap > 0 || loadoutMatch
    };
  }).filter((item) => item.kept);
  stages.push(stage('concept match', metadataFiltered.length, conceptMatched.length));

  const scored = conceptMatched.map((item) => {
    const densityVitalityScore = item.result.density * 18 + item.result.vitality * 24;
    const conceptScore = item.weightedMatchScore * 8 + item.conceptOverlap * 10 + (item.loadoutMatch ? 96 : 0);
    const complexityFit = (1 - Math.min(1, Math.abs(item.result.complexity - profile.targetComplexity))) * 12;
    const policyScore = item.result.score + densityVitalityScore + conceptScore + complexityFit;

    return {
      ...item,
      policyScore
    };
  }).sort((a, b) => b.policyScore - a.policyScore);
  stages.push(stage('density vitality rank', conceptMatched.length, Math.min(scored.length, 4)));

  const selected = scored.slice(0, 4).map((item, index) => ({
    expertId: item.result.expertId,
    title: item.result.title,
    source: item.result.source,
    score: item.policyScore,
    concepts: item.result.concepts,
    text: compactContext(item.result.text, contextLevelForRank(index)),
    complexity: item.result.complexity,
    density: item.result.density,
    vitality: item.result.vitality,
    contextLevel: contextLevelForRank(index),
    matchReason: item.loadoutMatch
      ? 'loadout'
      : item.conceptOverlap > 0
        ? 'linked concept'
        : 'term match'
  } satisfies CommandContextShard));
  stages.push(stage('compact context output', scored.length, selected.length));

  return {
    results: selected,
    trace: {
      name: 'metadata -> concept -> density/vitality -> linked -> compact',
      contextMode: 'compact',
      targetComplexity: roundMetric(profile.targetComplexity),
      linkedExpansionDepth: 1,
      synonymTerms: workerTerms.length,
      stages
    }
  };
}

function buildWorkerTerms(worker: IntelligenceWorker, searchText: string): WeightedTerm[] {
  const aliases = [
    ...worker.tahLoadout.flatMap((file) => file.replace(/\.tah$/i, '').split(/[_-]+/)),
    ...worker.commandFit
  ];

  return expandCommandTerms(searchText, aliases);
}

function isCommandCenterDomainCandidate(result: ExpertAtlasSearchResult, worker: IntelligenceWorker) {
  const haystack = [
    result.title,
    result.source,
    result.concepts.join(' '),
    result.text.slice(0, 500)
  ].join(' ').toLowerCase();
  const source = result.source.toLowerCase();
  const loadoutRoots = worker.tahLoadout.map((file) => file.replace(/\.tah$/i, '').toLowerCase());
  const workerMarkers = commandCenterMarkersForWorker(worker);
  if (isDisallowedSourceForWorker(source, worker)) return false;

  if (/^wiki_/i.test(result.source) && !/(dallas|tarrant|texas|sunset|lead|listing|agent|comps|market)/.test(source)) {
    return false;
  }

  return loadoutRoots.some((root) => haystack.includes(root)) ||
    workerMarkers.some((marker) => haystack.includes(marker));
}

function isDisallowedSourceForWorker(source: string, worker: IntelligenceWorker) {
  const leadLikeWorkers = new Set(['lead-scoring', 'buyer-intent', 'follow-up-writer']);
  if (leadLikeWorkers.has(worker.id) && /(contract|deed|title|architecture|runtime|raster|medical|catalogue)/.test(source)) {
    return true;
  }

  if (/(architecture|runtime_matrix|rasterizer|compilers|operating|category|sicp|medical|catalogue|unix|sunset_pulse|sunset_wars)/.test(source)) return true;

  return false;
}

function commandCenterMarkersForWorker(worker: IntelligenceWorker) {
  const common = ['agent_brand', 'market_rules'];
  const byWorker: Record<string, string[]> = {
    'lead-scoring': ['lead', 'prospect', 'buyer', 'client', 'contact', 'lead_history', 'agent', 'pipeline'],
    'buyer-intent': ['lead', 'buyer', 'intent', 'motivation', 'lead_history', 'objection_scripts'],
    'follow-up-writer': ['lead', 'buyer', 'seller', 'client', 'follow', 'message', 'agent', 'agent_brand', 'objection_scripts'],
    'listing-summary': ['listing', 'property', 'home', 'listing_context', 'agent_brand', 'comps_context'],
    'listing-spark': ['listing', 'property', 'campaign', 'hook', 'local_business', 'agent_brand'],
    'comp-analysis': ['comps', 'comparable', 'valuation', 'price', 'pricing', 'listing_context', 'comps_context', 'texas_real_estate'],
    'neighborhood-explainer': ['neighborhood', 'community', 'local', 'place', 'area', 'texas_place_history', 'dallas', 'tarrant'],
    'local-commerce': ['local', 'commerce', 'business', 'shop', 'restaurant', 'community', 'texas_place_history', 'dallas', 'tarrant'],
    'market-movement': ['market', 'trend', 'movement', 'comps_context', 'neighborhood_context', 'texas_real_estate', 'dallas', 'tarrant'],
    'agent-voice': ['agent', 'voice', 'brand', 'tone', 'agent_brand', 'objection_scripts'],
    'objection-scripts': ['objection', 'pushback', 'buyer', 'seller', 'agent_brand', 'objection_scripts'],
    supervisor: ['market_rules', 'agent_brand', 'compliance', 'risk', 'safe language']
  };

  return [...common, ...(byWorker[worker.id] || [])];
}

function buildPolicyProfile(searchText: string, worker: IntelligenceWorker) {
  const termCount = extractMemoriaTerms(searchText).length;
  const loadoutComplexity = Math.min(1, worker.tahLoadout.length / 6);
  const commandComplexity = Math.min(1, termCount / 18);
  const targetComplexity = clamp01(commandComplexity * 0.6 + loadoutComplexity * 0.4);
  const spread = worker.slot === 'Supervisor' ? 0.45 : 0.35;

  return {
    targetComplexity,
    minComplexity: clamp01(targetComplexity - spread),
    maxComplexity: clamp01(targetComplexity + spread)
  };
}

function stage(name: string, input: number, kept: number) {
  return {
    name,
    input,
    kept,
    rejected: Math.max(0, input - kept)
  };
}

function contextLevelForRank(index: number): CommandContextShard['contextLevel'] {
  if (index === 0) return 'full';
  if (index <= 2) return 'interface';
  return 'summary';
}

function compactContext(text: string, level: CommandContextShard['contextLevel']) {
  const limits = {
    summary: 220,
    interface: 420,
    full: 720
  };
  return excerpt(text, limits[level || 'summary']);
}

function buildVirtualTahContext(command: string, worker: IntelligenceWorker): CommandContextShard[] {
  const commandConcepts = command.toLowerCase().split(/\s+/).filter((term) => term.length > 3).slice(0, 4);

  return worker.tahLoadout.map((file, index) => ({
    expertId: 900000 + index,
    title: file.replace('.tah', '').replace(/_/g, ' '),
    source: file,
    score: 72 - index * 4,
    concepts: [...commandConcepts, ...file.replace('.tah', '').split('_')].slice(0, 6),
    text: virtualTahText(file, worker, command),
    complexity: 0.5,
    density: 0.65,
    vitality: 0.6,
    contextLevel: contextLevelForRank(index),
    matchReason: 'virtual loadout'
  }));
}

function virtualTahText(file: string, worker: IntelligenceWorker, command: string) {
  const capsules: Record<string, string> = {
    'lead_history.tah': 'Lead history capsule: recent inquiry timing, buyer intent notes, preferred channel, last touch, and next-step readiness.',
    'market_rules.tah': 'Market rules capsule: safe real estate language, current market talking points, pricing caution, and agent-ready compliance boundaries.',
    'agent_brand.tah': 'Agent brand capsule: preferred tone, local expertise, short direct calls to action, and phrases that sound like the agent.',
    'listing_context.tah': 'Listing context capsule: property facts, differentiators, missing fields, seller constraints, and buyer-facing highlights.',
    'neighborhood_context.tah': 'Neighborhood context capsule: area memory, lifestyle notes, commute context, local amenities, and buyer-safe explanations.',
    'local_business_context.tah': 'Local business capsule: nearby commerce, restaurants, services, and community details that support property storytelling.',
    'comps_context.tah': 'Comps context capsule: comparable properties, price posture, recent movement, confidence notes, and valuation caveats.',
    'objection_scripts.tah': 'Objection scripts capsule: buyer and seller pushback patterns, advisory responses, and next-step questions.'
  };

  return `${capsules[file] || 'TAH capsule: private structured context for this worker.'} Worker: ${worker.name}. Command: ${command}`;
}

function buildActions(command: string, worker: IntelligenceWorker, shards: CommandContextShard[]) {
  const lower = command.toLowerCase();
  if (worker.id === 'lead-scoring' || lower.includes('call first')) {
    return [
      "Rank today's leads by urgency, recent engagement, and fit with active inventory.",
      'Open with the lead whose notes show the clearest next-step intent.',
      'Use the agent voice layer to keep the call angle direct and personal.'
    ];
  }

  if (worker.id === 'follow-up-writer') {
    return [
      'Draft one concise message with a specific reason for reaching out.',
      "Reference the lead's last known interest before asking for a next step.",
      'Run supervisor check for unsupported claims before sending.'
    ];
  }

  if (worker.id === 'listing-summary' || worker.id === 'listing-spark') {
    return [
      'Pick the strongest listing hook before writing long-form copy.',
      'Blend listing context with agent brand and nearby market context.',
      'Flag any missing facts that would weaken the campaign angle.'
    ];
  }

  if (worker.id === 'neighborhood-explainer' || worker.id === 'local-commerce') {
    return [
      'Summarize lifestyle context without making unsupported demographic claims.',
      'Pull nearby commerce and place-memory snippets into the explanation.',
      'End with one buyer-safe talking point the agent can use live.'
    ];
  }

  if (worker.id === 'comp-analysis') {
    return [
      'Compare the listing against the closest available comp context.',
      'Separate price signal from weak or stale comparison data.',
      'Return a confidence note before recommending a pricing angle.'
    ];
  }

  return [
    worker.sampleOutput.bullets[0] || 'Send the request to the selected helper.',
    shards[0] ? `Use ${shards[0].source} as the first file to check.` : 'Ask for more detail if the request needs a lead or listing.',
    'Return the next action in agent-ready language.'
  ];
}

function superviseResult(
  command: string,
  worker: IntelligenceWorker,
  result: CommandCenterResponse['result'],
  shards: CommandContextShard[]
) {
  const notes = [
    `Worker fit: ${worker.name} matches "${inferIntent(command, worker)}".`,
    result.confidence >= 82 ? 'Confidence is strong enough for agent review.' : 'Confidence is moderate; ask for lead or listing context before sending externally.'
  ];

  if (!shards.length) {
    notes.push('No TAH shard was retrieved; mark output as draft-only.');
  } else {
    notes.push(`Grounding present: ${shards.slice(0, 2).map((shard) => shard.source).join(', ')}.`);
  }

  return notes;
}

function inferIntent(command: string, worker: IntelligenceWorker) {
  const normalized = command.toLowerCase();
  const matched = worker.commandFit.find((phrase) => normalized.includes(phrase));
  return (matched || worker.name).toUpperCase().replace(/[^A-Z0-9]+/g, '_');
}

function excerpt(text: string, length: number) {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  return cleaned.length > length ? `${cleaned.slice(0, length - 1)}...` : cleaned;
}

function roundMetric(value?: number) {
  if (!Number.isFinite(value || 0)) return 0;
  return Math.round((value || 0) * 100) / 100;
}

function clamp01(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}
