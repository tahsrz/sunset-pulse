import { describe, expect, it } from 'vitest';
import { parseUsdToCents } from '@/lib/realtor-workspace/money';

describe('USD form input', () => {
  it('accepts correctly grouped amounts shown in form placeholders', () => {
    expect(parseUsdToCents('100,000.00')).toBe(10000000);
    expect(parseUsdToCents('12,000.50')).toBe(1200050);
    expect(parseUsdToCents('150')).toBe(15000);
  });
  it.each(['1,00', '1,,000', '1,000,', '1.234', '-1', '0', '1.'])('rejects invalid input %s', (value) => {
    expect(() => parseUsdToCents(value)).toThrow();
  });
});
