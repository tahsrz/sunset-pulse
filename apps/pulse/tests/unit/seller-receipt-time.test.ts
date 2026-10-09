import { expect, it } from 'vitest';
import { sellerReceiptTime } from '@/lib/realtor-workspace/sellerReceiptTime';

const createdAt = '2026-03-01T00:00:00Z';
const now = Date.parse('2026-11-02T00:00:00Z');
it('records a past action in the owner timezone and keeps both fall-back occurrences distinct', () => {
  expect(sellerReceiptTime('2026-10-07T09:30', 'America/Chicago', '', createdAt, now)).toBe('2026-10-07T14:30:00.000Z');
  expect(() => sellerReceiptTime('2026-11-01T01:30', 'America/Chicago', '', createdAt, now)).toThrow(/Choose which occurrence/);
  expect(sellerReceiptTime('2026-11-01T01:30', 'America/Chicago', 'earlier', createdAt, now)).toBe('2026-11-01T06:30:00.000Z');
  expect(sellerReceiptTime('2026-11-01T01:30', 'America/Chicago', 'later', createdAt, now)).toBe('2026-11-01T07:30:00.000Z');
});
it('rejects nonexistent local times and values outside the receipt range', () => {
  expect(() => sellerReceiptTime('2026-03-08T02:30', 'America/Chicago', '', createdAt, now)).toThrow(/does not exist/);
  expect(() => sellerReceiptTime('2026-02-01T09:00', 'America/Chicago', '', createdAt, now)).toThrow(/after the seller request/);
  expect(() => sellerReceiptTime('2026-12-01T09:00', 'America/Chicago', '', createdAt, now)).toThrow(/future/);
  expect(sellerReceiptTime('', 'America/Chicago', '', createdAt, now)).toBe('2026-11-02T00:00:00.000Z');
});
