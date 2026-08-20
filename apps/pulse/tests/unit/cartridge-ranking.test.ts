import { describe, expect, it } from 'vitest';
import { normalizeRetrievalQuery, rankCartridgeDocuments, scoreRetrievedEvidence } from '@/lib/ai/brain/cartridge_ranking';

const cartridge = (name: string) => ({ name, path: name, slug: name, title: name, type: 'tah' as const });

describe('TAH candidate ranking v2', () => {
  it('removes filler and expands domain synonyms', () => {
    const normalized = normalizeRetrievalQuery('What should a buyer examine in HOA documents?');
    expect(normalized.terms).not.toContain('what');
    expect(normalizeRetrievalQuery('How does photosynthesis work?').terms).not.toContain('how');
    expect(normalized.terms).toContain('homeowners');
    expect(normalized.terms).toContain('estate');
  });

  it('prioritizes a distinctive catalog entity over generic question terms', () => {
    const ranked = rankCartridgeDocuments([
      { cartridge: cartridge('wiki_generic.tah'), title: 'Wiki Generic', searchTerms: 'How light becomes visible', representativeText: 'How light works.', domain: 'Wikipedia' },
      { cartridge: cartridge('wiki_exact.tah'), title: 'Wiki Exact', searchTerms: 'Photosynthesis - Wikipedia', representativeText: '', domain: 'Wikipedia' },
    ], 'How does photosynthesis convert light into energy?');

    expect(ranked[0].cartridge.name).toBe('wiki_exact.tah');
    expect(ranked[0].reasons).toContain('specific: photosynthesis');
  });

  it('puts catalog and title matches ahead of unrelated broad cartridges', () => {
    const ranked = rankCartridgeDocuments([
      { cartridge: cartridge('architecture.tah'), title: 'Computer Architecture', searchTerms: '', representativeText: 'processor storage systems', domain: 'Computer Science' },
      { cartridge: cartridge('wiki_linux.tah'), title: 'Linux kernel', searchTerms: 'Linux Linus Torvalds', representativeText: 'The Linux kernel is an operating system kernel.', domain: 'General Knowledge' },
    ], 'Who created the Linux kernel and why?');
    expect(ranked[0].cartridge.name).toBe('wiki_linux.tah');
    expect(ranked[0].score).toBeGreaterThan(ranked[1].score);
    expect(ranked[0].reasons.join(' ')).toContain('Linux'.toLowerCase());
  });

  it('rejects hash collisions and calibrates textually supported evidence', () => {
    expect(scoreRetrievedEvidence('French Revolution causes', 'A disk controller manages storage requests.', 40, 1)).toBe(0);
    expect(scoreRetrievedEvidence('French Revolution causes', 'The French Revolution had political and economic causes.', 40, 1)).toBeGreaterThan(0.5);
  });
});
