import type { IntelligenceWorker } from './workerRoster';
import type { CivicServiceRecord, CommandActionItem } from './actionTypes';

export type RelayMode = 'briefing' | 'slideshow' | 'puppetshow' | 'field-board' | 'script';

export type FullCommandResponse = {
  commandId: string;
  commandText?: string;
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
    relayPlan: {
      templateId: string;
      templateName: string;
      mode: RelayMode;
      purpose: string;
      visual: {
        motif: string;
        layout: string;
        cues: string[];
      };
      format: {
        mode: RelayMode;
        name: string;
        useWhen: string;
        frameLabel: string;
        rhythm: string;
        visualDirection: string;
        outputContract: string[];
      };
      availableFormats: Array<{
        mode: RelayMode;
        name: string;
        useWhen: string;
      }>;
      words: {
        voice: string;
        explanationMoves: string[];
        avoid: string[];
      };
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
    deliverable: {
      mode: RelayMode;
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
    retrievalPolicy?: {
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
    contextBudget?: {
      intent: string;
      maxMemoryShards: number;
      maxAtlasShards: number;
      maxTotalShards: number;
      maxCharsPerShard: number;
      maxTokensPerShard?: number;
      configSource?: 'default' | 'env';
      memoryInput: number;
      atlasInput: number;
      memoryKept: number;
      atlasKept: number;
      totalKept: number;
      estimatedChars: number;
      estimatedTokens?: number;
    };
    classification?: {
      intent: string;
      confidence: number;
      workerId: string;
      reason: string;
      requiresListingParse: boolean;
      requiresMemory: boolean;
      requiresAtlas: boolean;
    };
    listingFacts?: {
      isListingLike: boolean;
      signalCount: number;
      confidence: number;
      extractedFields: string[];
      mlsId?: string;
      address?: string;
      city?: string;
      state?: string;
      zip?: string;
      price?: string;
      beds?: string;
      baths?: string;
      sqft?: string;
      lotSize?: string;
      yearBuilt?: string;
      propertyType?: string;
      status?: string;
      daysOnMarket?: string;
      hoaFee?: string;
      parking?: string;
      brokerage?: string;
      remarks?: string;
      features: string[];
      hooks: string[];
      warnings: string[];
      missingFields: string[];
    };
    progress?: Array<{
      id: string;
      label: string;
      status: 'complete' | 'queued' | 'skipped';
      detail?: string;
    }>;
    supervisorNotes?: string[];
    supervisorReview?: {
      status: 'queued' | 'succeeded' | 'failed' | 'disabled' | 'unavailable';
      path: string;
      reviewId?: string;
      severity?: 'info' | 'warning' | 'error';
      findingCount?: number;
      reason?: string;
    };
    queryMemory?: {
      status: 'saved' | 'disabled' | 'unavailable';
      path: string;
      recalled: number;
      saved: boolean;
      reason?: string;
      sqlsync?: {
        status: 'staged' | 'disabled' | 'unavailable';
        path: string;
        mutationId?: string;
        saved: boolean;
        reason?: string;
      };
    };
    workflow?: WorkflowTrace;
    postWorkflow?: WorkflowTrace;
    commandPost?: {
      status: 'linked' | 'access_denied' | 'unavailable';
      endpoint: string;
      consoleHref: string;
      accessMode?: string;
      reason?: string;
      masterArchive?: {
        status: string;
        sourceCount: number;
        shardCount: number;
      };
      pendingTerminalIntentCount?: number;
      commandRouterModes?: string[];
      statusProbe?: {
        ok: boolean;
        action: string;
        reply: string;
      };
    };
    voltagent?: {
      status: 'ready' | 'standby' | 'error' | 'unavailable';
      framework: 'ai-sdk' | 'voltagent';
      agentId?: 'sunset-command-advisor';
      model?: string;
      provider?: string;
      credentialEnv?: string;
      reason?: string;
      text?: string;
      tools?: Array<{
        name: string;
        purpose: string;
      }>;
      route?: {
        workerId: string;
        workerName: string;
        routeMode: 'auto' | 'manual';
        tahFiles: string[];
      };
    };
    tensorzero?: {
      status: 'scored' | 'disabled' | 'unavailable';
      framework: 'tensorzero';
      path?: string;
      evaluationId?: string;
      projectName?: string;
      functionName?: 'sunset_command_center';
      variantName?: string;
      score?: number;
      metrics?: {
        command_center_quality: number;
        command_center_grounded: boolean;
        command_center_actionable: number;
        command_center_safety: number;
      };
      gateway?: {
        status: 'not_configured' | 'configured';
        url?: string;
        note: string;
      };
      saved: boolean;
      reason?: string;
    };
  };
};

export type WorkflowTrace = {
  status: 'ok' | 'degraded';
  attempts: Array<{
    node: string;
    operation: string;
    status: 'success' | 'fallback' | 'failed';
    attempts: number;
    retried: boolean;
    recovered: boolean;
    durationMs: number;
    error?: string;
    fallback?: string;
  }>;
  failedOperations: number;
  fallbackOperations: number;
  retriedOperations: number;
};

// The console accepts a smaller result fixture; optional rich fields preserve
// the full API payload without casting away diagnostics in the workspace.
export type CommandProgressEvent = { id: string; label: string; status: string; detail?: string };
export type CommandResponse = Pick<FullCommandResponse, 'commandId'> & Partial<Pick<FullCommandResponse, 'commandText' | 'intent' | 'model' | 'tahFiles'>> & {
  worker: Omit<FullCommandResponse['worker'], 'slot'> & Partial<Pick<FullCommandResponse['worker'], 'slot'>>;
  result: Omit<FullCommandResponse['result'], 'relayPlan' | 'deliverable'> & {
    relayPlan?: FullCommandResponse['result']['relayPlan'];
    deliverable: Pick<FullCommandResponse['result']['deliverable'], 'title' | 'copyReadyText' | 'sourceSummary'> & Partial<Pick<FullCommandResponse['result']['deliverable'], 'mode' | 'frames'>>;
  };
  trace?: Omit<Partial<FullCommandResponse['trace']>, 'selectedShards' | 'progress'> & {
    selectedShards?: Array<Pick<FullCommandResponse['trace']['selectedShards'][number], 'title' | 'source' | 'excerpt'> & Partial<Omit<FullCommandResponse['trace']['selectedShards'][number], 'title' | 'source' | 'excerpt'>>>;
    progress?: CommandProgressEvent[];
  };
};
