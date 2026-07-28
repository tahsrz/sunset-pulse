import fs from 'fs';
import path from 'path';
import type { CommandIntent } from './intentClassifier';

export type CommandSupervisorReview = {
  id: string;
  commandId: string;
  createdAt: string;
  completedAt?: string;
  status: 'queued' | 'succeeded' | 'failed';
  workerId: string;
  workerName: string;
  intent: CommandIntent | string;
  summary: string;
  notes: string[];
  sourceCount: number;
  reviewer?: 'deterministic-supervisor';
  severity?: CommandSupervisorFinding['level'];
  findings?: CommandSupervisorFinding[];
  resultSummary?: string;
};

export type CommandSupervisorReviewTrace = {
  status: 'queued' | 'succeeded' | 'failed' | 'disabled' | 'unavailable';
  path: string;
  reviewId?: string;
  severity?: CommandSupervisorFinding['level'];
  findingCount?: number;
  reason?: string;
};

export type CommandSupervisorFinding = {
  id: string;
  level: 'info' | 'warning' | 'error';
  message: string;
};

export type CommandSupervisorProcessResult = {
  path: string;
  processed: number;
  succeeded: number;
  failed: number;
  remainingQueued: number;
  recent: CommandSupervisorReview[];
};

export function commandSupervisorReviewPath() {
  const configured = process.env.PULSE_COMMAND_SUPERVISOR_REVIEW_PATH;
  return configured || path.join(process.cwd(), '.pulse-local', 'command_supervisor_reviews.jsonl');
}

export function createCommandSupervisorReview(input: {
  commandId: string;
  command: string;
  workerId: string;
  workerName: string;
  intent: CommandIntent | string;
  summary: string;
  selectedShards?: Array<{ source?: string | null; title?: string | null; score?: number | null }>;
}): { review: CommandSupervisorReview; trace: CommandSupervisorReviewTrace } {
  const filePath = commandSupervisorReviewPath();
  const relativePath = path.relative(process.cwd(), filePath);

  if (process.env.PULSE_COMMAND_SUPERVISOR_REVIEW_DISABLED === 'true') {
    const review = buildReview(input, 'queued');
    return {
      review,
      trace: {
        status: 'disabled',
        path: relativePath,
        reviewId: review.id,
        reason: 'PULSE_COMMAND_SUPERVISOR_REVIEW_DISABLED=true',
      },
    };
  }

  const review = buildReview(input, 'queued');

  try {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.appendFileSync(filePath, `${JSON.stringify(review)}\n`, 'utf8');
    return {
      review,
      trace: {
        status: 'queued',
        path: relativePath,
        reviewId: review.id,
      },
    };
  } catch (error) {
    return {
      review,
      trace: {
        status: 'unavailable',
        path: relativePath,
        reviewId: review.id,
        reason: error instanceof Error ? error.message : 'Supervisor review write failed',
      },
    };
  }
}

export function getCommandSupervisorReviewSnapshot(limit = 20) {
  const filePath = commandSupervisorReviewPath();
  if (!fs.existsSync(filePath)) {
    return {
      path: path.relative(process.cwd(), filePath),
      reviewCount: 0,
      queuedCount: 0,
      succeededCount: 0,
      failedCount: 0,
      warningCount: 0,
      recent: [] as CommandSupervisorReview[],
    };
  }

  const reviews = readSupervisorReviews(filePath);
  const recent = reviews.slice(-limit).reverse();

  return {
    path: path.relative(process.cwd(), filePath),
    reviewCount: reviews.length,
    queuedCount: reviews.filter((review) => review.status === 'queued').length,
    succeededCount: reviews.filter((review) => review.status === 'succeeded').length,
    failedCount: reviews.filter((review) => review.status === 'failed').length,
    warningCount: reviews.filter((review) => review.severity === 'warning').length,
    recent,
  };
}

