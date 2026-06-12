type JamieResponseLike = {
  content?: unknown;
  role?: unknown;
  tool_calls?: unknown;
};

const INTERNAL_LINE_PATTERNS = [
  /^\s*\[[A-Z0-9_ -]*(?:ANALYSIS|CONTEXT|PROFILE|NODES|AGGREGATION|INSIGHTS|REPORT|SYSTEM|PROMPT|TOOL|SOURCE|SCORE|TEXT)[A-Z0-9_ -]*\]\s*:?.*$/i,
  /^\s*(?:JAMIE|ACTIVE|ANALYSIS|PROPERTY|NEIGHBORHOOD|RECOGNITION|PERSONALITY|SOURCE|SCORE|TEXT|QUERY)[A-Z0-9_ -]*:.*$/i,
  /^\s*LOCAL BUSINESS DATA:.*$/i,
  /^\s*(?:internal analysis workers used|analysis tone profile|aggregated findings|final findings|private analysis notes for this turn):.*$/i,
  /^\s*as jamie\b/i,
  /^\s*as your\b.*\bassistant\b/i,
  /^\s*i am jamie\b/i,
  /^\s*i'm jamie\b/i,
  /^\s*my role is\b/i,
  /^\s*my mission is\b/i,
  /^\s*my purpose is\b/i,
  /^\s*i am here to\b/i,
  /^\s*i'm here to\b/i,
  /^\s*mission:\b/i,
  /^\s*role:\b/i,
  /^\s*purpose:\b/i,
];

const INTERNAL_BLOCK_START = /^\s*\[(?:ACTIVE_ANALYSIS_NODES|JAMIE_DATA_AGGREGATION|JAMIE_FINAL_INSIGHTS|JAMIE_ANALYSIS_REPORT|JAMIE_PULSE_CONTEXT)\]\s*:?\s*$/i;

function extractContentFromJsonString(content: string) {
  const trimmed = content.trim();
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return content;

  try {
    const parsed = JSON.parse(trimmed) as JamieResponseLike;
    if (parsed && typeof parsed === 'object' && typeof parsed.content === 'string') {
      return parsed.content;
    }
  } catch {
    return content;
  }

  return content;
}

export function sanitizeJamieReply(content: string) {
  if (!content || typeof content !== 'string') return '';

  const parsedContent = extractContentFromJsonString(content);
  const lines = parsedContent.split(/\r?\n/);
  const kept: string[] = [];
  let droppingInternalBlock = false;

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed) {
      if (!droppingInternalBlock) kept.push(line);
      continue;
    }

    if (INTERNAL_BLOCK_START.test(trimmed)) {
      droppingInternalBlock = true;
      continue;
    }

    if (droppingInternalBlock && /^\s*\[[A-Z0-9_ -]+\]\s*:?\s*$/i.test(trimmed)) {
      continue;
    }

    if (droppingInternalBlock && !/^\s*\[[A-Z0-9_ -]+\]/i.test(trimmed)) {
      droppingInternalBlock = false;
    }

    if (droppingInternalBlock) continue;
    if (INTERNAL_LINE_PATTERNS.some((pattern) => pattern.test(trimmed))) continue;

    kept.push(line);
  }

  const stripped = kept
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return stripped || parsedContent.trim();
}

export function getJamieDisplayContent(response: unknown, fallback = "I'm checking that now.") {
  if (typeof response === 'string') return sanitizeJamieReply(response);

  if (response && typeof response === 'object') {
    const payload = response as JamieResponseLike;
    if (typeof payload.content === 'string') {
      const content = sanitizeJamieReply(payload.content);
      if (content) return content;
    }

    if (payload.tool_calls) return fallback;
  }

  return fallback;
}
