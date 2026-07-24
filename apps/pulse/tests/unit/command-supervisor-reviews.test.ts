import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  commandSupervisorReviewPath,
  createCommandSupervisorReview,
  getCommandSupervisorReviewSnapshot,
  processQueuedCommandSupervisorReviews,
} from '@/lib/command-center/supervisorReviews';

const previousReviewPath = process.env.PULSE_COMMAND_SUPERVISOR_REVIEW_PATH;
const previousDisabled = process.env.PULSE_COMMAND_SUPERVISOR_REVIEW_DISABLED;

afterEach(() => {
  restoreEnv('PULSE_COMMAND_SUPERVISOR_REVIEW_PATH', previousReviewPath);
  restoreEnv('PULSE_COMMAND_SUPERVISOR_REVIEW_DISABLED', previousDisabled);
});

describe('command supervisor reviews', () => {
  it('queues compact JSONL review records for async follow-up', () => {
    const filePath = path.join(os.tmpdir(), `pulse-command-supervisor-${Date.now()}.jsonl`);
    process.env.PULSE_COMMAND_SUPERVISOR_REVIEW_PATH = filePath;
    process.env.PULSE_COMMAND_SUPERVISOR_REVIEW_DISABLED = 'false';

    const { review, trace } = createCommandSupervisorReview({
      commandId: 'cmd_review_test',
      command: 'Summarize this sensitive pasted listing with pricing caveats.',
      workerId: 'listing-summary',
      workerName: 'Listing Summary',
      intent: 'listing_analysis',
      summary: 'Prepared a listing summary with next steps.',
      selectedShards: [{ source: 'listing_context.tah', title: 'Listing', score: 88 }],
    });

    expect(commandSupervisorReviewPath()).toBe(filePath);
    expect(trace).toEqual(expect.objectContaining({
      status: 'queued',
      reviewId: review.id,
      path: path.relative(process.cwd(), filePath),
    }));
    expect(fs.readFileSync(filePath, 'utf8')).toContain('"commandId":"cmd_review_test"');

    const snapshot = getCommandSupervisorReviewSnapshot();
    expect(snapshot.reviewCount).toBe(1);
    expect(snapshot.queuedCount).toBe(1);
    expect(snapshot.recent[0]).toEqual(expect.objectContaining({
      commandId: 'cmd_review_test',
      workerId: 'listing-summary',
      sourceCount: 1,
    }));
    expect(JSON.stringify(snapshot.recent[0])).not.toContain('sensitive pasted listing');
  });

  it('returns a disabled trace without writing a file', () => {
    const filePath = path.join(os.tmpdir(), `pulse-command-supervisor-disabled-${Date.now()}.jsonl`);
    process.env.PULSE_COMMAND_SUPERVISOR_REVIEW_PATH = filePath;
    process.env.PULSE_COMMAND_SUPERVISOR_REVIEW_DISABLED = 'true';

    const { trace } = createCommandSupervisorReview({
      commandId: 'cmd_disabled',
      command: 'Check this answer.',
      workerId: 'follow-up-writer',
      workerName: 'Follow Up',
      intent: 'lead_followup',
      summary: 'Prepared a note.',
    });

    expect(trace.status).toBe('disabled');
    expect(fs.existsSync(filePath)).toBe(false);
  });

  it('processes queued reviews with deterministic warning checks', () => {
    const filePath = path.join(os.tmpdir(), `pulse-command-supervisor-process-${Date.now()}.jsonl`);
    process.env.PULSE_COMMAND_SUPERVISOR_REVIEW_PATH = filePath;
    process.env.PULSE_COMMAND_SUPERVISOR_REVIEW_DISABLED = 'false';

    const { review } = createCommandSupervisorReview({
      commandId: 'cmd_process_warning',
      command: 'Summarize this listing.',
      workerId: 'listing-summary',
      workerName: 'Listing Summary',
      intent: 'listing_analysis',
      summary: 'Guaranteed best investment.',
      selectedShards: [],
    });

    const result = processQueuedCommandSupervisorReviews({ limit: 1 });
    const snapshot = getCommandSupervisorReviewSnapshot();
    const processed = snapshot.recent.find((item) => item.id === review.id);

    expect(result).toEqual(expect.objectContaining({
      processed: 1,
      succeeded: 1,
      failed: 0,
      remainingQueued: 0,
    }));
    expect(snapshot).toEqual(expect.objectContaining({
      reviewCount: 1,
      queuedCount: 0,
      succeededCount: 1,
      warningCount: 1,
    }));
    expect(processed).toEqual(expect.objectContaining({
      status: 'succeeded',
      reviewer: 'deterministic-supervisor',
      severity: 'warning',
    }));
    expect(processed?.findings?.map((finding) => finding.id)).toEqual(expect.arrayContaining([
      'missing_sources',
      'thin_summary',
      'overconfident_or_unsafe_claim',
    ]));
  });
});

function restoreEnv(key: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[key];
  } else {
    process.env[key] = value;
  }
}
