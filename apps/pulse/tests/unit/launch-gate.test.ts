import { describe, expect, it } from 'vitest';
import { evaluateLaunchGate } from '@/lib/profit/launchGate';

const base = { cohort: 'internal' as const, legalApproved: true, pricingDecision: 'launch' as const, evidenceDays: 14, trustBlocker: false, reconciliationGap: false };

describe('controlled launch gate', () => {
  it('allows the internal cohort only after evidence is complete', () => expect(evaluateLaunchGate(base)).toEqual({ cohort: 'internal', eligible: true, blockers: [] }));
  it('blocks a broader cohort with insufficient evidence', () => expect(evaluateLaunchGate({ ...base, cohort: 'three_agent', evidenceDays: 14 })).toMatchObject({ eligible: false, blockers: ['cohort_evidence_incomplete'] }));
  it('blocks legal, trust, and reconciliation failures', () => expect(evaluateLaunchGate({ ...base, legalApproved: false, trustBlocker: true, reconciliationGap: true }).blockers).toEqual(['legal_not_approved', 'trust_blocker', 'reconciliation_gap']));
});
