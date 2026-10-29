/** Keep browser failure diagnostics useful without logging SDK objects or access credentials. */
export function mapFailureDiagnostic(reason: unknown): { message: string } {
  const event = reason && typeof reason === 'object' && 'error' in reason ? reason.error : reason;
  const message = event && typeof event === 'object' && 'message' in event && typeof event.message === 'string'
    ? event.message : 'Map renderer or controls unavailable.';
  return { message: message
    .replace(/(?:pk|sk)\.[A-Za-z0-9_.-]+/g, '[redacted-key]')
    .replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '[redacted-token]')
    .replace(/([?&](?:access_token|token|api_key|key)=)[^&\s]+/gi, '$1[redacted]')
    .slice(0, 300) };
}
