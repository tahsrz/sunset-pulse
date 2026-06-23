import { describe, expect, it } from 'vitest';
import { buildCallAssistLeadHref } from '@/lib/call-assist/leadPrefill';

describe('call assist lead prefill', () => {
  it('builds a call-assist deep link from a populated lead', () => {
    const href = buildCallAssistLeadHref({
      _id: 'lead_123',
      name: 'Avery Buyer',
      phone: '+15551112222',
      budget: 500000,
      timeframe: '1-3 months',
      status: 'new',
      property: {
        _id: 'property_123',
        name: '101 S. Council',
        type: 'Residential',
        location: {
          city: 'Sunset',
          state: 'TX',
        },
        price: 525000,
        rates: {},
        images: [],
      },
      probability: 75,
    }, {
      streamUrl: 'wss://voice.example.com/call-assist/media',
    });

    expect(href).toContain('/call-assist?');
    expect(href).toContain('leadId=lead_123');
    expect(href).toContain('caller=Avery+Buyer');
    expect(href).toContain('phone=%2B15551112222');
    expect(href).toContain('property=101+S.+Council');
    expect(href).toContain('price=525000');
    expect(href).toContain('budget=500000');
    expect(href).toContain('timeline=1-3+months');
    expect(href).toContain('stage=new');
    expect(href).toContain('streamUrl=wss%3A%2F%2Fvoice.example.com%2Fcall-assist%2Fmedia');
  });
});
