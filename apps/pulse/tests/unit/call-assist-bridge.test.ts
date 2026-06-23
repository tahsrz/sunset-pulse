import { NextRequest } from 'next/server';
import { describe, expect, it, vi } from 'vitest';
import { POST as createSession } from '@/app/api/call-assist/sessions/route';
import { GET as getSession, POST as updateSession } from '@/app/api/call-assist/sessions/[sessionId]/route';
import { GET as getTwiML } from '@/app/api/call-assist/twiml/[sessionId]/route';
import { POST as handleConsent } from '@/app/api/call-assist/consent/[sessionId]/route';
import { POST as handleStreamStatus } from '@/app/api/call-assist/stream-status/[sessionId]/route';
import { POST as appendTranscript } from '@/app/api/call-assist/transcript/[sessionId]/route';
import { POST as saveSummary } from '@/app/api/call-assist/save-summary/[sessionId]/route';
import { createCallAssistSession } from '@/lib/call-assist/sessions';

vi.mock('@/lib/twilio', () => ({
  placeCallAssistBridgeCall: vi.fn().mockResolvedValue({
    success: true,
    mocked: true,
    sid: 'CA_MOCK_CALL_ASSIST'
  })
}));

function jsonRequest(url: string, body: unknown) {
  return new NextRequest(url, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' }
  });
}

function formRequest(url: string, fields: Record<string, string>) {
  const formData = new FormData();
  Object.entries(fields).forEach(([key, value]) => formData.set(key, value));
  return new Request(url, {
    method: 'POST',
    body: formData
  });
}

function params(sessionId: string) {
  return { params: Promise.resolve({ sessionId }) };
}

