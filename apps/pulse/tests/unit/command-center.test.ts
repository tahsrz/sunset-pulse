import { afterEach, describe, expect, it } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { buildClientReadyFollowUp, runCommandCenterCommand } from '@/lib/command-center/commandRouter';
import { buildJamieCommandBridgeContext } from '@/lib/command-center/jamieBridge';
import { queryMemoryPath, recallQueryMemories, saveCommandActionMemory, saveQueryMemory } from '@/lib/command-center/queryMemory';
import { getSqlsyncCommandJournalSnapshot, sqlsyncCommandJournalPath } from '@/lib/sqlsync/commandJournal';
import { getTensorZeroCommandEvaluationSnapshot, recordTensorZeroCommandEvaluation } from '@/lib/tensorzero/commandEvaluation';
import { getTensorZeroFeedbackSnapshot, recordTensorZeroFeedback } from '@/lib/tensorzero/feedback';
import { getTensorZeroJamieChatSnapshot, recordTensorZeroJamieTurn } from '@/lib/tensorzero/jamieChat';
import { buildTahRelayPlan } from '@/lib/command-center/relayTemplates';
import { expandCommandTerms } from '@/lib/command-center/synonyms';
import { chooseWorkerForCommand, intelligenceWorkers } from '@/lib/command-center/workerRoster';
import { runWorkflowOperation, summarizeWorkflowAttempts } from '@/lib/command-center/workflowReliability';
import { classifyCommandIntent } from '@/lib/command-center/intentClassifier';
import { extractListingFacts } from '@/lib/command-center/listingExtractor';

const previousMemoryDisabled = process.env.PULSE_QUERY_MEMORY_DISABLED;
const previousMemoryPath = process.env.PULSE_QUERY_MEMORY_PATH;
const previousSqlsyncDisabled = process.env.PULSE_SQLSYNC_JOURNAL_DISABLED;
const previousSqlsyncPath = process.env.PULSE_SQLSYNC_JOURNAL_PATH;
const previousTensorZeroDisabled = process.env.TENSORZERO_COMMAND_EVAL_DISABLED;
const previousTensorZeroPath = process.env.TENSORZERO_COMMAND_EVAL_PATH;
const previousTensorZeroFeedbackDisabled = process.env.TENSORZERO_FEEDBACK_DISABLED;
const previousTensorZeroFeedbackPath = process.env.TENSORZERO_FEEDBACK_PATH;
const previousTensorZeroJamieDisabled = process.env.TENSORZERO_JAMIE_CHAT_DISABLED;
const previousTensorZeroJamiePath = process.env.TENSORZERO_JAMIE_CHAT_PATH;

const pastedListingText = [
  'MLS # 20654321',
  'List Price $485,000',
  '1234 Cedar Springs Dr, Dallas, TX 75204',
  'Single Family Residential',
  '4 beds 3 baths 2,418 sq ft',
  'Year Built 1998',
  'Lot Size 0.21 acres',
  'Public Remarks: Updated home with open kitchen, mature trees, covered patio, flexible office, and quick access to nearby shops and commute routes.',
  'Features: hardwood floors, quartz counters, two-car garage, fenced backyard, recent roof, and energy-efficient windows.',
].join('\n');

const longPastedListingText = `${pastedListingText}\n${'Additional broker remarks and room-level details. '.repeat(40)}`;

afterEach(() => {
  restoreEnv('PULSE_QUERY_MEMORY_DISABLED', previousMemoryDisabled);
  restoreEnv('PULSE_QUERY_MEMORY_PATH', previousMemoryPath);
  restoreEnv('PULSE_SQLSYNC_JOURNAL_DISABLED', previousSqlsyncDisabled);
  restoreEnv('PULSE_SQLSYNC_JOURNAL_PATH', previousSqlsyncPath);
  restoreEnv('TENSORZERO_COMMAND_EVAL_DISABLED', previousTensorZeroDisabled);
  restoreEnv('TENSORZERO_COMMAND_EVAL_PATH', previousTensorZeroPath);
  restoreEnv('TENSORZERO_FEEDBACK_DISABLED', previousTensorZeroFeedbackDisabled);
  restoreEnv('TENSORZERO_FEEDBACK_PATH', previousTensorZeroFeedbackPath);
  restoreEnv('TENSORZERO_JAMIE_CHAT_DISABLED', previousTensorZeroJamieDisabled);
  restoreEnv('TENSORZERO_JAMIE_CHAT_PATH', previousTensorZeroJamiePath);
});

