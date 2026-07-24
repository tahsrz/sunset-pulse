import fs from 'fs';
import path from 'path';
import { Annotation, END, START, StateGraph } from '@/lib/compat/langgraphLinear';
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
import {
  runWorkflowOperation,
  summarizeWorkflowAttempts,
  type WorkflowOperationTrace
} from './workflowReliability';
import {
  classifyCommandIntent,
  type CommandIntentClassification
} from './intentClassifier';
import {
  extractListingFacts,
  formatListingFactsBrief,
  summarizeListingFacts,
  type ListingFacts
} from './listingExtractor';
import {
  budgetCommandContext,
  type ContextBudgetTrace
} from './contextBudget';
import type { CivicServiceRecord, CommandActionItem } from './actionTypes';
import { annotateLangfuse, traceLangfuse } from '@/lib/observability/langfuseTracing';

const COMMAND_CENTER_CONFIG = {
  atlas: {
    basePath: path.join(process.cwd(), 'cartridges', 'expert-atlas', 'segmented_expert_atlas'),
    allDomainMask: (1n << 64n) - 1n,
    minTrust: 0.5,
    defaultTopN: 8,
    searchMaxSegments: 12,
    loadoutMaxSegments: 25,
    linkExpansionDepth: 1,
    linkExpansionLimit: 10,
  },
  scoring: {
    precisionWeight: 0.45,
    contextFitWeight: 0.35,
    baseConfidenceWithShards: 18,
    baseConfidenceWithoutShards: 4,
    minConfidence: 62,
    maxConfidence: 96,
    civicMinConfidence: 84,
  },
  retry: {
    contextAttempts: 2,
    memoryAttempts: 2,
    synthesisAttempts: 2,
    supervisorAttempts: 2,
    delayMs: 25,
  },
  policy: {
    supervisorSpread: 0.45,
    workerSpread: 0.35,
    maxShardsToSelect: 4,
    weightedMatchThreshold: 1.4,
    densityWeight: 18,
    vitalityWeight: 24,
    conceptMatchWeight: 8,
    conceptOverlapWeight: 10,
    loadoutBonusScore: 96,
  },
} as const;

const WORKER_DOMAIN_MARKERS: Record<string, string[]> = {
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
  supervisor: ['market_rules', 'agent_brand', 'compliance', 'risk', 'safe language'],
};

const COMMON_DOMAIN_MARKERS = ['agent_brand', 'market_rules'];

const FRIENDLY_SOURCE_NAMES: Record<string, string> = {
  'lead_history.tah': 'Lead notes',
  'market_rules.tah': 'Review guidance',
  'agent_brand.tah': 'Agent voice',
  'listing_context.tah': 'Listing details',
  'neighborhood_context.tah': 'Neighborhood context',
  'neighborhood_intel.tah': 'Neighborhood context',
  'local_business_context.tah': 'Nearby business context',
  'comps_context.tah': 'Pricing context',
  'objection_scripts.tah': 'Response ideas',
  'market_velocity.tah': 'Market movement',
  'dallas_community_intel.tah': 'Dallas community records',
  'dallas_community_intel.hat': 'Dallas community records',
  'dallas_safety_intel.tah': 'Dallas public-safety context',
  'texas_contracts_expertise.tah': 'Texas contract guidance',
  'texas_real_estate.tah': 'Texas real-estate guidance',
  'yield_intel.tah': 'Rural land context',
  'texas_place_history.tah': 'Texas place history',
  'sunset_pulse_expertise.tah': 'Sunset Pulse system notes',
  'security_architect.tah': 'Security review notes',
  'postgres_mastery.tah': 'Database performance notes',
  'spatial_computing.tah': 'Spatial design notes',
  'query_memory.tah': 'Saved conversation memory',
};

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
    civicRecord?: CivicServiceRecord;
    actionItems?: CommandActionItem[];
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
    contextBudget?: ContextBudgetTrace;
    classification?: CommandIntentClassification;
    listingFacts?: ListingFacts;
    progress?: CommandWorkflowProgressEvent[];
    supervisorNotes?: string[];
    queryMemory?: QueryMemoryTrace;
    workflow?: ReturnType<typeof summarizeWorkflowAttempts>;
  };
};

type CommandWorkflowProgressEvent = {
  id: string;
  label: string;
  status: 'complete' | 'queued' | 'skipped';
  detail?: string;
};

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

type CommandRetrievalContext = {
  results: CommandContextShard[];
  diagnostics?: CommandCenterResponse['trace']['atlasDiagnostics'];
  policy?: TahRetrievalPolicyTrace;
};

