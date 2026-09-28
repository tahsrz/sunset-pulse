import { describe, expect, it } from 'vitest';
import { assessWithRules, getEligibleWindow } from '@/lib/agent-workspace/attentionPolicy';
import { validateAttentionResponse } from '@/lib/agent-workspace/attentionDecisionSchema';
import type { AgentSession, TranscriptSegment } from '@/lib/agent-workspace/types';

const a: AgentSession = { id: 'a', workerId: 'follow-up-writer', label: 'Follow-up Writer', assignment: 'Write a follow-up', assignmentRevision: 1, autoListenEnabled: true, spawnedAtSequence: 0, draftText: '', draftDirty: false, draftRevision: 0, transcriptCursor: 0 };
const segment = (sequence: number, text: string): TranscriptSegment => ({ id: `s${sequence}`, sessionId: 'session', sequence, text, capturedAt: 1000, final: true });

describe('agent workspace attention', () => {
  it('never evaluates interim-only content and waits for incomplete thoughts', () => {
    expect(getEligibleWindow({ ...a, transcriptCursor: 1 }, [segment(1, 'write')], 1000)).toBeNull();
    const decision = assessWithRules(a, getEligibleWindow(a, [segment(1, 'write')], 1000));
    expect(decision.action).toBe('wait');
  });

  it('submits relevant finalized speech and ignores generic chatter', () => {
    const relevant = assessWithRules(a, getEligibleWindow(a, [segment(1, 'Please write a follow up for the buyer')], 1000));
    const unrelated = assessWithRules(a, getEligibleWindow(a, [segment(2, 'The weather is pleasant today')], 1000));
    expect(relevant.action).toBe('submit');
    expect(unrelated.action).toBe('ignore');
    expect(relevant.mode).toBe('rules');
  });

  it('accepts bounded semantic output only when it matches the request', () => {
    const request = {
      windowId: 'window-1',
      agents: [{
        id: a.id,
        workerId: a.workerId,
        label: a.label,
        assignment: a.assignment,
        assignmentRevision: a.assignmentRevision,
      }],
      segments: [segment(1, 'Please write a follow up for the buyer')],
    };
    const response = validateAttentionResponse({
      decisions: [{
        agentId: a.id,
        transcriptWindowId: request.windowId,
        assignmentRevision: a.assignmentRevision,
        action: 'submit',
        reason: 'The finalized request matches the follow-up assignment.',
        relevantSegmentIds: ['s1'],
        mode: 'semantic',
      }],
      assessmentId: 'assessment-1',
      mode: 'semantic',
      usage: { inputTokens: 40, outputTokens: 18, totalTokens: 58 },
    }, request);

    expect(response.mode).toBe('semantic');
    expect(response.decisions[0].action).toBe('submit');
    expect(() => validateAttentionResponse({
      ...response,
      decisions: [{ ...response.decisions[0], relevantSegmentIds: ['unknown-segment'] }],
    }, request)).toThrow('bounded request');
  });
});