describe('call assist bridge routes', () => {
  it('creates a dry-run bridge session with TwiML and stream status URLs', async () => {
    const response = await createSession(jsonRequest('http://localhost/api/call-assist/sessions', {
      dryRun: true,
      customerPhone: '+15551112222',
      agentPhone: '+15553334444',
      streamUrl: 'wss://voice.example.com/call-assist',
      context: { callerName: 'Avery', propertyAddress: '123 Oak Trail' },
      consent: { disclosureRead: true, callerConsented: true }
    }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.session.id).toEqual(expect.any(String));
    expect(body.data.urls.twimlUrl).toContain(`/api/call-assist/twiml/${body.data.session.id}`);
    expect(body.data.urls.streamStatusUrl).toContain(`/api/call-assist/stream-status/${body.data.session.id}`);
    expect(body.data.mediaStream.configured).toBe(true);
  });

  it('serves consent TwiML before caller consent is captured', async () => {
    const session = await createCallAssistSession({
      agentPhone: '+15553334444',
      streamUrl: 'wss://voice.example.com/call-assist',
      consent: { disclosureRead: false, callerConsented: false }
    });

    const response = await getTwiML(new Request(`http://localhost/api/call-assist/twiml/${session.id}`), params(session.id));
    const body = await response.text();

    expect(response.headers.get('content-type')).toContain('text/xml');
    expect(body).toContain('<Gather input="dtmf" numDigits="1"');
    expect(body).toContain('Press 1 if that is okay');
  });

  it('captures consent and returns TwiML that starts a secure media stream before dialing the agent', async () => {
    const session = await createCallAssistSession({
      leadId: 'lead_123',
      agentPhone: '+15553334444',
      streamUrl: 'wss://voice.example.com/call-assist',
      consent: { disclosureRead: false, callerConsented: false }
    });

    const response = await handleConsent(formRequest(`http://localhost/api/call-assist/consent/${session.id}`, {
      Digits: '1'
    }), params(session.id));
    const body = await response.text();

    expect(body).toContain('<Start>');
    expect(body).toContain('<Stream');
    expect(body).toContain('url="wss://voice.example.com/call-assist"');
    expect(body).toContain('track="both_tracks"');
    expect(body).toContain(`<Parameter name="sessionId" value="${session.id}" />`);
    expect(body).toContain('<Dial>+15553334444</Dial>');
  });

  it('connects without a media stream when recording is disabled', async () => {
    const session = await createCallAssistSession({
      leadId: 'lead_123',
      agentPhone: '+15553334444',
      streamUrl: 'wss://voice.example.com/call-assist',
      consent: { disclosureRead: true, callerConsented: true, recordingAllowed: false }
    });

    const response = await getTwiML(new Request(`http://localhost/api/call-assist/twiml/${session.id}`), params(session.id));
    const body = await response.text();

    expect(body).not.toContain('<Stream');
    expect(body).toContain('Recording is off');
    expect(body).toContain('<Dial>+15553334444</Dial>');
  });

  it('updates stream status from Twilio stream webhooks', async () => {
    const session = await createCallAssistSession({
      agentPhone: '+15553334444',
      streamUrl: 'wss://voice.example.com/call-assist',
      consent: { disclosureRead: true, callerConsented: true }
    });

    await handleStreamStatus(formRequest(`http://localhost/api/call-assist/stream-status/${session.id}`, {
      StreamEvent: 'stream-started',
      StreamSid: 'MZ123',
      StreamName: 'call-assist-test'
    }), params(session.id));
    const response = await getSession(new NextRequest(`http://localhost/api/call-assist/sessions/${session.id}`), params(session.id));
    const body = await response.json();

    expect(body.data.status).toBe('streaming');
    expect(body.data.streamSid).toBe('MZ123');
  });

  it('appends transcript fragments and returns fresh assist analysis', async () => {
    const session = await createCallAssistSession({
      context: {
        callerName: 'Morgan',
        propertyAddress: '789 Cedar Court',
        propertyPrice: 525000,
        budget: 500000
      },
      consent: { disclosureRead: true, callerConsented: true }
    });

    const response = await appendTranscript(jsonRequest(`http://localhost/api/call-assist/transcript/${session.id}`, {
      fragment: 'Caller: The payment feels expensive, but I can tour tomorrow.',
      source: 'media-stream'
    }), params(session.id));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.transcript).toContain('payment feels expensive');
    expect(body.data.analysis.cards).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'objection-price' }),
      expect.objectContaining({ id: 'next-question-payment' })
    ]));
  });

  it('keeps media-stream deltas inline while preserving manual transcript line breaks', async () => {
    const session = await createCallAssistSession({
      transcript: 'Caller: ',
      consent: { disclosureRead: true, callerConsented: true }
    });

    await appendTranscript(jsonRequest(`http://localhost/api/call-assist/transcript/${session.id}`, {
      fragment: 'Payment ',
      source: 'media-stream-delta'
    }), params(session.id));
    const deltaResponse = await appendTranscript(jsonRequest(`http://localhost/api/call-assist/transcript/${session.id}`, {
      fragment: 'feels high.',
      source: 'media-stream-delta'
    }), params(session.id));
    const deltaBody = await deltaResponse.json();

    expect(deltaBody.data.transcript).toBe('Caller: Payment feels high.');

    const manualResponse = await appendTranscript(jsonRequest(`http://localhost/api/call-assist/transcript/${session.id}`, {
      fragment: 'Agent: What payment range feels comfortable?',
      source: 'operator-console'
    }), params(session.id));
    const manualBody = await manualResponse.json();

    expect(manualBody.data.transcript).toContain('Caller: Payment feels high.\nAgent: What payment range feels comfortable?');
  });

  it('finalizes post-call analysis through the session endpoint', async () => {
    const session = await createCallAssistSession({
      transcript: 'Caller: I need to talk to my spouse before deciding.',
      context: { callerName: 'Morgan' },
      consent: { disclosureRead: true, callerConsented: true }
    });

    const response = await updateSession(jsonRequest(`http://localhost/api/call-assist/sessions/${session.id}`, {
      action: 'finalize'
    }), params(session.id));
    const body = await response.json();

    expect(body.data.status).toBe('completed');
    expect(body.data.analysis.stage).toBe('post-call');
    expect(body.data.analysis.memoryPatch.objections).toContain('Decision Partner');
  });

  it('does not save a lead summary when the session has no lead id', async () => {
    const session = await createCallAssistSession({
      transcript: 'Caller: I want to tour tomorrow.',
      consent: { disclosureRead: true, callerConsented: true }
    });

    const response = await saveSummary(new NextRequest(`http://localhost/api/call-assist/save-summary/${session.id}`, {
      method: 'POST'
    }), params(session.id));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.message).toBe('No leadId is attached to this call-assist session.');
  });
});
