import { afterEach, describe, expect, it } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { runCommandCenterCommand } from '@/lib/command-center/commandRouter';
import { queryMemoryPath, saveQueryMemory } from '@/lib/command-center/queryMemory';
import { buildTahRelayPlan } from '@/lib/command-center/relayTemplates';
import { expandCommandTerms } from '@/lib/command-center/synonyms';
import { chooseWorkerForCommand, intelligenceWorkers } from '@/lib/command-center/workerRoster';

const previousMemoryDisabled = process.env.PULSE_QUERY_MEMORY_DISABLED;
const previousMemoryPath = process.env.PULSE_QUERY_MEMORY_PATH;

afterEach(() => {
  restoreEnv('PULSE_QUERY_MEMORY_DISABLED', previousMemoryDisabled);
  restoreEnv('PULSE_QUERY_MEMORY_PATH', previousMemoryPath);
});

describe('command center routing', () => {
  it('uses domain synonyms when picking narrow workers', () => {
    const terms = expandCommandTerms('Which nearby shops help tell the property story?');
    const worker = chooseWorkerForCommand('Which nearby shops help tell the property story?');

    expect(terms.map((term) => term.term)).toEqual(expect.arrayContaining(['nearby', 'local', 'business', 'commerce']));
    expect(worker.id).toBe('local-commerce');
  });

  it('runs commands through a worker, relay plan, and provenance screen without query memory', () => {
    process.env.PULSE_QUERY_MEMORY_DISABLED = 'true';
    process.env.PULSE_QUERY_MEMORY_PATH = path.join(os.tmpdir(), `pulse-query-memory-${Date.now()}.tah`);

    const response = runCommandCenterCommand({
      command: 'Compare this listing with recent sales and give me a price check',
      relayMode: 'slideshow',
      supervisor: true
    });

    expect(response.worker.id).toBe('comp-analysis');
    expect(response.result.relayPlan.mode).toBe('slideshow');
    expect(response.result.relayPlan.finalScreen.sourceCards.length).toBeGreaterThan(0);
    expect(response.result.relayPlan.finalScreen.learned.join(' ')).toContain('Learned');
    expect(response.trace.queryMemory).toEqual(expect.objectContaining({
      status: 'disabled',
      saved: false,
      recalled: 0
    }));
    expect(fs.existsSync(queryMemoryPath())).toBe(false);
  });

  it('keeps saved query memory local and addressable when enabled', () => {
    const filePath = path.join(os.tmpdir(), `pulse-query-memory-${Date.now()}.tah`);
    process.env.PULSE_QUERY_MEMORY_PATH = filePath;
    process.env.PULSE_QUERY_MEMORY_DISABLED = 'false';

    const worker = intelligenceWorkers.find((candidate) => candidate.id === 'follow-up-writer')!;
    const relayPlan = buildTahRelayPlan(worker, [], 'script');
    const trace = saveQueryMemory({
      commandId: 'cmd_test_memory',
      command: 'Write a buyer follow-up',
      intent: 'FOLLOW_UP',
      worker,
      relayPlan,
      sources: [{ source: 'lead_history.tah', concepts: ['lead', 'buyer'], matchReason: 'test' }],
      summary: 'A buyer follow-up was prepared.',
      actions: ['Send one clear next-step message.']
    });

    expect(trace).toEqual(expect.objectContaining({
      status: 'saved',
      saved: true
    }));
    expect(trace.path).toBe(path.relative(process.cwd(), filePath));
    expect(fs.readFileSync(filePath, 'utf8')).toContain('TYPE: sunset_pulse_query_memory');
  });
});

function restoreEnv(key: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[key];
  } else {
    process.env[key] = value;
  }
}
