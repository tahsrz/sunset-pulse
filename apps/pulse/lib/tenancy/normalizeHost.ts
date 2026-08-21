import type { NormalizedHostname } from './contracts';

export type HostNormalizationErrorCode =
  | 'MISSING_HOST'
  | 'SURROUNDING_WHITESPACE'
  | 'FORWARDED_HOST_CHAIN'
  | 'FORBIDDEN_HOST_CHARACTER'
  | 'IPV6_UNSUPPORTED'
  | 'INVALID_PORT'
  | 'INVALID_HOSTNAME';

export type NormalizedHost = Readonly<{
  hostname: NormalizedHostname;
  port: number | null;
}>;

export type HostNormalizationResult =
  | Readonly<{ ok: true; value: NormalizedHost }>
  | Readonly<{
      ok: false;
      error: Readonly<{
        code: HostNormalizationErrorCode;
        auditReason: string;
      }>;
    }>;

const HOST_LABEL_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
const IPV4_PATTERN = /^\d{1,3}(?:\.\d{1,3}){3}$/;

export function normalizeHost(input: string | null | undefined): HostNormalizationResult {
  if (!input) return failure('MISSING_HOST', 'The request did not contain a host value.');
  if (input !== input.trim()) {
    return failure('SURROUNDING_WHITESPACE', 'The host contained surrounding whitespace.');
  }
  if (input.includes(',')) {
    return failure('FORWARDED_HOST_CHAIN', 'The host contained multiple comma-separated values.');
  }
  if (/\s|[\u0000-\u001f\u007f]/.test(input)) {
    return failure('FORBIDDEN_HOST_CHARACTER', 'The host contained whitespace or control characters.');
  }
  if (input.includes('://') || /[\\/?#@]/.test(input)) {
    return failure('FORBIDDEN_HOST_CHARACTER', 'The host contained URI or user-info characters.');
  }
  if (input.startsWith('[') || input.includes(']') || count(input, ':') > 1) {
    return failure('IPV6_UNSUPPORTED', 'IPv6 host literals are not supported by tenant resolution.');
  }

  let hostname = input;
  let port: number | null = null;
  const colonIndex = input.lastIndexOf(':');

  if (colonIndex !== -1) {
    const rawPort = input.slice(colonIndex + 1);
    hostname = input.slice(0, colonIndex);

    if (!/^\d{1,5}$/.test(rawPort)) {
      return failure('INVALID_PORT', 'The host port was not a valid decimal port.');
    }

    port = Number(rawPort);
    if (port < 1 || port > 65_535) {
      return failure('INVALID_PORT', 'The host port was outside the valid range.');
    }
  }

  if (hostname.endsWith('.')) hostname = hostname.slice(0, -1);
  hostname = hostname.toLowerCase();

  if (!hostname || hostname.length > 253 || hostname.endsWith('.')) {
    return failure('INVALID_HOSTNAME', 'The hostname length or trailing-dot form was invalid.');
  }

  if (IPV4_PATTERN.test(hostname)) {
    const octets = hostname.split('.').map(Number);
    if (octets.some((octet) => octet > 255)) {
      return failure('INVALID_HOSTNAME', 'The IPv4 hostname contained an invalid octet.');
    }
  } else {
    const labels = hostname.split('.');
    if (labels.some((label) => !HOST_LABEL_PATTERN.test(label))) {
      return failure('INVALID_HOSTNAME', 'The hostname contained an invalid DNS label.');
    }
  }

  return Object.freeze({
    ok: true,
    value: Object.freeze({ hostname: hostname as NormalizedHostname, port }),
  });
}

function count(value: string, character: string) {
  return value.split(character).length - 1;
}

function failure(
  code: HostNormalizationErrorCode,
  auditReason: string
): HostNormalizationResult {
  return Object.freeze({
    ok: false,
    error: Object.freeze({ code, auditReason }),
  });
}

