import { describe, it, expect, vi, beforeEach } from 'vitest';
import { processLeadIntelligence, syncLeadToSupabase } from '@/lib/intelligence/leadProcessor';
import { supabase } from '@/lib/supabase';

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      upsert: vi.fn(() => Promise.resolve({ error: null })),
    })),
  },
}));

// Mock models
vi.mock('@/models/Lead', () => ({
  default: {
    findOne: vi.fn(),
  },
}));

vi.mock('@/models/Property', () => ({
  default: {
    findById: vi.fn(),
  },
}));

// Mock AI and other dependencies
vi.mock('@/lib/ai/jamie', () => ({
  generateHighStakesHook: vi.fn(() => Promise.resolve({ a: 'Hook A', b: 'Hook B' })),
  getJamieResponse: vi.fn(() => Promise.resolve('Jamie analysis notes')),
}));

vi.mock('@/lib/core/pulseRNG', () => ({
  pulseRNG: {
    range: vi.fn(() => 0),
  },
}));

vi.mock('@/lib/intelligence/leadIntelligence', () => ({
  calculateLeadScore: vi.fn(() => 75),
}));

vi.mock('@/lib/communication/telegram', () => ({
  sendTelegramNotification: vi.fn(() => Promise.resolve()),
}));

describe('Lead Processor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('processLeadIntelligence', () => {
    it('should process a valid lead and return intelligence', async () => {
      const mockLeadBody = {
        name: 'John Doe',
        email: 'john@example.com',
        property: 'prop123',
        budget: 600000,
        tourRequested: true,
      };

      const result = await processLeadIntelligence(mockLeadBody);

      expect(result.probability).toBe(75);
      expect(result.tags).toContain('TOUR-REQUEST');
      expect(result.tags).toContain('PREMIUM-TIER');
      expect(result.jamieNotes).toBe('Jamie analysis notes');
      expect(result.leadCategory).toBe('Residential');
    });

    it('should throw error for invalid lead data', async () => {
      const invalidLeadBody = {
        name: 'J', // too short
        email: 'not-an-email',
      };

      await expect(processLeadIntelligence(invalidLeadBody)).rejects.toThrow('Validation failed');
    });
  });

  describe('syncLeadToSupabase', () => {
    it('should call supabase upsert with onConflict: email', async () => {
      const mockLead = {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '1234567890',
        property: { toString: () => 'prop123' },
        budget: 600000,
        timeframe: '1 month',
        probability: 75,
        jamieNotes: 'Notes',
        reengagementHook: { a: 'Hook' },
        stage: 'New',
        lastActivity: '2026-05-18T00:00:00.000Z'
      };

      const upsertSpy = vi.fn(() => Promise.resolve({ error: null }));
      (supabase.from as any).mockReturnValue({ upsert: upsertSpy });

      await syncLeadToSupabase(mockLead);

      expect(supabase.from).toHaveBeenCalledWith('leads');
      expect(upsertSpy).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'john@example.com' }),
        expect.objectContaining({ onConflict: 'email' })
      );
    });
  });
});
