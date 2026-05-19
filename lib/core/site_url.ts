/**
 * Extracts the absolute site URL from a Request or environment variables.
 * Prioritizes Forwarded headers, then Host header, then NEXT_PUBLIC_SITE_URL.
 */
export function siteUrlFromRequest(request?: Request | null) {
  if (request) {
    const forwardedProto = request.headers.get('x-forwarded-proto') || 'https';
    const forwardedHost = request.headers.get('x-forwarded-host');
    const host = forwardedHost || request.headers.get('host');

    if (host) {
      return `${forwardedProto}://${host}`;
    }

    // Fallback to the URL if headers are missing (common in unit tests)
    try {
      const url = new URL(request.url);
      if (url.host && !url.host.includes('example.com')) {
        return `${url.protocol}//${url.host}`;
      }
    } catch (e) {
      // Ignore
    }
  }

  return process.env.NEXT_PUBLIC_SITE_URL || 'https://sunsetpulse.com';
}
