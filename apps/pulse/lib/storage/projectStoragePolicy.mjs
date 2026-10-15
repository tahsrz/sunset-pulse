// Decimal byte limits match the project admission budget and Free file ceiling.
export const projectStoragePolicy = Object.freeze({
  fileBudgetBytes: 800_000_000,
  backgroundBudgetBytes: 700_000_000,
  databaseWarningBytes: 400_000_000,
  maxSingleFileBytes: 50_000_000,
  inspectionTimeoutMs: 5_000,
  bucketFileLimits: Object.freeze({
    cartridges: 5_242_880,
    'lead-evidence': 10_485_760,
    reports: 10_485_760,
    'property-scans': 50_000_000,
  }),
});