type CommandGraphState = {
  input: CommandCenterRequest;
  command: string;
  commandId: string;
  classification: CommandIntentClassification;
  listingFacts?: ListingFacts;
  routeMode: 'auto' | 'manual';
  worker: IntelligenceWorker;
  recalledMemory: CommandContextShard[];
  retrievalContext: CommandRetrievalContext;
  contextResults: CommandContextShard[];
  contextBudget: ContextBudgetTrace;
  relayPlan: TahRelayPlan;
  result: CommandCenterResponse['result'];
  supervisorNotes?: string[];
  queryMemory: QueryMemoryTrace;
  workflowAttempts: WorkflowOperationTrace[];
  response: CommandCenterResponse;
};

const CommandGraphAnnotation = Annotation.Root({
  input: Annotation<CommandCenterRequest>(),
  command: Annotation<string>(),
  commandId: Annotation<string>(),
  classification: Annotation<CommandIntentClassification>(),
  listingFacts: Annotation<ListingFacts | undefined>(),
  routeMode: Annotation<'auto' | 'manual'>(),
  worker: Annotation<IntelligenceWorker>(),
  recalledMemory: Annotation<CommandContextShard[]>(),
  retrievalContext: Annotation<CommandRetrievalContext>(),
  contextResults: Annotation<CommandContextShard[]>(),
  contextBudget: Annotation<ContextBudgetTrace>(),
  relayPlan: Annotation<TahRelayPlan>(),
  result: Annotation<CommandCenterResponse['result']>(),
  supervisorNotes: Annotation<string[] | undefined>(),
  queryMemory: Annotation<QueryMemoryTrace>(),
  workflowAttempts: Annotation<WorkflowOperationTrace[]>(),
  response: Annotation<CommandCenterResponse>()
});

type CommandGraphNodeState = typeof CommandGraphAnnotation.State;

const commandCenterGraph = new StateGraph<CommandGraphState>(CommandGraphAnnotation)
  .addNode('route', routeCommandNode)
  .addNode('retrieve', retrieveContextNode)
  .addNode('plan', planRelayNode)
  .addNode('synthesize', synthesizeResultNode)
  .addNode('supervise', superviseResultNode)
  .addNode('remember', rememberQueryNode)
  .addNode('respond', buildResponseNode)
  .addEdge(START, 'route')
  .addEdge('route', 'retrieve')
  .addEdge('retrieve', 'plan')
  .addEdge('plan', 'synthesize')
  .addEdge('synthesize', 'supervise')
  .addEdge('supervise', 'remember')
  .addEdge('remember', 'respond')
  .addEdge('respond', END)
  .compile();

export async function runCommandCenterCommand(input: CommandCenterRequest): Promise<CommandCenterResponse> {
  const command = input.command.trim();
  if (!command) {
    throw new Error('Command is required.');
  }

  return traceLangfuse(
    'command-center.graph',
    {
      metadata: {
        commandLength: command.length,
        relayMode: input.relayMode || 'briefing',
        supervisor: Boolean(input.supervisor),
        routeMode: input.selectedWorkerId ? 'manual' : 'auto',
        feature: 'command-center',
        framework: 'langgraph'
      }
    },
    async () => {
      const finalState = await commandCenterGraph.invoke({ input, command });
      return finalState.response;
    },
    {
      asType: 'agent',
      propagate: {
        metadata: {
          feature: 'command-center',
          framework: 'langgraph',
          routeMode: input.selectedWorkerId ? 'manual' : 'auto',
          relayMode: input.relayMode || 'briefing',
          supervisor: Boolean(input.supervisor)
        },
        tags: ['command-center', 'langgraph'],
        traceName: 'command-center.graph',
        version: process.env.LANGFUSE_RELEASE || process.env.VERCEL_GIT_COMMIT_SHA || 'local'
      }
    }
  );
}

