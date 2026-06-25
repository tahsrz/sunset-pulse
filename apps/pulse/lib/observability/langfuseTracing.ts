import { LangfuseSpanProcessor } from '@langfuse/otel';
import {
  propagateAttributes,
  setLangfuseTracerProvider,
  startActiveObservation,
  updateActiveObservation,
  type LangfuseObservationType
} from '@langfuse/tracing';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';

let provider: NodeTracerProvider | null = null;
let processor: LangfuseSpanProcessor | null = null;
let initialized = false;

export function isLangfuseEnabled() {
  return Boolean(process.env.LANGFUSE_PUBLIC_KEY && process.env.LANGFUSE_SECRET_KEY);
}

function ensureLangfuseTracing() {
  if (initialized) return;

  if (!isLangfuseEnabled()) return;

  initialized = true;
  processor = new LangfuseSpanProcessor({
    publicKey: process.env.LANGFUSE_PUBLIC_KEY,
    secretKey: process.env.LANGFUSE_SECRET_KEY,
    baseUrl: process.env.LANGFUSE_BASE_URL || process.env.LANGFUSE_BASEURL,
    environment: process.env.LANGFUSE_TRACING_ENVIRONMENT || process.env.NODE_ENV,
    release: process.env.LANGFUSE_RELEASE,
    flushAt: Number(process.env.LANGFUSE_FLUSH_AT || 10),
    flushInterval: Number(process.env.LANGFUSE_FLUSH_INTERVAL || 1000),
    mask: ({ data }) => maskLangfuseData(data)
  });

  provider = new NodeTracerProvider({
    spanProcessors: [processor]
  });

  provider.register();
  setLangfuseTracerProvider(provider);
}

export async function traceLangfuse<T>(
  name: string,
  input: Record<string, unknown>,
  fn: () => Promise<T>,
  options: {
    asType?: LangfuseObservationType;
    propagate?: {
      metadata?: Record<string, unknown>;
      sessionId?: string;
      tags?: string[];
      traceName?: string;
      userId?: string;
      version?: string;
    };
  } = {}
): Promise<T> {
  ensureLangfuseTracing();

  if (!isLangfuseEnabled()) {
    return fn();
  }

  const start = startActiveObservation as unknown as (
    observationName: string,
    callback: () => Promise<T>,
    observationOptions?: { asType?: LangfuseObservationType }
  ) => Promise<T>;

  return start(
    name,
    async () => {
      const runObserved = async () => {
        updateActiveObservation({ input } as Parameters<typeof updateActiveObservation>[0]);

        try {
          const output = await fn();
          updateActiveObservation({ output: summarizeLangfuseOutput(output) } as Parameters<typeof updateActiveObservation>[0]);
          return output;
        } catch (error) {
          updateActiveObservation({
            level: 'ERROR',
            statusMessage: error instanceof Error ? error.message : 'Langfuse traced operation failed.'
          } as Parameters<typeof updateActiveObservation>[0]);
          throw error;
        }
      };

      if (options.propagate) {
        return propagateAttributes({
          metadata: normalizeTraceMetadata(options.propagate.metadata),
          sessionId: options.propagate.sessionId,
          tags: options.propagate.tags,
          traceName: options.propagate.traceName || name,
          userId: options.propagate.userId,
          version: options.propagate.version
        }, runObserved);
      }

      return runObserved();
    },
    { asType: options.asType || 'span' }
  );
}

export function annotateLangfuse(attributes: Record<string, unknown>) {
  if (!isLangfuseEnabled()) return;
  ensureLangfuseTracing();
  updateActiveObservation(attributes as Parameters<typeof updateActiveObservation>[0]);
}

export async function flushLangfuse() {
  if (!isLangfuseEnabled()) return;
  ensureLangfuseTracing();
  try {
    await processor?.forceFlush();
  } catch (error) {
    console.warn('[LANGFUSE] Failed to flush traces:', error);
  }
}

function maskLangfuseData(data: unknown): unknown {
  if (typeof data === 'string') {
    return data
      .replace(/sk-[A-Za-z0-9_-]+/g, 'sk-***')
      .replace(/pk-[A-Za-z0-9_-]+/g, 'pk-***')
      .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, 'Bearer ***');
  }

  if (Array.isArray(data)) {
    return data.map((item) => maskLangfuseData(item));
  }

  if (data && typeof data === 'object') {
    return Object.fromEntries(
      Object.entries(data).map(([key, value]) => [
        key,
        /token|secret|password|authorization|apiKey|api_key/i.test(key) ? '[redacted]' : maskLangfuseData(value)
      ])
    );
  }

  return data;
}

