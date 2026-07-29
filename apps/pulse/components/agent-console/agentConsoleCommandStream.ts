import {
  type CommandProgressEvent,
  type CommandResponse,
} from './agentConsoleConfig';

export async function readCommandStream(
  response: Response,
  onProgress: (event: CommandProgressEvent) => void,
): Promise<CommandResponse> {
  if (!response.body) {
    return response.json() as Promise<CommandResponse>;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let result: CommandResponse | null = null;

  while (true) {
    const { value, done } = await reader.read();
    buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
    const parts = buffer.split('\n\n');
    buffer = parts.pop() || '';

    for (const part of parts) {
      const event = parseServerSentEvent(part);
      if (!event) continue;
      if (event.event === 'progress') {
        onProgress(event.data as CommandProgressEvent);
      } else if (event.event === 'result') {
        result = event.data as CommandResponse;
      } else if (event.event === 'error') {
        const errorData = event.data as { error?: string };
        throw new Error(errorData.error || 'Jamie could not finish that job.');
      }
    }

    if (done) break;
  }

  if (!result) throw new Error('Jamie finished without returning an answer.');
  return result;
}

export function parseServerSentEvent(chunk: string) {
  const lines = chunk.split(/\r?\n/g);
  const event = lines.find((line) => line.startsWith('event:'))?.slice('event:'.length).trim();
  const data = lines
    .filter((line) => line.startsWith('data:'))
    .map((line) => line.slice('data:'.length).trim())
    .join('\n');

  if (!event || !data) return null;

  try {
    return { event, data: JSON.parse(data) as unknown };
  } catch {
    return null;
  }
}
