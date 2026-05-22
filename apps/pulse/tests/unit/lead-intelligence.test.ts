import { describe, it, expect } from 'vitest';
import { calculateVelocity } from '@/lib/intelligence/leadIntelligence';

describe('Lead Intelligence - Logistic Velocity', () => {
  it('should calculate velocity using a sigmoid curve', () => {
    const now = new Date();
    const lead = {
      createdAt: new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000)), // 7 days ago (inflection point)
      views: 10,
      chatMinutes: 5,
      tourRequested: false
    };

    // score = 10 + (5 * 2) = 20
    // at t=7, timeFactor = 1 / (1 + e^0) = 0.5
    // velocity = 20 * 0.5 = 10
    const velocity = calculateVelocity(lead);
    expect(velocity).toBe(10);
  });

  it('should show lower velocity for very new leads (maturation)', () => {
    const now = new Date();
    const score = 100;
    
    const leadNew = {
      createdAt: new Date(now.getTime() - (1 * 24 * 60 * 60 * 1000)), // 1 day ago
      views: 100,
      chatMinutes: 0
    };
    
    const leadOld = {
      createdAt: new Date(now.getTime() - (14 * 24 * 60 * 60 * 1000)), // 14 days ago
      views: 100,
      chatMinutes: 0
    };

    const velNew = calculateVelocity(leadNew);
    const velOld = calculateVelocity(leadOld);

    // With x=7, k=0.5:
    // t=1 => 1 / (1 + e^(-0.5 * -6)) = 1 / (1 + e^3) ≈ 0.047
    // t=14 => 1 / (1 + e^(-0.5 * 7)) = 1 / (1 + e^-3.5) ≈ 0.97
    
    expect(velNew).toBeLessThan(velOld);
  });

  it('should handle tour requests in velocity score', () => {
    const now = new Date();
    const lead = {
      createdAt: new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000)),
      views: 0,
      chatMinutes: 0,
      tourRequested: true
    };

    // score = 20 (tour bonus)
    // t=7 => factor = 0.5
    // velocity = 10
    expect(calculateVelocity(lead)).toBe(10);
  });
});
