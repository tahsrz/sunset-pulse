export type RetryOptions = {
  attempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  shouldRetry?: (error: unknown) => boolean;
  sleep?: (delayMs: number) => Promise<void>;
  onRetry?: (input: { error: unknown; attempt: number; delayMs: number }) => void;
};

export async function withRetry<T>(operation: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const attempts = Math.max(1, Math.floor(options.attempts ?? 3));
  const baseDelayMs = Math.max(0, options.baseDelayMs ?? 200);
  const maxDelayMs = Math.max(baseDelayMs, options.maxDelayMs ?? 2_000);
  const shouldRetry = options.shouldRetry ?? isTransientError;
  const sleep = options.sleep ?? ((delayMs) => new Promise((resolve) => setTimeout(resolve, delayMs)));

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      if (attempt >= attempts || !shouldRetry(error)) throw error;
      const delayMs = Math.min(maxDelayMs, baseDelayMs * (2 ** (attempt - 1)));
      options.onRetry?.({ error, attempt, delayMs });
      await sleep(delayMs);
    }
  }

  throw new Error('Retry operation exhausted without a result.');
}

export function isTransientError(error: unknown) {
  const candidate = error as { code?: string; status?: number; statusCode?: number; message?: string } | null;
  const code = String(candidate?.code || '');
  const status = Number(candidate?.status ?? candidate?.statusCode);
  const message = String(candidate?.message || error || '');

  return /^08/.test(code)
    || /^(40001|40P01|53...|57P01)$/.test(code)
    || status === 408
    || status === 429
    || status >= 500
    || /timeout|timed out|network|fetch failed|connection reset|temporarily unavailable/i.test(message);
}
