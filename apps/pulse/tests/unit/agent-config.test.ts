import { describe, expect, it } from 'vitest';
import {
  FALLBACK_AGENT_ID,
  getAgentIdFromHeaders,
  getAgentIdFromInput,
  getDefaultAgentId,
  normalizeAgentId,
} from '@/lib/sites/agentConfig';

describe('agentConfig', () => {
  it('falls back to the current Taz agent id when env is empty', () => {
    expect(getDefaultAgentId({} as NodeJS.ProcessEnv)).toBe(FALLBACK_AGENT_ID);
  });

  it('uses a configured public default agent id', () => {
    expect(getDefaultAgentId({ NEXT_PUBLIC_DEFAULT_AGENT_ID: 'Agent-One' } as NodeJS.ProcessEnv)).toBe('agent-one');
  });

  it('normalizes valid ids and rejects unsafe ids', () => {
    expect(normalizeAgentId('  North-Texas_Agent-01  ')).toBe('north-texas_agent-01');
    expect(normalizeAgentId('../oops')).toBeNull();
    expect(normalizeAgentId('bad id')).toBeNull();
  });

  it('prefers explicit input before env fallback', () => {
    expect(
      getAgentIdFromInput(
        { agentId: 'Listing-Pro' },
        { NEXT_PUBLIC_DEFAULT_AGENT_ID: 'default-agent' } as NodeJS.ProcessEnv,
      ),
    ).toBe('listing-pro');
  });

  it('can resolve agent ids from trusted forwarded headers', () => {
    const headers = new Headers({ 'x-sunset-agent-id': 'Broker-Portal' });
    expect(getAgentIdFromHeaders(headers, {} as NodeJS.ProcessEnv)).toBe('broker-portal');
  });
});