describe('command center routing', () => {
  it('keeps agent instructions and input labels out of client-ready follow-ups', () => {
    const command = [
      'Write a concise, client-ready real estate follow-up. Use the agent voice layer, reference only supplied facts, and end with one natural next step.',
      '',
      'Agent voice baseline:',
      'Agent name: Not provided',
      'Market: North Texas',
      'Tone: Warm, direct, local',
      'Preferred CTA: Ask for a quick reply',
      '',
      'Input:',
      'Buyer toured Oak Cliff bungalow last weekend. Liked the kitchen and yard, worried about commute. Follow up today.',
    ].join('\n');

    const result = buildClientReadyFollowUp(command);

    expect(result).toBe('Hi, I wanted to follow up after you toured the Oak Cliff bungalow last weekend. You mentioned liking the kitchen and yard, and I know the commute was still a concern. Would you like me to send over another option to compare?');
    expect(result).not.toMatch(/Agent voice baseline|Preferred CTA|Input:|Write a concise/i);
  });

  it('retries workflow operations and records recovered attempts', async () => {
    let attempts = 0;
    const operation = await runWorkflowOperation({
      node: 'test',
      operation: 'flaky-tool',
      maxAttempts: 2
    }, () => {
      attempts += 1;
      if (attempts === 1) throw new Error('temporary failure');
      return 'ok';
    });

    expect(operation.value).toBe('ok');
    expect(operation.trace).toEqual(expect.objectContaining({
      node: 'test',
      operation: 'flaky-tool',
      status: 'success',
      attempts: 2,
      retried: true,
      recovered: true
    }));
    expect(summarizeWorkflowAttempts([operation.trace])).toEqual(expect.objectContaining({
      status: 'ok',
      retriedOperations: 1
    }));
  });

  it('falls back after exhausted workflow retries', async () => {
    const operation = await runWorkflowOperation({
      node: 'test',
      operation: 'offline-tool',
      maxAttempts: 2,
      fallback: () => 'fallback',
      fallbackLabel: 'safe fallback'
    }, () => {
      throw new Error('offline');
    });

    expect(operation.value).toBe('fallback');
    expect(operation.trace).toEqual(expect.objectContaining({
      status: 'fallback',
      attempts: 2,
      retried: true,
      recovered: true,
      fallback: 'safe fallback',
      error: 'offline'
    }));
    expect(summarizeWorkflowAttempts([operation.trace])).toEqual(expect.objectContaining({
      status: 'degraded',
      fallbackOperations: 1
    }));
  });

  it('marks returned fallback results as degraded workflow attempts', async () => {
    const operation = await runWorkflowOperation({
      node: 'test',
      operation: 'soft-fallback-tool',
      fallbackResult: (value: { status: string }) => value.status === 'unavailable' ? 'tool unavailable' : false
    }, () => ({ status: 'unavailable' }));

    expect(operation.trace).toEqual(expect.objectContaining({
      status: 'fallback',
      attempts: 1,
      recovered: true,
      fallback: 'tool unavailable'
    }));
    expect(summarizeWorkflowAttempts([operation.trace]).status).toBe('degraded');
  });

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

  it('recognizes a raw pasted listing instead of routing it as a lead command', () => {
    const worker = chooseWorkerForCommand(pastedListingText);
    const classification = classifyCommandIntent(pastedListingText);
    const listingFacts = extractListingFacts(pastedListingText);

    expect(worker.id).toBe('listing-summary');
    expect(classification).toEqual(expect.objectContaining({
      intent: 'listing_analysis',
      workerId: 'listing-summary',
      requiresListingParse: true,
    }));
    expect(listingFacts).toEqual(expect.objectContaining({
      isListingLike: true,
      mlsId: '20654321',
      price: '$485,000',
      beds: '4',
      baths: '3',
      sqft: '2,418',
    }));
  });

  it('does not use lead scoring as the ambiguous fallback worker', () => {
    expect(chooseWorkerForCommand('Can you clean this up?').id).toBe('follow-up-writer');
    expect(chooseWorkerForCommand('zzzzzz '.repeat(50)).id).toBe('listing-summary');
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

  it('keeps common-source relay fallbacks scoped to the selected worker', () => {
    const neighborhood = intelligenceWorkers.find((candidate) => candidate.id === 'neighborhood-explainer')!;
    const plan = buildTahRelayPlan(neighborhood, [{
      source: 'agent_brand.tah',
      title: 'Agent Brand',
      concepts: ['tone'],
      matchReason: 'common source'
    }]);

    expect(plan.templateId).toBe('neighborhood-field-guide');
  });

  it('runs commands through a worker, relay plan, and provenance screen without query memory', async () => {
    process.env.PULSE_QUERY_MEMORY_DISABLED = 'true';
    process.env.PULSE_QUERY_MEMORY_PATH = path.join(os.tmpdir(), `pulse-query-memory-${Date.now()}.tah`);

    const response = await runCommandCenterCommand({
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
    expect(response.result.relayPlan.finalScreen.learned.join(' ')).toContain('main context');
    expect(response.trace.queryMemory).toEqual(expect.objectContaining({
      status: 'disabled',
      saved: false,
      recalled: 0
    }));
    expect(response.trace.workflow).toEqual(expect.objectContaining({
      failedOperations: 0
    }));
    expect(response.trace.workflow?.attempts.map((attempt) => attempt.operation)).toEqual(expect.arrayContaining([
      'query-memory-recall',
      'atlas-context-retrieval',
      'worker-result',
      'query-memory-save'
    ]));
    expect(response.trace.progress?.find((item) => item.id === 'supervisor')).toEqual(expect.objectContaining({
      status: 'queued'
    }));
    expect(fs.existsSync(queryMemoryPath())).toBe(false);
  });

  it('keeps saved query memory local and addressable when enabled', () => {
    const filePath = path.join(os.tmpdir(), `pulse-query-memory-${Date.now()}.tah`);
    const sqlsyncPath = path.join(os.tmpdir(), `pulse-sqlsync-query-${Date.now()}.jsonl`);
    process.env.PULSE_QUERY_MEMORY_PATH = filePath;
    process.env.PULSE_QUERY_MEMORY_DISABLED = 'false';
    process.env.PULSE_SQLSYNC_JOURNAL_PATH = sqlsyncPath;
    process.env.PULSE_SQLSYNC_JOURNAL_DISABLED = 'false';

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
    expect(trace.sqlsync).toEqual(expect.objectContaining({
      status: 'staged',
      saved: true,
      path: path.relative(process.cwd(), sqlsyncPath)
    }));

    const snapshot = getSqlsyncCommandJournalSnapshot();
    expect(snapshot.mutationCount).toBe(1);
    expect(snapshot.tableCounts).toEqual({ command_query_memory: 1 });
    expect(snapshot.recent[0]).toEqual(expect.objectContaining({
      reducer: 'upsert_command_query_memory',
      table: 'command_query_memory',
      primaryKey: 'cmd_test_memory'
    }));
  });

  it('does not recall stale same-worker memory without command overlap', () => {
    const filePath = path.join(os.tmpdir(), `pulse-query-memory-stale-${Date.now()}.tah`);
    process.env.PULSE_QUERY_MEMORY_PATH = filePath;
    process.env.PULSE_QUERY_MEMORY_DISABLED = 'false';

    const worker = intelligenceWorkers.find((candidate) => candidate.id === 'follow-up-writer')!;
    const relayPlan = buildTahRelayPlan(worker, [], 'script');
    saveQueryMemory({
      commandId: 'cmd_stale_follow_up',
      command: 'Write a buyer follow-up about financing timing',
      intent: 'FOLLOW_UP',
      worker,
      relayPlan,
      sources: [{ source: 'lead_history.tah', concepts: ['lead', 'buyer'], matchReason: 'test' }],
      summary: 'A financing follow-up was prepared.',
      actions: ['Ask about loan timing.']
    });

    expect(recallQueryMemories('Rewrite this sentence so it sounds warmer', worker)).toEqual([]);
    expect(recallQueryMemories('Write another buyer financing follow-up', worker).length).toBe(1);
  });

  it('handles pasted listing text longer than the old short command limit', async () => {
    process.env.PULSE_QUERY_MEMORY_DISABLED = 'true';
    process.env.PULSE_QUERY_MEMORY_PATH = path.join(os.tmpdir(), `pulse-query-memory-listing-${Date.now()}.tah`);

    expect(longPastedListingText.length).toBeGreaterThan(600);

    const response = await runCommandCenterCommand({
      command: longPastedListingText,
      relayMode: 'briefing',
      supervisor: true,
    });

    expect(response.worker.id).toBe('listing-summary');
    expect(response.result.summary).toContain('pasted listing');
    expect(response.result.summary).toContain('Strongest likely angles');
    expect(response.result.summary.length).toBeLessThan(600);
    expect(response.result.deliverable.title).toContain('Listing intake');
    expect(response.result.deliverable.copyReadyText).toContain('Parsed facts');
    expect(response.result.deliverable.copyReadyText).toContain('Copy starter');
    expect(response.result.deliverable.copyReadyText).toContain('Validation');
    expect(response.intent).toBe('listing_analysis');
    expect(response.trace.classification).toEqual(expect.objectContaining({
      intent: 'listing_analysis',
      workerId: 'listing-summary',
      requiresListingParse: true,
    }));
    expect(response.trace.listingFacts).toEqual(expect.objectContaining({
      isListingLike: true,
      price: '$485,000',
      beds: '4',
      baths: '3',
      sqft: '2,418',
    }));
    expect(response.trace.listingFacts?.hooks).toEqual(expect.arrayContaining([
      'Updated interior and finish story',
      'Outdoor living angle',
    ]));
    expect(response.trace.listingFacts?.confidence).toBeGreaterThanOrEqual(80);
    expect(response.trace.contextBudget).toEqual(expect.objectContaining({
      intent: 'listing_analysis',
      totalKept: expect.any(Number),
      estimatedChars: expect.any(Number),
    }));
    expect(response.trace.retrievalPolicy).toEqual(expect.objectContaining({
      name: 'structured listing fast path',
      linkedExpansionDepth: 0,
    }));
    expect(response.trace.retrievalPolicy?.stages.map((stage) => stage.name)).toContain('atlas traversal skipped');
    expect(response.trace.workflow?.attempts.find((attempt) => attempt.operation === 'atlas-context-retrieval')).toEqual(
      expect.objectContaining({ status: 'success' })
    );
    expect(response.trace.progress?.map((item) => item.id)).toEqual([
      'classified',
      'worker',
      'listing',
      'context',
      'answer',
      'supervisor',
    ]);
  });

  it('keeps internal TAH language out of user-facing command output', async () => {
    process.env.PULSE_QUERY_MEMORY_DISABLED = 'true';

    const response = await runCommandCenterCommand({
      command: pastedListingText,
      relayMode: 'briefing',
      supervisor: true,
    });
    const visibleOutput = [
      response.result.summary,
      response.result.deliverable.copyReadyText,
      response.result.deliverable.sourceSummary,
      response.result.relayPlan.finalScreen.title,
      response.result.relayPlan.finalScreen.instruction,
      response.result.relayPlan.finalScreen.learned.join(' '),
      response.result.relayPlan.finalScreen.sourceCards.map((card) => `${card.source} ${card.matchReason}`).join(' '),
    ].join('\n');

    expect(visibleOutput).not.toMatch(/\bcapsule\b/i);
    expect(visibleOutput).not.toMatch(/TAH Router/i);
    expect(visibleOutput).not.toMatch(/\b[a-z0-9_]+\.(tah|hat)\b/i);
    expect(visibleOutput).toContain('Listing details');
    expect(visibleOutput).toContain('main context');
  });

  it('builds a plain Jamie helper bridge and saves the chat turn locally', async () => {
    const filePath = path.join(os.tmpdir(), `pulse-query-memory-jamie-${Date.now()}.tah`);
    process.env.PULSE_QUERY_MEMORY_PATH = filePath;
    process.env.PULSE_QUERY_MEMORY_DISABLED = 'false';

    const bridge = await buildJamieCommandBridgeContext('Help me write a clear Sunset Chat note for the grill today');

    expect(bridge?.command.worker.id).toBe('follow-up-writer');
    expect(bridge?.context).toContain('Helper picked:');
    expect(bridge?.context).toContain('Context to lean on:');
    expect(bridge?.context).toContain('saved locally');
    expect(bridge?.context).not.toContain('TAH Router');
    expect(fs.readFileSync(filePath, 'utf8')).toContain('TYPE: sunset_pulse_query_memory');
  });

  it('turns Dallas 311 code concern records into a plain answer', async () => {
    process.env.PULSE_QUERY_MEMORY_DISABLED = 'true';

    const response = await runCommandCenterCommand({
      command: 'Community Vitality: Code Concern CCS Status: New | Outcome: PENDING Location: 3800 S TYLER ST, DALLAS, TX, 75224, Dallas TX Reported: 2026 06 04T19:47:49.000 Coordinates: 0, 0 Service Request: 26 00243099 What does this mean?',
      relayMode: 'briefing',
      supervisor: true
    });

    expect(response.worker.id).toBe('dallas-community');
    expect(response.result.title).toContain('code-compliance request');
    expect(response.result.summary).toContain('3800 S TYLER ST');
    expect(response.result.summary).toContain('Coordinates 0, 0');
    expect(response.result.actions[0]).toContain('26-00243099');
    expect(response.result.civicRecord).toEqual(expect.objectContaining({
      category: 'Code Concern CCS',
      status: 'New',
      outcome: 'PENDING',
      serviceRequest: '26-00243099',
      coordinates: '0, 0'
    }));
    expect(response.result.actionItems?.map((item) => item.id)).toEqual([
      'open-dallas-311',
      'copy-service-request',
      'draft-follow-up',
      'saved-context'
    ]);
    expect(response.result.actionItems?.find((item) => item.id === 'copy-service-request')?.copyText).toBe('26-00243099');
    expect(response.result.deliverable.title).toContain('Plain interpretation');
    expect(response.result.deliverable.copyReadyText).toContain('This is a Dallas 311 code-compliance record');
    expect(response.result.deliverable.copyReadyText).not.toContain('This answer is shaped as');
  });

  it('saves command action clicks into local memory', () => {
    const filePath = path.join(os.tmpdir(), `pulse-action-memory-${Date.now()}.tah`);
    const sqlsyncPath = path.join(os.tmpdir(), `pulse-sqlsync-action-${Date.now()}.jsonl`);
    process.env.PULSE_QUERY_MEMORY_PATH = filePath;
    process.env.PULSE_QUERY_MEMORY_DISABLED = 'false';
    process.env.PULSE_SQLSYNC_JOURNAL_PATH = sqlsyncPath;
    process.env.PULSE_SQLSYNC_JOURNAL_DISABLED = 'false';

    const trace = saveCommandActionMemory({
      commandId: 'cmd_test_action',
      command: 'Explain Dallas 311 record',
      workerId: 'dallas-community',
      action: {
        id: 'copy-service-request',
        label: 'Copy Request ID',
        description: 'Copy the request ID.',
        kind: 'copy',
        copyText: '26-00243099'
      }
    });

    const content = fs.readFileSync(filePath, 'utf8');
    expect(trace.saved).toBe(true);
    expect(content).toContain('TYPE: sunset_pulse_action_memory');
    expect(content).toContain('ACTION_ID: copy-service-request');
    expect(content).toContain('ACTION_LABEL: Copy Request ID');
    expect(content).toContain('ACTION_COPY_TEXT: 26-00243099');
    expect(trace.sqlsync).toEqual(expect.objectContaining({
      status: 'staged',
      saved: true,
      path: path.relative(process.cwd(), sqlsyncCommandJournalPath())
    }));

    const snapshot = getSqlsyncCommandJournalSnapshot();
    expect(snapshot.tableCounts).toEqual({ command_action_memory: 1 });
    expect(snapshot.recent[0]).toEqual(expect.objectContaining({
      reducer: 'upsert_command_action_memory',
      table: 'command_action_memory',
      primaryKey: 'action_cmd_test_action_copy-service-request'
    }));
  });

  it('records TensorZero-ready workflow evaluation metrics for command runs', async () => {
    const evalPath = path.join(os.tmpdir(), `pulse-tensorzero-evals-${Date.now()}.jsonl`);
    process.env.PULSE_QUERY_MEMORY_DISABLED = 'true';
    process.env.TENSORZERO_COMMAND_EVAL_PATH = evalPath;
    process.env.TENSORZERO_COMMAND_EVAL_DISABLED = 'false';

    const request = {
      command: 'Prepare a seller update from market velocity',
      relayMode: 'briefing' as const,
      supervisor: true
    };
    const response = await runCommandCenterCommand(request);
    const trace = recordTensorZeroCommandEvaluation({ request, response });

    expect(trace).toEqual(expect.objectContaining({
      status: 'scored',
      framework: 'tensorzero',
      functionName: 'sunset_command_center',
      saved: true
    }));
    expect(trace.metrics?.command_center_quality).toBeGreaterThan(50);
    expect(trace.variantName).toContain(response.worker.id.replace(/-/g, '_'));

    const snapshot = getTensorZeroCommandEvaluationSnapshot();
    expect(snapshot.evaluationCount).toBe(1);
    expect(snapshot.functionCounts).toEqual({ sunset_command_center: 1 });
    expect(snapshot.recent[0]).toEqual(expect.objectContaining({
      functionName: 'sunset_command_center',
      projectName: 'sunset-pulse'
    }));
    expect(JSON.stringify(snapshot.recent[0])).not.toContain(request.command);
  });

  it('records TensorZero feedback without storing raw command text', () => {
    const feedbackPath = path.join(os.tmpdir(), `pulse-tensorzero-feedback-${Date.now()}.jsonl`);
    process.env.TENSORZERO_FEEDBACK_PATH = feedbackPath;
    process.env.TENSORZERO_FEEDBACK_DISABLED = 'false';

    const trace = recordTensorZeroFeedback({
      metricName: 'command_center_usefulness',
      value: true,
      source: 'copy_answer',
      commandId: 'cmd_feedback_test',
      evaluationId: 't0_eval_feedback_test',
      workerId: 'seller-update',
      variantName: 'langgraph__auto__briefing__seller_update',
      context: {
        copiedChars: 340,
        relayMode: 'briefing'
      }
    });

    expect(trace).toEqual(expect.objectContaining({
      status: 'recorded',
      framework: 'tensorzero',
      metricName: 'command_center_usefulness',
      feedbackType: 'boolean',
      saved: true
    }));

    const snapshot = getTensorZeroFeedbackSnapshot();
    expect(snapshot.feedbackCount).toBe(1);
    expect(snapshot.metricCounts).toEqual({ command_center_usefulness: 1 });
    expect(snapshot.sourceCounts).toEqual({ copy_answer: 1 });
    expect(snapshot.recent[0]).toEqual(expect.objectContaining({
      commandId: 'cmd_feedback_test',
      evaluationId: 't0_eval_feedback_test',
      workerId: 'seller-update'
    }));
    expect(JSON.stringify(snapshot.recent[0])).not.toContain('Prepare a seller update from market velocity');
  });

  it('records JamieChat turns through TensorZero without storing raw chat text', () => {
    const jamiePath = path.join(os.tmpdir(), `pulse-tensorzero-jamie-${Date.now()}.jsonl`);
    process.env.TENSORZERO_JAMIE_CHAT_PATH = jamiePath;
    process.env.TENSORZERO_JAMIE_CHAT_DISABLED = 'false';

    const trace = recordTensorZeroJamieTurn({
      messages: [
        { role: 'system', content: 'You are Jamie.' },
        { role: 'user', content: 'Should I show the Oak Cliff property to investor Maya today?' }
      ],
      propertyData: { id: 'property_123', city: 'Dallas' },
      memoryContext: { isReturning: true },
      isDevMode: true,
      response: {
        role: 'assistant',
        content: 'Yes. Lead with the lease-up story and verify comps before sending.',
        tool_calls: [{ id: 'call_1', name: 'search_properties' }]
      },
      content: 'Yes. Lead with the lease-up story and verify comps before sending.',
      toolResults: [{ name: 'search_properties', output: { properties: [{ id: 'property_123' }] } }]
    });

    expect(trace).toEqual(expect.objectContaining({
      status: 'scored',
      framework: 'tensorzero',
      functionName: 'jamie_chat',
      saved: true
    }));
    expect(trace.variantName).toContain('groq_direct');
    expect(trace.metrics?.jamie_property_grounding).toBe(true);

    const snapshot = getTensorZeroJamieChatSnapshot();
    expect(snapshot.turnCount).toBe(1);
    expect(snapshot.functionCounts).toEqual({ jamie_chat: 1 });
    expect(snapshot.recent[0]).toEqual(expect.objectContaining({
      functionName: 'jamie_chat',
      projectName: 'sunset-pulse'
    }));
    expect(JSON.stringify(snapshot.recent[0])).not.toContain('Oak Cliff property');
    expect(JSON.stringify(snapshot.recent[0])).not.toContain('investor Maya');
  });
});

function restoreEnv(key: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[key];
  } else {
    process.env[key] = value;
  }
}
