import { projectStoragePolicy as policy } from './projectStoragePolicy.mjs';
import { uploadWithStorageBudget } from './projectStorageBudget.mjs';

const unavailable = () => ({ status: 'unavailable', backgroundUploadsAllowed: false, reasons: ['capacity_unverified'], metrics: null });

/** Read-only inspection. It never deletes files or releases uncertain charges. */
export async function inspectProjectStorage(client) {
  const controller = new AbortController();
  let timer;
  try {
    let request = client.rpc('project_storage_budget_status');
    if (typeof request?.abortSignal === 'function') request = request.abortSignal(controller.signal);
    const { data, error } = await Promise.race([
      request,
      new Promise((_, reject) => {
        timer = setTimeout(() => { controller.abort(); reject(new Error('Capacity inspection timed out')); }, policy.inspectionTimeoutMs);
      }),
    ]);
    if (error || !data) return unavailable();
    const { limitBytes, liveBytes, reservedBytes, retiredBytes, availableBytes, observedBytes, databaseBytes, pendingUploads, unknownSizeObjects, paused, bucketLimits } = data;
    if (![limitBytes, liveBytes, reservedBytes, retiredBytes, availableBytes, observedBytes, databaseBytes, pendingUploads, unknownSizeObjects]
      .every((number) => Number.isSafeInteger(number) && number >= 0)
      || limitBytes < 1 || limitBytes > policy.fileBudgetBytes || typeof paused !== 'boolean'
      || !Array.isArray(bucketLimits) || bucketLimits.some((bucket) => typeof bucket?.id !== 'string' || !bucket.id
        || (bucket.fileLimitBytes !== null && (!Number.isSafeInteger(bucket.fileLimitBytes) || bucket.fileLimitBytes < 1)))) return unavailable();
    const chargedBytes = liveBytes + reservedBytes + retiredBytes;
    if (!Number.isSafeInteger(chargedBytes) || chargedBytes > limitBytes || availableBytes !== limitBytes - chargedBytes) return unavailable();
    const reasons = [];
    if (paused) reasons.push('uploads_paused');
    if (observedBytes !== liveBytes || unknownSizeObjects > 0) reasons.push('accounting_mismatch');
    if (bucketLimits.some((bucket) => bucket.fileLimitBytes === null || bucket.fileLimitBytes > (Object.hasOwn(policy.bucketFileLimits, bucket.id) ? policy.bucketFileLimits[bucket.id] : policy.maxSingleFileBytes))) reasons.push('bucket_limit_mismatch');
    const cartridgeBucket = bucketLimits.find((bucket) => bucket.id === 'cartridges');
    if (!cartridgeBucket) reasons.push('cartridge_bucket_missing');
    // Leave 100 MB of the admission budget for customer files. The database
    // warning also pauses generated cartridges before metadata grows further.
    if (chargedBytes + (cartridgeBucket?.fileLimitBytes ?? 0) > Math.min(policy.backgroundBudgetBytes, limitBytes)) reasons.push('background_file_budget_reached');
    if (databaseBytes >= policy.databaseWarningBytes) reasons.push('database_near_limit');
    const status = reasons.some((reason) => ['uploads_paused', 'accounting_mismatch'].includes(reason)) ? 'blocked' : reasons.length ? 'warning' : 'healthy';
    return {
      status, backgroundUploadsAllowed: reasons.length === 0, reasons,
      metrics: { limitBytes, liveBytes, reservedBytes, retiredBytes, chargedBytes, availableBytes, observedBytes, databaseBytes, pendingUploads },
    };
  } catch { return unavailable(); }
  finally { clearTimeout(timer); }
}

/** One background publication. Existing immutable paths and Wikipedia stay put. */
export async function publishBackgroundCartridge(client, name, loadBody) {
  if (/(^|\/)wiki_|(^|\/)wikipedia[-.]/i.test(name)) return { state: 'skipped', error: null };
  const maintenance = await inspectProjectStorage(client);
  if (!maintenance.backgroundUploadsAllowed) return { state: 'paused', error: { message: `Background publishing paused: ${maintenance.reasons.join(', ')}.` } };
  try {
    const existing = await client.storage.from('cartridges').info(name);
    if (!existing.error && existing.data) return { state: 'existing', error: null };
    if (String(existing.error?.statusCode ?? existing.error?.status) !== '404') return { state: 'paused', error: { message: 'Existing cloud file state cannot be verified.' } };
    const body = await loadBody();
    const bytes = typeof body?.size === 'number' ? body.size : body?.byteLength;
    if (!Number.isSafeInteger(bytes) || bytes < 1 || bytes > policy.bucketFileLimits.cartridges) return { state: 'skipped', error: { message: 'Cartridge exceeds the configured 5 MiB limit or has no valid size.' } };
    const result = await uploadWithStorageBudget(client, 'cartridges', name, body, { upsert: false, contentType: 'application/octet-stream' });
    if (result.error) return { state: 'paused', error: { message: 'Batch paused after a cloud upload error; existing charges were retained.' } };
    return { state: 'uploaded', error: null };
  } catch { return { state: 'paused', error: { message: 'Cloud publication state cannot be verified; batch paused.' } }; }
}