export function processQueuedCommandSupervisorReviews(input: { limit?: number } = {}): CommandSupervisorProcessResult {
  const filePath = commandSupervisorReviewPath();
  const relativePath = path.relative(process.cwd(), filePath);
  const limit = boundedInt(input.limit, 1, 50, 10);

  if (!fs.existsSync(filePath)) {
    return {
      path: relativePath,
      processed: 0,
      succeeded: 0,
      failed: 0,
      remainingQueued: 0,
      recent: [],
    };
  }

  const reviews = readSupervisorReviews(filePath);
  let processed = 0;
  let succeeded = 0;
  let failed = 0;
  const nextReviews = reviews.map((review) => {
    if (review.status !== 'queued' || processed >= limit) return review;
    processed += 1;

    try {
      const findings = reviewCommandSupervisorRecord(review);
      const severity = highestSeverity(findings);
      succeeded += 1;
      return {
        ...review,
        status: 'succeeded' as const,
        completedAt: new Date().toISOString(),
        reviewer: 'deterministic-supervisor' as const,
        severity,
        findings,
        resultSummary: summarizeFindings(findings),
      };
    } catch (error) {
      failed += 1;
      return {
        ...review,
        status: 'failed' as const,
        completedAt: new Date().toISOString(),
        reviewer: 'deterministic-supervisor' as const,
        severity: 'error' as const,
        findings: [{
          id: 'processor_error',
          level: 'error' as const,
          message: error instanceof Error ? error.message : 'Supervisor processor failed.',
        }],
        resultSummary: 'Supervisor processor failed before completing deterministic checks.',
      };
    }
  });

  writeSupervisorReviews(filePath, nextReviews);
  return {
    path: relativePath,
    processed,
    succeeded,
    failed,
    remainingQueued: nextReviews.filter((review) => review.status === 'queued').length,
    recent: nextReviews.slice(-10).reverse(),
  };
}

function buildReview(
  input: Parameters<typeof createCommandSupervisorReview>[0],
  status: CommandSupervisorReview['status']
): CommandSupervisorReview {
  const sources = input.selectedShards || [];
  return {
    id: `cmd_review_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    commandId: input.commandId,
    createdAt: new Date().toISOString(),
    status,
    workerId: input.workerId,
    workerName: input.workerName,
    intent: input.intent,
    summary: input.summary.slice(0, 800),
    notes: [
      'Check that the answer only claims what the selected sources support.',
      'Verify listing, pricing, and compliance language before external use.',
      input.command.length > 1200 ? 'Pasted input was long; inspect extracted facts and omitted context.' : 'Input length was normal.',
    ],
    sourceCount: sources.length,
  };
}

function readSupervisorReviews(filePath: string) {
  return fs.readFileSync(filePath, 'utf8')
    .split(/\r?\n/g)
    .filter(Boolean)
    .map((line) => JSON.parse(line) as CommandSupervisorReview);
}

function writeSupervisorReviews(filePath: string, reviews: CommandSupervisorReview[]) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, reviews.map((review) => JSON.stringify(review)).join('\n') + (reviews.length ? '\n' : ''), 'utf8');
}

function reviewCommandSupervisorRecord(review: CommandSupervisorReview): CommandSupervisorFinding[] {
  const findings: CommandSupervisorFinding[] = [{
    id: 'record_reconstructed',
    level: 'info',
    message: `Reviewed compact trace for ${review.intent} using ${review.sourceCount} selected source(s).`,
  }];

  if (review.sourceCount <= 0) {
    findings.push({
      id: 'missing_sources',
      level: 'warning',
      message: 'No selected sources were attached to the answer; verify grounding before external use.',
    });
  }

  if (review.summary.length < 80) {
    findings.push({
      id: 'thin_summary',
      level: 'warning',
      message: 'Answer summary is short; confirm it contains enough context for the operator.',
    });
  }

  if (String(review.intent) === 'listing_analysis' && !/\b(listing|price|property|home|seller|buyer|mls)\b/i.test(review.summary)) {
    findings.push({
      id: 'listing_summary_missing_listing_terms',
      level: 'warning',
      message: 'Listing analysis summary does not mention listing/property context; inspect extracted facts.',
    });
  }

  if (/\b(guarantee|guaranteed|will sell|will appreciate|best investment|crime-free|safe neighborhood)\b/i.test(review.summary)) {
    findings.push({
      id: 'overconfident_or_unsafe_claim',
      level: 'warning',
      message: 'Summary contains potentially overconfident or regulated language; revise before sending.',
    });
  }

  return findings;
}

function highestSeverity(findings: CommandSupervisorFinding[]): CommandSupervisorFinding['level'] {
  if (findings.some((finding) => finding.level === 'error')) return 'error';
  if (findings.some((finding) => finding.level === 'warning')) return 'warning';
  return 'info';
}

function summarizeFindings(findings: CommandSupervisorFinding[]) {
  const warnings = findings.filter((finding) => finding.level === 'warning').length;
  const errors = findings.filter((finding) => finding.level === 'error').length;
  if (errors) return `${errors} supervisor error(s) found.`;
  if (warnings) return `${warnings} supervisor warning(s) found.`;
  return 'Deterministic supervisor checks passed.';
}

function boundedInt(value: unknown, min: number, max: number, fallback: number) {
  const number = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(number)));
}
