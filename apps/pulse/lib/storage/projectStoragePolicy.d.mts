export const projectStoragePolicy: Readonly<{
  fileBudgetBytes: number;
  backgroundBudgetBytes: number;
  databaseWarningBytes: number;
  maxSingleFileBytes: number;
  inspectionTimeoutMs: number;
  bucketFileLimits: Readonly<Record<string, number>>;
}>;
