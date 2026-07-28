export type WorkflowOperationStatus = 'success' | 'fallback' | 'failed';

export type WorkflowOperationTrace = {
  node: string;
  operation: string;
  status: WorkflowOperationStatus;
  attempts: number;
  retried: boolean;
  recovered: boolean;
  durationMs: number;
  error?: string;
  fallback?: string;
};

export type WorkflowRetryOptions<T> = {
  node: string;
  operation: string;
  maxAttempts?: number;
  delayMs?: number;
  fallback?: (error: unknown) => T | Promise<T>;
  fallbackLabel?: string;
  fallbackResult?: (value: T) => string | false | undefined;
  shouldRetry?: (error: unknown, attempt: number) => boolean;
  onError?: (error: unknown, attempt: number) => void;
};

export async function runWorkflowOperation<T>(
  options: WorkflowRetryOptions<T>,
  task: () => T | Promise<T>
): Promise<{ value: T; trace: WorkflowOperationTrace }> {
  const maxAttempts = Math.max(1, options.maxAttempts || 1);
  const delayMs = Math.max(0, options.delayMs || 0);
  const startedAt = Date.now();
  let lastError: unknown;
  let attempts = 0;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    attempts = attempt;
    try {
      const value = await task();
      const fallbackLabel = options.fallbackResult?.(value);
      return {
        value,
        trace: {
          node: options.node,
          operation: options.operation,
          status: fallbackLabel ? 'fallback' : 'success',
          attempts,
          retried: attempts > 1,
          recovered: attempts > 1 || Boolean(fallbackLabel),
          durationMs: Date.now() - startedAt,
          fallback: fallbackLabel || undefined
        }
      };
    } catch (error) {
      lastError = error;
      options.onError?.(error, attempt);
      const canRetry = attempt < maxAttempts && (options.shouldRetry?.(error, attempt) ?? true);
      if (!canRetry) break;
      if (delayMs > 0) await sleep(delayMs);
    }
  }

  if (options.fallback) {
    const value = await options.fallback(lastError);
    return {
      value,
      trace: {
        node: options.node,
        operation: options.operation,
        status: 'fallback',
        attempts,
        retried: attempts > 1,
        recovered: true,
        durationMs: Date.now() - startedAt,
        error: errorMessage(lastError),
        fallback: options.fallbackLabel || 'fallback'
      }
    };
  }

  const trace: WorkflowOperationTrace = {
    node: options.node,
    operation: options.operation,
    status: 'failed',
    attempts,
    retried: attempts > 1,
    recovered: false,
    durationMs: Date.now() - startedAt,
    error: errorMessage(lastError)
  };

  throw new WorkflowOperationError(trace);
}

export class WorkflowOperationError extends Error {
  constructor(public readonly trace: WorkflowOperationTrace) {
    super(trace.error || `${trace.node}.${trace.operation} failed`);
    this.name = 'WorkflowOperationError';
  }
}

export function summarizeWorkflowAttempts(attempts: WorkflowOperationTrace[]) {
  const failedOperations = attempts.filter((attempt) => attempt.status === 'failed').length;
  const fallbackOperations = attempts.filter((attempt) => attempt.status === 'fallback').length;
  const retriedOperations = attempts.filter((attempt) => attempt.retried).length;

  return {
    status: failedOperations || fallbackOperations ? 'degraded' as const : 'ok' as const,
    attempts,
    failedOperations,
    fallbackOperations,
    retriedOperations
  };
}

function sleep(delayMs: number) {
  return new Promise((resolve) => setTimeout(resolve, delayMs));
}

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message.slice(0, 240);
  return String(error || 'operation failed').slice(0, 240);
}
