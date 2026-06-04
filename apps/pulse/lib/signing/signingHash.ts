import crypto from 'crypto';

export function stableStringify(value: any): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }

  if (value && typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(',')}}`;
  }

  return JSON.stringify(value);
}

export function hashPayload(value: any): string {
  return crypto.createHash('sha256').update(stableStringify(value)).digest('hex');
}

export function createSignerToken(): string {
  return crypto.randomBytes(24).toString('hex');
}
