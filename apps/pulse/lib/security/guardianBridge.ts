export interface GuardianResponse {
  status: 'BLOCKED' | 'RESOLVED_BY_MINI' | 'ESCALATE';
  response?: string;
  query?: string;
  analysis: {
    is_malicious: boolean;
    risk_score: number;
    threats: string[];
  };
  message?: string;
}

const ADVERSARIAL_PATTERNS = [
  /ignore\s+(all\s+)?(previous\s+)?instructions/i,
  /system\s+message/i,
  /assistant:\s*\[INTERNAL\]/i,
  /you\s+are\s+now\s+a/i,
  /end\s+of\s+conversation/i,
  /show\s+me\s+your\s+prompt/i,
  /what\s+is\s+your\s+system\s+prompt/i,
  /concatenate\s+all\s+records/i,
  /database\s+dump/i,
  /select\s+\*\s+from/i,
  /drop\s+table/i,
  /the\s+assistant\s+is/i,
  /\[system\s+prompt\]/i,
  /repeat\s+everything\s+above/i,
  /output\s+the\s+full\s+text\s+of/i,
  /sql\s+injection/i,
  /delete\s+from/i,
  /bypass\s+filter/i,
  /list\s+all\s+.*?leads/i,
  /show\s+me\s+all\s+.*?budgets/i,
  /extract\s+lead\s+.*?intelligence/i,
  /reveal\s+.*?scoring\s+telemetry/i,
  /access\s+internal\s+.*?hooks/i,
  /dump\s+.*?velocity\s+data/i,
];

const TOKEN_PATTERNS = [
  { name: 'OPENAI', pattern: /sk-[a-zA-Z0-9]{48}/g },
  { name: 'ANTHROPIC', pattern: /ant-api-key-v1-[a-zA-Z0-9]{64}/g },
  { name: 'GENERIC', pattern: /(api[\s_-]?key|token|secret)(?:\s+is)?[:\s]*['"]?([a-zA-Z0-9_\-.]{16,})['"]?/gi },
];

function sanitizeTokens(text: string) {
  return TOKEN_PATTERNS.reduce(
    (safeText, token) => safeText.replace(token.pattern, `[REDACTED_${token.name}]`),
    text
  );
}

function scanForThreats(text: string): GuardianResponse['analysis'] {
  const threats = ADVERSARIAL_PATTERNS
    .filter((pattern) => pattern.test(text))
    .map((pattern) => pattern.source);
  const riskScore = threats.length ? Math.min(1, 0.5 + (threats.length - 1) * 0.1) : 0;

  return {
    is_malicious: threats.length > 0,
    risk_score: riskScore,
    threats,
  };
}

export class GuardianBridge {
  /**
   * Scans a query using the native Guardian rules.
   *
   * The original Python bridge is not reliable inside Vercel's Node runtime.
   * Keeping the fast deterministic checks here avoids shelling out on every
   * Jamie message and preserves the security gate for prompt-injection inputs.
   */
  static scan(query: string): GuardianResponse {
    const safeQuery = sanitizeTokens(query);
    const analysis = scanForThreats(safeQuery);

    if (analysis.is_malicious) {
      return {
        status: 'BLOCKED',
        analysis,
        message: 'Potential adversarial input detected. Request denied.'
      };
    }

    return {
      status: 'ESCALATE',
      query: safeQuery,
      analysis,
      message: 'Query passed security scan. Escalating to main model.'
    };
  }
}