async function routeCommandNode(state: CommandGraphNodeState): Promise<Partial<CommandGraphState>> {
  return traceLangfuse(
    'command-center.route',
    {
      metadata: {
        stage: 'route',
        commandLength: state.command.length,
        requestedWorkerId: state.input.selectedWorkerId,
        routeMode: state.input.selectedWorkerId ? 'manual' : 'auto'
      }
    },
    async () => {
      const { command, input } = state;
      const classification = classifyCommandIntent(command, input.selectedWorkerId);
      const manualWorker = input.selectedWorkerId
        ? intelligenceWorkers.find((worker) => worker.id === input.selectedWorkerId)
        : undefined;
      const classifiedWorker = intelligenceWorkers.find((worker) => worker.id === classification.workerId);
      const worker = manualWorker || classifiedWorker || chooseWorkerForCommand(command);
      const routeMode: 'auto' | 'manual' = manualWorker ? 'manual' : 'auto';
      const commandId = `cmd_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
      const listingFacts = classification.listingFacts?.isListingLike ? classification.listingFacts : undefined;

      annotateLangfuse({
        metadata: {
          commandId,
          intent: classification.intent,
          intentConfidence: classification.confidence,
          intentReason: classification.reason,
          listingSignalCount: classification.listingFacts?.signalCount || 0,
          workerId: worker.id,
          workerName: worker.name,
          routeMode
        }
      });

      return { command, commandId, classification, listingFacts, routeMode, worker, workflowAttempts: [] };
    }
  );
}

async function retrieveContextNode(state: CommandGraphNodeState): Promise<Partial<CommandGraphState>> {
  return traceLangfuse(
    'command-center.retrieve',
    {
      metadata: {
        stage: 'retrieve',
        workerId: state.worker.id,
        workerTahFiles: state.worker.tahLoadout.length
      }
    },
    async () => {
      const { command, classification, listingFacts, worker } = state;
      const workflowAttempts = [...(state.workflowAttempts || [])];
      const retrievalCommand = retrievalTextForCommand(command, listingFacts);
      const recalled = await runWorkflowOperation<CommandContextShard[]>({
        node: 'retrieve',
        operation: 'query-memory-recall',
        maxAttempts: COMMAND_CENTER_CONFIG.retry.memoryAttempts,
        delayMs: COMMAND_CENTER_CONFIG.retry.delayMs,
        fallback: () => [],
        fallbackLabel: 'skip query memory recall',
        onError: (err) => console.warn('[COMMAND_CENTER] Memory recall degraded:', err)
      }, () => classification.requiresMemory ? recallQueryMemories(command, worker, { intent: classification.intent }) : []);
      const retrieved = await runWorkflowOperation<CommandRetrievalContext>({
        node: 'retrieve',
        operation: 'atlas-context-retrieval',
        maxAttempts: COMMAND_CENTER_CONFIG.retry.contextAttempts,
        delayMs: COMMAND_CENTER_CONFIG.retry.delayMs,
        fallback: () => ({ results: buildVirtualTahContext(command, worker) }),
        fallbackLabel: 'virtual context',
        fallbackResult: (context) => context.results.some((shard) => /fallback|virtual/i.test(shard.matchReason || ''))
          ? 'virtual context'
          : false,
        onError: (err) => console.error('[COMMAND_CENTER] Context retrieval error:', err)
      }, () => classification.requiresAtlas ? retrieveTahContext(retrievalCommand, worker) : { results: [] });
      workflowAttempts.push(recalled.trace, retrieved.trace);

      const listingShard = listingFacts ? [listingFactsToContextShard(listingFacts)] : [];
      const budgeted = budgetCommandContext({
        intent: classification.intent,
        memoryShards: recalled.value,
        atlasShards: [...listingShard, ...retrieved.value.results],
      });
      const recalledMemory = budgeted.memoryShards;
      const context = {
        ...retrieved.value,
        results: budgeted.atlasShards,
      };
      const contextResults = budgeted.mergedShards;

      annotateLangfuse({
        metadata: {
          recalledMemoryCount: recalledMemory.length,
          retrievedShardCount: context.results.length,
          mergedShardCount: contextResults.length,
          contextBudgetChars: budgeted.trace.estimatedChars,
          contextBudgetTotalKept: budgeted.trace.totalKept,
          atlasVisitedSegments: context.diagnostics?.visitedSegments,
          atlasPayloadReads: context.diagnostics?.payloadReads,
          retrievalStageCount: context.policy?.stages.length,
          workflowStatus: summarizeWorkflowAttempts(workflowAttempts).status,
          workflowRetryCount: workflowAttempts.filter((attempt) => attempt.retried).length
        }
      });

      return {
        recalledMemory,
        retrievalContext: context,
        contextResults,
        contextBudget: budgeted.trace,
        workflowAttempts
      };
    },
    { asType: 'retriever' }
  );
}

async function planRelayNode(state: CommandGraphNodeState): Promise<Partial<CommandGraphState>> {
  return traceLangfuse(
    'command-center.plan',
    {
      metadata: {
        stage: 'plan',
        workerId: state.worker.id,
        requestedRelayMode: state.input.relayMode || 'briefing',
        shardCount: state.contextResults.length
      }
    },
    async () => {
      const { contextResults, input, worker } = state;
      const relayPlan = buildTahRelayPlan(worker, contextResults, input.relayMode);

      annotateLangfuse({
        metadata: {
          relayMode: relayPlan.mode,
          templateId: relayPlan.templateId,
          templateName: relayPlan.templateName
        }
      });

      return { relayPlan };
    },
    { asType: 'chain' }
  );
}

async function synthesizeResultNode(state: CommandGraphNodeState): Promise<Partial<CommandGraphState>> {
  return traceLangfuse(
    'command-center.synthesize',
    {
      metadata: {
        stage: 'synthesize',
        workerId: state.worker.id,
        templateId: state.relayPlan.templateId,
        shardCount: state.contextResults.length
      }
    },
    async () => {
      const { command, worker, contextResults, relayPlan, listingFacts } = state;
      const workflowAttempts = [...(state.workflowAttempts || [])];
      const synthesized = await runWorkflowOperation<CommandCenterResponse['result']>({
        node: 'synthesize',
        operation: 'worker-result',
        maxAttempts: COMMAND_CENTER_CONFIG.retry.synthesisAttempts,
        delayMs: COMMAND_CENTER_CONFIG.retry.delayMs,
        fallbackLabel: 'graceful worker result',
        fallback: () => {
          const fallbackActions = buildActions(command, worker, contextResults, listingFacts);
          return {
            title: worker.sampleOutput.title,
            summary: `Processed the request with ${worker.name}. Request: "${commandDisplayText(command)}".`,
            actions: fallbackActions,
            confidence: COMMAND_CENTER_CONFIG.scoring.minConfidence,
            relayPlan,
            deliverable: buildCommandDeliverable(command, worker, contextResults, relayPlan, fallbackActions)
          };
        },
        onError: (err) => console.error('[COMMAND_CENTER] Synthesis failed:', err)
      }, () => synthesizeWorkerResult(command, worker, contextResults, relayPlan, listingFacts));
      workflowAttempts.push(synthesized.trace);
      const result = synthesized.value;

      annotateLangfuse({
        metadata: {
          confidence: result.confidence,
          actionCount: result.actions.length,
          frameCount: result.deliverable.frames.length,
          workflowStatus: summarizeWorkflowAttempts(workflowAttempts).status
        }
      });

      return { result, workflowAttempts };
    },
    { asType: 'generation' }
  );
}

async function superviseResultNode(state: CommandGraphNodeState): Promise<Partial<CommandGraphState>> {
  return traceLangfuse(
    'command-center.supervise',
    {
      metadata: {
        stage: 'supervise',
        workerId: state.worker.id,
        supervisorEnabled: Boolean(state.input.supervisor)
      }
    },
    async () => {
      const { command, contextResults, input, result, worker } = state;
      const workflowAttempts = [...(state.workflowAttempts || [])];
      let supervisorNotes: string[] | undefined;

      if (input.supervisor) {
        supervisorNotes = [
          'Supervisor review queued asynchronously; review before external transmission.',
          ...superviseResult(command, worker, result, contextResults).slice(0, 2)
        ];
      }

      annotateLangfuse({
        metadata: {
          noteCount: supervisorNotes?.length || 0,
          workflowStatus: summarizeWorkflowAttempts(workflowAttempts).status
        }
      });

      return { supervisorNotes, workflowAttempts };
    },
    { asType: 'guardrail' }
  );
}

async function rememberQueryNode(state: CommandGraphNodeState): Promise<Partial<CommandGraphState>> {
  return traceLangfuse(
    'command-center.remember',
    {
      metadata: {
        stage: 'remember',
        commandId: state.commandId,
        workerId: state.worker.id,
        sourceCount: state.contextResults.length
      }
    },
    async () => {
      const { command, commandId, classification, contextResults, recalledMemory, relayPlan, result, worker } = state;
      const workflowAttempts = [...(state.workflowAttempts || [])];
      const remembered = await runWorkflowOperation<QueryMemoryTrace>({
        node: 'remember',
        operation: 'query-memory-save',
        maxAttempts: COMMAND_CENTER_CONFIG.retry.memoryAttempts,
        delayMs: COMMAND_CENTER_CONFIG.retry.delayMs,
        fallbackLabel: 'memory unavailable trace',
        fallback: (err) => ({
          status: 'unavailable',
          path: path.relative(
            process.cwd(),
            path.resolve(process.env.PULSE_QUERY_MEMORY_PATH || path.join(process.cwd(), 'cartridges', 'query_memory.tah'))
          ),
          recalled: recalledMemory.length,
          saved: false,
          reason: err instanceof Error ? err.message : 'query memory write failed',
        }),
        onError: (err) => console.warn('[COMMAND_CENTER] Memory persistence degraded:', err)
      }, () => {
        const trace = saveQueryMemory({
          commandId,
          command,
          intent: classification.intent,
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
        trace.recalled = recalledMemory.length;
        if (trace.status === 'unavailable') {
          throw new Error(trace.reason || 'query memory write failed');
        }
        return trace;
      });
      workflowAttempts.push(remembered.trace);
      const queryMemory = remembered.value;

      annotateLangfuse({
        metadata: {
          queryMemoryStatus: queryMemory.status,
          queryMemorySaved: queryMemory.saved,
          recalledMemoryCount: recalledMemory.length,
          workflowStatus: summarizeWorkflowAttempts(workflowAttempts).status
        }
      });

      return { queryMemory, workflowAttempts };
    },
    { asType: 'tool' }
  );
}

async function buildResponseNode(state: CommandGraphNodeState): Promise<Partial<CommandGraphState>> {
  return traceLangfuse(
    'command-center.respond',
    {
      metadata: {
        stage: 'respond',
        commandId: state.commandId,
        workerId: state.worker.id
      }
    },
    async () => {
      const {
        command,
        commandId,
        classification,
        contextBudget,
        contextResults,
        listingFacts,
        queryMemory,
        result,
        routeMode,
        supervisorNotes,
        retrievalContext,
        worker,
        workflowAttempts
      } = state;
      const workflow = summarizeWorkflowAttempts(workflowAttempts || []);
      const response: CommandCenterResponse = {
        commandId,
        intent: classification.intent,
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
          atlasDiagnostics: retrievalContext.diagnostics,
          retrievalPolicy: retrievalContext.policy,
          contextBudget,
          classification,
          listingFacts,
          progress: buildProgressEvents(classification, contextBudget, Boolean(supervisorNotes?.length)),
          supervisorNotes,
          queryMemory,
          workflow
        }
      };

      annotateLangfuse({
        metadata: {
          selectedShardCount: response.trace.selectedShards.length,
          atlasVisitedSegments: response.trace.atlasDiagnostics?.visitedSegments,
          retrievalStageCount: response.trace.retrievalPolicy?.stages.length,
          workflowStatus: workflow.status,
          workflowFallbackOperations: workflow.fallbackOperations,
          workflowRetriedOperations: workflow.retriedOperations
        }
      });

      return { response };
    }
  );
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

function retrievalTextForCommand(command: string, listingFacts?: ListingFacts) {
  const listingBrief = formatListingFactsBrief(listingFacts);
  return listingBrief ? `${command}\n\n${listingBrief}` : command;
}

function listingFactsToContextShard(facts: ListingFacts): CommandContextShard {
  return {
    expertId: 870001,
    title: 'Structured pasted listing facts',
    source: 'pasted_listing',
    score: 118,
    concepts: [
      'listing',
      facts.mlsId ? 'mls' : '',
      facts.price ? 'price' : '',
      facts.address ? 'address' : '',
      facts.missingFields.length ? 'missing fields' : '',
    ].filter(Boolean),
    text: formatListingFactsBrief(facts),
    complexity: 0.36,
    density: 0.92,
    vitality: 0.86,
    contextLevel: 'full',
    matchReason: 'structured listing extraction'
  };
}

function buildProgressEvents(
  classification: CommandIntentClassification,
  contextBudget: ContextBudgetTrace | undefined,
  supervisorQueued: boolean
): CommandWorkflowProgressEvent[] {
  return [
    {
      id: 'classified',
      label: 'Classified',
      status: 'complete',
      detail: `${classification.intent} (${classification.confidence}%)`
    },
    {
      id: 'worker',
      label: 'Worker selected',
      status: 'complete',
      detail: classification.workerId
    },
    {
      id: 'listing',
      label: 'Listing extracted',
      status: classification.requiresListingParse
        ? classification.listingFacts?.isListingLike ? 'complete' : 'skipped'
        : 'skipped',
      detail: classification.listingFacts?.isListingLike
        ? `${classification.listingFacts.signalCount} listing signals`
        : 'No pasted listing detected'
    },
    {
      id: 'context',
      label: 'Context budgeted',
      status: contextBudget ? 'complete' : 'skipped',
      detail: contextBudget ? `${contextBudget.totalKept} shards, ${contextBudget.estimatedChars} chars` : undefined
    },
    {
      id: 'answer',
      label: 'Answer generated',
      status: 'complete'
    },
    {
      id: 'supervisor',
      label: 'Supervisor review',
      status: supervisorQueued ? 'queued' : 'skipped',
      detail: supervisorQueued ? 'Non-blocking review note attached' : 'Safety check off'
    }
  ];
}

function retrieveTahContext(command: string, worker: IntelligenceWorker): CommandRetrievalContext {
  const hatPath = `${COMMAND_CENTER_CONFIG.atlas.basePath}.hat`;
  const tahPath = `${COMMAND_CENTER_CONFIG.atlas.basePath}.tah`;

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
      topN: COMMAND_CENTER_CONFIG.atlas.defaultTopN,
      maxSegments: COMMAND_CENTER_CONFIG.atlas.searchMaxSegments,
      minTrust: COMMAND_CENTER_CONFIG.atlas.minTrust,
      linkExpansionDepth: COMMAND_CENTER_CONFIG.atlas.linkExpansionDepth,
      linkExpansionLimit: COMMAND_CENTER_CONFIG.atlas.linkExpansionLimit
    });
    const loadoutText = expandedTextForSearch([
      worker.tahLoadout.join(' '),
      worker.commandFit.join(' '),
      worker.name
    ].join(' '));
    const loadoutResponse = retriever.search({
      text: loadoutText,
      domainMask: COMMAND_CENTER_CONFIG.atlas.allDomainMask,
      targetComplexity: policyProfile.targetComplexity,
      minComplexity: policyProfile.minComplexity,
      maxComplexity: policyProfile.maxComplexity,
      topN: COMMAND_CENTER_CONFIG.atlas.defaultTopN,
      maxSegments: COMMAND_CENTER_CONFIG.atlas.loadoutMaxSegments,
      minTrust: COMMAND_CENTER_CONFIG.atlas.minTrust,
      linkExpansionDepth: COMMAND_CENTER_CONFIG.atlas.linkExpansionDepth,
      linkExpansionLimit: COMMAND_CENTER_CONFIG.atlas.linkExpansionLimit
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
        stage('saved context fallback', mergedResults.length, finalResults.length)
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
  relayPlan: TahRelayPlan,
  listingFacts?: ListingFacts
): CommandCenterResponse['result'] {
  const civicRecord = parseCivicServiceRecord(command);
  if (civicRecord && worker.id === 'dallas-community') {
    return synthesizeCivicServiceResult(command, worker, shards, relayPlan, civicRecord);
  }

  const topShard = shards[0];
  const sourcePhrase = topShard
    ? `I found useful context in ${sourceDisplayName(topShard.source)} about ${topShard.concepts.slice(0, 3).join(', ') || 'this topic'}.`
    : 'I did not find a strong saved note yet, so I used the selected helper and its standard context.';

  const actions = buildActions(command, worker, shards, listingFacts);
  const confidence = Math.min(
    COMMAND_CENTER_CONFIG.scoring.maxConfidence,
    Math.max(
      COMMAND_CENTER_CONFIG.scoring.minConfidence,
      Math.round(
        worker.stats.precision * COMMAND_CENTER_CONFIG.scoring.precisionWeight +
        worker.stats.contextFit * COMMAND_CENTER_CONFIG.scoring.contextFitWeight +
        (shards.length ? COMMAND_CENTER_CONFIG.scoring.baseConfidenceWithShards : COMMAND_CENTER_CONFIG.scoring.baseConfidenceWithoutShards)
      )
    )
  );

  return {
    title: worker.sampleOutput.title,
    summary: listingFacts?.isListingLike
      ? buildListingSummary(sourcePhrase, worker, listingFacts)
      : `${sourcePhrase} ${worker.role} Request: "${commandDisplayText(command)}".`,
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
  const confidence = Math.min(
    COMMAND_CENTER_CONFIG.scoring.maxConfidence,
    Math.max(COMMAND_CENTER_CONFIG.scoring.civicMinConfidence, worker.stats.precision)
  );
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
    civicRecord: record,
    actionItems: buildCivicServiceActions(record),
    relayPlan,
    deliverable: buildCivicServiceDeliverable(record, shards, relayPlan, actions)
  };
}

function buildListingSummary(sourcePhrase: string, worker: IntelligenceWorker, facts: ListingFacts) {
  const factSummary = summarizeListingFacts(facts) || 'pasted listing details';
  const featurePhrase = facts.features.length
    ? ` Notable extracted features: ${facts.features.slice(0, 5).join(', ')}.`
    : '';
  const missingPhrase = facts.missingFields.length
    ? ` Verify missing fields before public copy: ${facts.missingFields.join(', ')}.`
    : '';

  return `${sourcePhrase} ${worker.role} I extracted ${factSummary}.${featurePhrase}${missingPhrase}`;
}

function buildCivicServiceActions(record: CivicServiceRecord): CommandActionItem[] {
  return [
    {
      id: 'open-dallas-311',
      label: 'Open Dallas 311',
      description: 'Open the official Dallas service-request portal and search with the copied request ID.',
      kind: 'external-link',
      href: record.lookupUrl
    },
    {
      id: 'copy-service-request',
      label: 'Copy Request ID',
      description: `Copy ${record.serviceRequest} for lookup, notes, or follow-up.`,
      kind: 'copy',
      copyText: record.serviceRequest
    },
    {
      id: 'draft-follow-up',
      label: 'Draft Follow-Up',
      description: 'Start a client-safe explanation using this parsed record.',
      kind: 'command',
      command: `Write a short client-safe explanation of Dallas 311 service request ${record.serviceRequest} at ${record.location}. Say it is a ${record.category} record with status ${record.status} and outcome ${record.outcome}. Mention that coordinates ${record.coordinates} should be verified by address.`
    },
    {
      id: 'saved-context',
      label: 'Saved Locally',
      description: 'This run is saved to local query memory when local memory is enabled.',
      kind: 'saved'
    }
  ];
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
    const signal = shard ? extractShardSignal(shard) : `Use ${worker.name} to answer: ${commandDisplayText(command)}`;
    const action = actions[index % actions.length] || worker.sampleOutput.bullets[index % worker.sampleOutput.bullets.length] || 'Return the next practical move.';
    const sourceAnchor = shard
      ? `${sourceDisplayName(shard.source)} / ${sourceReasonDisplayName(shard.matchReason || 'retrieved context')}`
      : sourceDisplayName(worker.tahLoadout[index % worker.tahLoadout.length]) || 'helper context';

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
      .map((card) => `${sourceDisplayName(card.source)} (${sourceReasonDisplayName(card.matchReason)})`)
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
  const sourceAnchor = sourceSummary.replace(/^Sources checked:\s*/i, '').replace(/\.$/, '');
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
      sourceAnchor: sourceSummary.replace(/^Sources checked:\s*/i, '').replace(/\.$/, '')
    },
    {
      label: 'Why it works',
      title: 'Reason',
      visualDirection: 'Show one small rationale strip beneath the message.',
      body: actions[0] || worker.role,
      speakerNote: 'Keep this as support, not the main answer.',
      sourceAnchor: sourceSummary.replace(/^Sources checked:\s*/i, '').replace(/\.$/, '')
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
    ? [...new Set(shards.map((shard) => shard.source))].slice(0, 5).map(sourceDisplayName)
    : worker.tahLoadout.slice(0, 5).map(sourceDisplayName);

  return `Sources checked: ${sourceNames.join(', ')}.`;
}

export function sourceDisplayName(source?: string): string {
  const normalized = String(source || '').trim();
  if (!normalized) return 'Saved context';
  if (FRIENDLY_SOURCE_NAMES[normalized]) return FRIENDLY_SOURCE_NAMES[normalized];

  return normalized
    .replace(/\.(tah|hat)$/i, '')
    .replace(/^wiki_/i, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase()) || 'Saved context';
}

function sourceReasonDisplayName(reason?: string): string {
  const normalized = String(reason || '').toLowerCase();
  if (normalized.includes('query memory')) return 'saved note';
  if (normalized.includes('virtual') || normalized.includes('loadout') || normalized.includes('fallback')) return 'saved context';
  if (normalized.includes('concept')) return 'related topic';
  if (normalized.includes('term')) return 'word match';
  if (normalized.includes('retrieved') || normalized.includes('policy')) return 'search match';
  return reason || 'context';
}

function extractShardSignal(shard: CommandContextShard) {
  if (shard.source.toLowerCase() === 'query_memory.tah') {
    const concepts = shard.concepts.slice(0, 3).join(', ');
    return `A saved note matched this request${concepts ? ` (${concepts})` : ''}.`;
  }

  const cleaned = shard.text
    .replace(/\r?\n/g, ' ')
    .replace(/\b(TYPE|CREATED_AT|COMMAND|WORKER|TEMPLATE|MODE|SOURCES|LEARNED|ACTIONS|TITLE|CONCEPT|ALIASES|DOMAIN|TRUST|VITALITY|PURPOSE|OUTPUT SHAPE|SOURCE|SLUG|QUERY|CONTENT):\s*/gi, '')
    .replace(/Learned which TAH sources support the explanation:/gi, 'Sources used:')
    .replace(/Learned how to frame this as/gi, 'Answer style:')
    .replace(/Learned the safe delivery shape:/gi, 'Answer flow:')
    .replace(/\bTAH sources\b/gi, 'saved sources')
    .replace(/\bTAH context\b/gi, 'saved context')
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
    serviceRequest,
    lookupUrl: 'https://dallascrm.my.site.com/public/s/service-requests?servicerequested=all'
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
    if (result.trust < COMMAND_CENTER_CONFIG.atlas.minTrust || result.vitality <= 0) return false;
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
      kept: weightedMatchScore >= COMMAND_CENTER_CONFIG.policy.weightedMatchThreshold || conceptOverlap > 0 || loadoutMatch
    };
  }).filter((item) => item.kept);
  stages.push(stage('concept match', metadataFiltered.length, conceptMatched.length));

  const scored = conceptMatched.map((item) => {
    const densityVitalityScore = item.result.density * COMMAND_CENTER_CONFIG.policy.densityWeight + item.result.vitality * COMMAND_CENTER_CONFIG.policy.vitalityWeight;
    const conceptScore = item.weightedMatchScore * COMMAND_CENTER_CONFIG.policy.conceptMatchWeight + item.conceptOverlap * COMMAND_CENTER_CONFIG.policy.conceptOverlapWeight + (item.loadoutMatch ? COMMAND_CENTER_CONFIG.policy.loadoutBonusScore : 0);
    const complexityFit = (1 - Math.min(1, Math.abs(item.result.complexity - profile.targetComplexity))) * 12;
    const policyScore = item.result.score + densityVitalityScore + conceptScore + complexityFit;

    return {
      ...item,
      policyScore
    };
  }).sort((a, b) => b.policyScore - a.policyScore);
  stages.push(stage('density vitality rank', conceptMatched.length, Math.min(scored.length, COMMAND_CENTER_CONFIG.policy.maxShardsToSelect)));

  const selected = scored.slice(0, COMMAND_CENTER_CONFIG.policy.maxShardsToSelect).map((item, index) => ({
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
      linkedExpansionDepth: COMMAND_CENTER_CONFIG.atlas.linkExpansionDepth,
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
  return [...COMMON_DOMAIN_MARKERS, ...(WORKER_DOMAIN_MARKERS[worker.id] || [])];
}

function buildPolicyProfile(searchText: string, worker: IntelligenceWorker) {
  const termCount = extractMemoriaTerms(searchText).length;
  const loadoutComplexity = Math.min(1, worker.tahLoadout.length / 6);
  const commandComplexity = Math.min(1, termCount / 18);
  const targetComplexity = clamp01(commandComplexity * 0.6 + loadoutComplexity * 0.4);
  const spread = worker.slot === 'Supervisor'
    ? COMMAND_CENTER_CONFIG.policy.supervisorSpread
    : COMMAND_CENTER_CONFIG.policy.workerSpread;

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
    matchReason: 'saved context fallback'
  }));
}

function virtualTahText(file: string, worker: IntelligenceWorker, command: string) {
  const fallbackContext: Record<string, string> = {
    'lead_history.tah': 'Lead notes: recent interest, buyer intent, preferred contact method, last touch, and likely next step.',
    'market_rules.tah': 'Review guidance: safe real-estate wording, market talking points, pricing cautions, and claim boundaries.',
    'agent_brand.tah': 'Agent voice: preferred tone, local expertise, short calls to action, and phrases that sound natural for the agent.',
    'listing_context.tah': 'Listing details: property facts, strongest selling points, missing fields, seller constraints, and buyer-facing highlights.',
    'neighborhood_context.tah': 'Neighborhood context: area notes, lifestyle details, commute context, nearby amenities, and buyer-safe explanations.',
    'local_business_context.tah': 'Nearby business context: restaurants, shops, services, and community details that can support property storytelling.',
    'comps_context.tah': 'Pricing context: comparable properties, price posture, recent movement, confidence notes, and valuation cautions.',
    'objection_scripts.tah': 'Response ideas: common buyer and seller concerns, helpful replies, and practical next-step questions.',
  };

  return `${fallbackContext[file] || 'General background for this helper.'} Helper: ${worker.name}. Request: ${commandDisplayText(command)}`;
}

function buildActions(command: string, worker: IntelligenceWorker, shards: CommandContextShard[], listingFacts?: ListingFacts) {
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
    if (listingFacts?.isListingLike) {
      const missing = listingFacts.missingFields.length
        ? ` Missing fields to verify: ${listingFacts.missingFields.join(', ')}.`
        : '';
      return [
        `Lead with the strongest verified hook from the pasted listing.${missing}`,
        'Use the extracted facts first, then add agent voice and nearby context only where supported.',
        'Flag any unsupported or missing facts before turning this into public copy.'
      ];
    }

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

function commandDisplayText(command: string): string {
  const cleaned = command.replace(/\s+/g, ' ').trim();
  const listingSummary = summarizeListingFacts(extractListingFacts(cleaned));
  if (listingSummary) return listingSummary;
  return excerpt(cleaned, 280);
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