function summarizeLangfuseOutput(output: unknown) {
  if (!output || typeof output !== 'object') return output;

  if ('response' in output) {
    return summarizeLangfuseOutput((output as { response?: unknown }).response);
  }

  if ('worker' in output && 'result' in output) {
    const response = output as {
      worker?: { id?: string; name?: string };
      result?: { confidence?: number; actions?: unknown[]; deliverable?: { frames?: unknown[] } };
      trace?: { selectedShards?: unknown[]; queryMemory?: { status?: string; saved?: boolean; recalled?: number } };
    };

    return {
      workerId: response.worker?.id,
      workerName: response.worker?.name,
      confidence: response.result?.confidence,
      actionCount: response.result?.actions?.length,
      frameCount: response.result?.deliverable?.frames?.length,
      shardCount: response.trace?.selectedShards?.length,
      queryMemory: response.trace?.queryMemory
    };
  }

  const record = output as Record<string, unknown>;

  if ('worker' in record || 'routeMode' in record) {
    const worker = record.worker as { id?: string; name?: string } | undefined;
    return {
      commandId: typeof record.commandId === 'string' ? record.commandId : undefined,
      routeMode: typeof record.routeMode === 'string' ? record.routeMode : undefined,
      workerId: worker?.id,
      workerName: worker?.name
    };
  }

  if ('recalledMemory' in record || 'retrievalContext' in record || 'contextResults' in record) {
    const recalledMemory = Array.isArray(record.recalledMemory) ? record.recalledMemory : [];
    const contextResults = Array.isArray(record.contextResults) ? record.contextResults : [];
    const retrievalContext = record.retrievalContext as {
      diagnostics?: { visitedSegments?: number; payloadReads?: number; totalSegments?: number };
      results?: unknown[];
      policy?: { stages?: unknown[] };
    } | undefined;

    return {
      recalledMemoryCount: recalledMemory.length,
      retrievedShardCount: retrievalContext?.results?.length,
      mergedShardCount: contextResults.length,
      atlasDiagnostics: retrievalContext?.diagnostics ? {
        visitedSegments: retrievalContext.diagnostics.visitedSegments,
        payloadReads: retrievalContext.diagnostics.payloadReads,
        totalSegments: retrievalContext.diagnostics.totalSegments
      } : undefined,
      retrievalStageCount: retrievalContext?.policy?.stages?.length
    };
  }

  if ('relayPlan' in record) {
    const relayPlan = record.relayPlan as {
      mode?: string;
      sections?: unknown[];
      templateId?: string;
      templateName?: string;
    } | undefined;

    return {
      mode: relayPlan?.mode,
      sectionCount: relayPlan?.sections?.length,
      templateId: relayPlan?.templateId,
      templateName: relayPlan?.templateName
    };
  }

  if ('result' in record) {
    const result = record.result as {
      actions?: unknown[];
      confidence?: number;
      civicRecord?: unknown;
      deliverable?: { frames?: unknown[] };
      relayPlan?: { templateId?: string };
      title?: string;
    } | undefined;

    return {
      actionCount: result?.actions?.length,
      confidence: result?.confidence,
      frameCount: result?.deliverable?.frames?.length,
      hasCivicRecord: Boolean(result?.civicRecord),
      relayTemplateId: result?.relayPlan?.templateId,
      title: result?.title
    };
  }

  if ('supervisorNotes' in record) {
    return {
      noteCount: Array.isArray(record.supervisorNotes) ? record.supervisorNotes.length : 0
    };
  }

  if ('queryMemory' in record) {
    const queryMemory = record.queryMemory as { recalled?: number; saved?: boolean; status?: string } | undefined;
    return {
      queryMemory: {
        recalled: queryMemory?.recalled,
        saved: queryMemory?.saved,
        status: queryMemory?.status
      }
    };
  }

  return {
    keys: Object.keys(record).filter((key) => !/command|copy|excerpt|input|message|prompt|summary|text/i.test(key))
  };
}

function normalizeTraceMetadata(metadata?: Record<string, unknown>) {
  if (!metadata) return undefined;

  return Object.fromEntries(
    Object.entries(metadata)
      .filter(([, value]) => value !== undefined && value !== null)
      .map(([key, value]) => [key, String(value).slice(0, 200)])
  );
}
