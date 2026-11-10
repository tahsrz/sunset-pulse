const DEFAULT_LOCAL_ORIGIN = 'http://localhost:3000';

export function getBrowserAuthOrigin() {
  const browserOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const configuredOrigin = process.env.NEXT_PUBLIC_AUTH_REDIRECT_ORIGIN || process.env.NEXT_PUBLIC_SITE_URL || '';

  if (browserOrigin && isLocalOrigin(browserOrigin)) {
    return browserOrigin;
  }

  if (browserOrigin && !browserOrigin.includes('vercel.app')) {
    return browserOrigin;
  }

  if (configuredOrigin && !configuredOrigin.includes('vercel.app')) {
    return configuredOrigin.replace(/\/+$/, '');
  }

  return browserOrigin || DEFAULT_LOCAL_ORIGIN;
}

export function buildAuthCallbackUrl(origin: string, next = '/auth/success') {
  const safeNext = sanitizeAuthNext(next);
  return `${origin.replace(/\/+$/, '')}/auth/callback?next=${encodeURIComponent(safeNext)}`;
}

export function getAuthCallbackOrigin(requestOrigin: string) {
  const configured = process.env.NEXT_PUBLIC_AUTH_REDIRECT_ORIGIN;
  if (configured) {
    try {
      const target = new URL(configured);
      if (['http:', 'https:'].includes(target.protocol) && !target.username && !target.password
        && target.pathname === '/' && !target.search && !target.hash) return target.origin;
    } catch { /* Invalid configuration falls back to the request origin. */ }
  }
  return requestOrigin;
}

export function sanitizeAuthNext(next?: string | null) {
  if (!next) return '/auth/success';

  try {
    const decoded = decodeURIComponent(next);
    if (!decoded.startsWith('/') || decoded.startsWith('//')) return '/auth/success';
    if (decoded.includes('\\')) return '/auth/success';
    return decoded;
  } catch {
    return '/auth/success';
  }
}

function isLocalOrigin(origin: string) {
  try {
    const { hostname } = new URL(origin);
    return hostname === 'localhost' || hostname === '127.0.0.1';
  } catch {
    return false;
  }
}
