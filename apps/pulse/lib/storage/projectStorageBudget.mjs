const paused = () => ({ data: null, error: { code: 'STORAGE_BUDGET_UNAVAILABLE', statusCode: '503', message: 'Storage capacity cannot be verified. New uploads are paused.' } });

function reservationFailure(error) {
  if (error?.code !== 'P0001') return paused();
  if (/budget reached|budget is paused/.test(error.message || '')) return { data: null, error: { code: 'STORAGE_BUDGET_EXCEEDED', statusCode: '507', message: 'Storage capacity is full. New uploads are paused; existing files are safe.' } };
  return { data: null, error: { code: 'STORAGE_UPLOAD_BLOCKED', statusCode: '409', message: 'This cloud upload is not permitted. Use a new file path and a configured file size limit.' } };
}

async function reserve(client, bucket, name, bytes) {
  if (!Number.isSafeInteger(bytes) || bytes <= 0) return { data: null, error: { code: 'INVALID_STORAGE_SIZE', statusCode: '400', message: 'The upload must have a known, positive file size.' } };
  try {
    const result = await client.rpc('reserve_project_storage', { p_bucket: bucket, p_name: name, p_bytes: bytes });
    if (result.error) return reservationFailure(result.error);
    const reservation = result.data;
    if (!reservation || typeof reservation.reservationId !== 'string' || !Number.isSafeInteger(reservation.maxBytes) || reservation.maxBytes < bytes) return paused();
    return { data: reservation, error: null };
  } catch { return paused(); }
}

/** Every reservation charges the provider's maximum file size, including signed uploads. */
export async function uploadWithStorageBudget(client, bucket, name, body, options = {}) {
  const bytes = typeof body?.size === 'number' ? body.size : body?.byteLength;
  const reservation = await reserve(client, bucket, name, bytes);
  if (reservation.error) return reservation;
  // Immutable objects prevent an overwrite from retaining an uncharged old version.
  // Uncertain failures retain their reservation; retries cannot silently free it.
  return client.storage.from(bucket).upload(name, body, { ...options, upsert: false });
}

export async function createBudgetedSignedUploadUrl(client, bucket, name, declaredBytes) {
  const reservation = await reserve(client, bucket, name, declaredBytes);
  if (reservation.error) return reservation;
  return client.storage.from(bucket).createSignedUploadUrl(name, { upsert: false });
}
