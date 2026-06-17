import { afterEach, describe, expect, it } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { runCommandCenterCommand } from '@/lib/command-center/commandRouter';
import { buildJamieCommandBridgeContext } from '@/lib/command-center/jamieBridge';
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

  it('routes dormant cartridge domains to specialist workers', () => {
    expect(chooseWorkerForCommand('Frame Dallas safety without steering').id).toBe('dallas-safety');
    expect(chooseWorkerForCommand('Summarize Dallas 311 service request issues').id).toBe('dallas-community');
    expect(chooseWorkerForCommand('Explain the TREC option fee contract risk').id).toBe('texas-contracts');
    expect(chooseWorkerForCommand('Prepare a seller update from market velocity').id).toBe('seller-update');
    expect(chooseWorkerForCommand('Check rural farm yield context for this ranch').id).toBe('yield-intel');
    expect(chooseWorkerForCommand('Tell the local history of Sunset Texas').id).toBe('place-history');
  });

  it('routes developer cartridges to operator workers and relay templates', () => {
    const pulse = chooseWorkerForCommand('Map the Sunset Pulse command flow and TAH routing');
    const security = chooseWorkerForCommand('Threat-model the command center privacy risk');
    const postgres = chooseWorkerForCommand('Explain the Postgres query plan bottleneck');
    const spatial = chooseWorkerForCommand('Sketch a spatial UI scene for this listing');

    expect(pulse.id).toBe('pulse-architect');
    expect(security.id).toBe('security-architect');
    expect(postgres.id).toBe('postgres-tuner');
    expect(spatial.id).toBe('spatial-designer');

    expect(buildTahRelayPlan(pulse, [{ source: 'sunset_pulse_expertise.tah', title: 'Pulse', concepts: ['command', 'route'] }]).templateId).toBe('sunset-pulse-command-map');
    expect(buildTahRelayPlan(security, [{ source: 'security_architect.tah', title: 'Security', concepts: ['asset', 'threat'] }]).templateId).toBe('security-threat-board');
    expect(buildTahRelayPlan(postgres, [{ source: 'postgres_mastery.tah', title: 'Postgres', concepts: ['query', 'index'] }]).templateId).toBe('postgres-query-plan');
    expect(buildTahRelayPlan(spatial, [{ source: 'spatial_computing.tah', title: 'Spatial', concepts: ['scene', 'interaction'] }]).templateId).toBe('spatial-computing-scene');
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
    expect(response.result.deliverable.mode).toBe('slideshow');
    expect(response.result.deliverable.frames.length).toBeGreaterThanOrEqual(2);
    expect(response.result.deliverable.copyReadyText).toContain('Visual idea:');
    expect(response.result.deliverable.copyReadyText).toContain('From:');
    expect(response.result.relayPlan.finalScreen.sourceCards.length).toBeGreaterThan(0);
    expect(response.result.relayPlan.finalScreen.learned.join(' ')).toContain('main files');
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

  it('builds a plain Jamie helper bridge and saves the chat turn locally', () => {
    const filePath = path.join(os.tmpdir(), `pulse-query-memory-jamie-${Date.now()}.tah`);
    process.env.PULSE_QUERY_MEMORY_PATH = filePath;
    process.env.PULSE_QUERY_MEMORY_DISABLED = 'false';

    const bridge = buildJamieCommandBridgeContext('Help me write a clear Sunset Chat note for the grill today');

    expect(bridge?.command.worker.id).toBe('follow-up-writer');
    expect(bridge?.context).toContain('Helper picked:');
    expect(bridge?.context).toContain('Files to lean on:');
    expect(bridge?.context).toContain('saved locally');
    expect(bridge?.context).not.toContain('TAH Router');
    expect(fs.readFileSync(filePath, 'utf8')).toContain('TYPE: sunset_pulse_query_memory');
  });

  it('turns Dallas 311 code concern records into a plain answer', () => {
    process.env.PULSE_QUERY_MEMORY_DISABLED = 'true';

    const response = runCommandCenterCommand({
      command: 'Community Vitality: Code Concern CCS Status: New | Outcome: PENDING Location: 3800 S TYLER ST, DALLAS, TX, 75224, Dallas TX Reported: 2026 06 04T19:47:49.000 Coordinates: 0, 0 Service Request: 26 00243099 What does this mean?',
      relayMode: 'briefing',
      supervisor: true
    });

    expect(response.worker.id).toBe('dallas-community');
    expect(response.result.title).toContain('code-compliance request');
    expect(response.result.summary).toContain('3800 S TYLER ST');
    expect(response.result.summary).toContain('Coordinates 0, 0');
    expect(response.result.actions[0]).toContain('26-00243099');
    expect(response.result.deliverable.title).toContain('Plain interpretation');
    expect(response.result.deliverable.copyReadyText).toContain('This is a Dallas 311 code-compliance record');
    expect(response.result.deliverable.copyReadyText).not.toContain('This answer is shaped as');
  });
});

function restoreEnv(key: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[key];
  } else {
    process.env[key] = value;
  }
}
