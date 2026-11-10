export class RequestBodyError extends Error {
  constructor(public readonly status: 400 | 413, message: string) { super(message); }
}

/** Check actual streamed bytes before allocating/parsing untrusted JSON. */
export async function readBoundedJson(request: Request, maxBytes: number): Promise<unknown> {
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 1) throw new RangeError('A positive byte limit is required.');
  const length = request.headers.get('content-length')?.trim();
  if (length && /^\d+$/.test(length) && Number(length) > maxBytes) throw new RequestBodyError(413, 'Request is too large.');
  const reader = request.body?.getReader();
  if (!reader) throw new RequestBodyError(400, 'A JSON request body is required.');
  let bytes = 0;
  let text = '';
  const decoder = new TextDecoder();
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      bytes += chunk.value.byteLength;
      if (bytes > maxBytes) {
        await reader.cancel().catch(() => {});
        throw new RequestBodyError(413, 'Request is too large.');
      }
      text += decoder.decode(chunk.value, { stream: true });
    }
    text += decoder.decode();
  } finally {
    reader.releaseLock();
  }
  try { return JSON.parse(text); }
  catch { throw new RequestBodyError(400, 'Invalid JSON request.'); }
}
