export type RequestPromiseCache<TResult> = Readonly<{
  getOrCreate(request: Request, create: () => Promise<TResult>): Promise<TResult>;
}>;

export function createRequestPromiseCache<TResult>(): RequestPromiseCache<TResult> {
  const byRequest = new WeakMap<Request, Promise<TResult>>();

  return Object.freeze({
    getOrCreate(request: Request, create: () => Promise<TResult>) {
      const existing = byRequest.get(request);
      if (existing) return existing;

      const pending = Promise.resolve().then(create);
      byRequest.set(request, pending);
      return pending;
    },
  });
}
