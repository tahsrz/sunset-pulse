import { describe, expect, it } from 'vitest';
import { analyzeCallAssist } from '@/lib/call-assist/analyzer';

describe('call assist analyzer', () => {
  it('locks assist cards until the disclosure is read and caller consent is captured', () => {
    const result = analyzeCallAssist({
      transcript: 'Caller: I want to tour tomorrow.',
      consent: { disclosureRead: true, callerConsented: false },
      context: { callerName: 'Avery' }
    });

    expect(result.consent.ready).toBe(false);
    expect(result.stage).toBe('consent-needed');
    expect(result.cards).toEqual([
      expect.objectContaining({
        id: 'consent-required',
        kind: 'consent'
      })
    ]);
    expect(result.memoryPatch.nextActions).toContain('Capture disclosure and caller consent.');
  });

  it('detects price friction and asks for payment comfort', () => {
    const result = analyzeCallAssist({
      transcript: 'Caller: The price feels high, but we are preapproved and could tour tomorrow.',
      consent: { disclosureRead: true, callerConsented: true, recordingAllowed: true },
      context: {
        callerName: 'Avery',
        propertyAddress: '123 Oak Trail',
        propertyPrice: 525000,
        budget: 500000
      }
    });

    expect(result.consent.ready).toBe(true);
    expect(result.intentScore).toBeGreaterThanOrEqual(70);
    expect(result.stage).toBe('showing-ready');
    expect(result.cards).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'objection-price', kind: 'objection' }),
      expect.objectContaining({ id: 'next-question-payment', kind: 'next-question' })
    ]));
    expect(result.memoryPatch.budgetFit).toBe('near-budget');
    expect(result.followUpDraft).toContain('123 Oak Trail');
  });

  it('raises compliance guardrails before ordinary coaching cards', () => {
    const result = analyzeCallAssist({
      transcript: 'Agent: This is a safe neighborhood and it will definitely go up in value.',
      consent: { disclosureRead: true, callerConsented: true },
      context: { propertyAddress: '456 Pine Lane' }
    });

    expect(result.cards[0]).toEqual(expect.objectContaining({
      kind: 'compliance',
      title: 'Avoid Guaranteed Outcome'
    }));
    expect(result.cards).toEqual(expect.arrayContaining([
      expect.objectContaining({ title: 'Neighborhood Claim Risk' })
    ]));
    expect(result.talkTrack).toContain('future value is never guaranteed');
  });

  it('builds a post-call memory patch and follow-up draft', () => {
    const result = analyzeCallAssist({
      mode: 'post-call',
      transcript: 'Caller: I need to talk it over with my spouse. We may want to see it this week.',
      consent: { disclosureRead: true, callerConsented: true, recordingAllowed: false },
      context: {
        callerName: 'Morgan',
        propertyAddress: '789 Cedar Court',
        timeframe: 'this week'
      }
    });

    expect(result.stage).toBe('post-call');
    expect(result.consent.warning).toBe('Caller consented to notes, but recording is off.');
    expect(result.memoryPatch.objections).toContain('Decision Partner');
    expect(result.followUpDraft).toContain('Hi Morgan');
    expect(result.followUpDraft).toContain('789 Cedar Court');
  });
});
