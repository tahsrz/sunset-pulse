import { describe, expect, it } from 'vitest';
import {
  leadResponseOperatingHoursFromEnv,
  shouldEscalateLeadResponse,
} from '@/lib/intelligence/leadResponseEscalation';

const policy = {
  timeZone: 'America/Chicago',
  weekdays: [1, 2, 3, 4, 5],
  startHour: 8,
  endHour: 18,
  thresholdMinutes: 10,
};

describe('lead response escalation policy', () => {
  it('escalates a delivered lead after ten operating minutes', () => {
    expect(shouldEscalateLeadResponse(
      { deliveredAt: '2026-08-24T14:00:00.000Z', leadStatus: 'new' },
      new Date('2026-08-24T14:10:00.000Z'),
      policy,
    )).toBe(true);
  });

  it('does not count after-hours time against the agent', () => {
    expect(shouldEscalateLeadResponse(
      { deliveredAt: '2026-08-24T00:00:00.000Z', leadStatus: 'new' },
      new Date('2026-08-24T13:05:00.000Z'),
      policy,
    )).toBe(false);
  });

  it('does not escalate when another channel recorded contact', () => {
    expect(shouldEscalateLeadResponse(
      {
        deliveredAt: '2026-08-24T14:00:00.000Z',
        contactAttemptedAt: '2026-08-24T14:04:00.000Z',
        leadStatus: 'new',
      },
      new Date('2026-08-24T15:00:00.000Z'),
      policy,
    )).toBe(false);
  });

  it.each(['closed', 'archived'])('does not escalate resolved %s leads', (leadStatus) => {
    expect(shouldEscalateLeadResponse(
      { deliveredAt: '2026-08-24T14:00:00.000Z', leadStatus },
      new Date('2026-08-24T15:00:00.000Z'),
      policy,
    )).toBe(false);
  });

  it('parses deploy-time operating hour configuration conservatively', () => {
    expect(leadResponseOperatingHoursFromEnv({
      AGENT_ALERT_OPERATING_TIME_ZONE: 'America/Denver',
      AGENT_ALERT_OPERATING_WEEKDAYS: '1,2,3,4,5,6',
      AGENT_ALERT_OPERATING_START_HOUR: '9',
      AGENT_ALERT_OPERATING_END_HOUR: '17',
      AGENT_ALERT_CONTACT_THRESHOLD_MINUTES: '15',
    })).toEqual({
      timeZone: 'America/Denver',
      weekdays: [1, 2, 3, 4, 5, 6],
      startHour: 9,
      endHour: 17,
      thresholdMinutes: 15,
    });
  });
});
