import type { CommissionInput } from './contracts';

export const MAX_MONEY_CENTS = 1_000_000_000_000;

export type NormalizedCommission = Readonly<{
  grossCents: number | null;
  withheldCents: number | null;
  receivedCents: number;
  grossKnown: boolean;
  deductions: ReadonlyArray<{ kind: 'broker_split' | 'transaction_fee' | 'other_withheld'; label: string; amountCents: number }>;
}>;

export function parseUsdToCents(input: string): number {
  const raw = input.trim();
  // Accept conventional thousands separators, never silently repair malformed grouping.
  if (raw.includes(',') && !/^\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?$/.test(raw)) {
    throw new Error('Use standard USD grouping, for example 1,000.00.');
  }
  const value = raw.replaceAll(',', '');
  const match = /^(\d{1,12})(?:\.(\d{1,2}))?$/.exec(value);
  if (!match) throw new Error('Enter a positive USD amount with no more than two decimal places.');
  const cents = Number(match[1]) * 100 + Number((match[2] || '').padEnd(2, '0') || 0);
  if (!Number.isSafeInteger(cents) || cents < 1 || cents > MAX_MONEY_CENTS) throw new Error('The USD amount is outside the supported range.');
  return cents;
}

export function normalizeCommission(input: CommissionInput): NormalizedCommission {
  if (input.mode === 'net_deposit') {
    return { grossCents: null, withheldCents: null, receivedCents: input.depositCents, grossKnown: false, deductions: [] };
  }
  const withheldCents = input.deductions.reduce((sum, row) => sum + row.amountCents, 0);
  if (!Number.isSafeInteger(withheldCents) || withheldCents > input.grossCents) throw new Error('Deductions cannot exceed gross commission.');
  return {
    grossCents: input.grossCents,
    withheldCents,
    receivedCents: input.grossCents - withheldCents,
    grossKnown: true,
    deductions: input.deductions.map(({ kind, label, amountCents }) => ({ kind, label, amountCents })),
  };
}

export type MoneySummary = Readonly<{
  knownGrossCents: string;
  knownWithheldCents: string;
  receivedCents: string;
  paidExpensesCents: string;
  recordedNetCents: string;
  netOnlyReceiptCount: number;
  grossComplete: boolean;
}>;

export function summarizeRecordedMoney(
  receipts: ReadonlyArray<NormalizedCommission>,
  expensesCents: ReadonlyArray<number>,
): MoneySummary {
  const knownGross = receipts.reduce((sum, receipt) => sum + BigInt(receipt.grossCents ?? 0), 0n);
  const knownWithheld = receipts.reduce((sum, receipt) => sum + BigInt(receipt.withheldCents ?? 0), 0n);
  const received = receipts.reduce((sum, receipt) => sum + BigInt(receipt.receivedCents), 0n);
  const expenses = expensesCents.reduce((sum, amount) => sum + BigInt(amount), 0n);
  return {
    knownGrossCents: knownGross.toString(),
    knownWithheldCents: knownWithheld.toString(),
    receivedCents: received.toString(),
    paidExpensesCents: expenses.toString(),
    recordedNetCents: (received - expenses).toString(),
    netOnlyReceiptCount: receipts.filter((receipt) => !receipt.grossKnown).length,
    grossComplete: receipts.every((receipt) => receipt.grossKnown),
  };
}

export function formatUsdCents(value: bigint | number | string, currency = 'USD') {
  const amount = typeof value === 'bigint' ? value : BigInt(value);
  const negative = amount < 0n;
  const absolute = negative ? -amount : amount;
  const dollars = absolute / 100n;
  const fraction = String(absolute % 100n).padStart(2, '0');
  return (negative ? '-' : '') + currency + ' ' + dollars.toLocaleString('en-US') + '.' + fraction;
}
