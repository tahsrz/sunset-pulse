import { checkRateLimit } from '@/lib/core/rateLimit';

/**
 * Helper to apply rate limiting in API routes.
 * @param {string} token - Unique identifier (user ID or IP).
 * @param {number} limit - Max requests per minute.
 * @returns {Promise<Response | null>} - Returns a 429 Response if limited, else null
 */
export const applyApiRateLimit = async (token, limit = 10) => {
  const { isLimited, remaining, reset } = await checkRateLimit(token, limit);
  
  const headers = {
    'Content-Type': 'application/json',
    'X-RateLimit-Limit': limit.toString(),
    'X-RateLimit-Remaining': remaining.toString(),
    'X-RateLimit-Reset': reset.toString(),
  };

  if (isLimited) {
    const retryAfter = Math.max(0, reset - Math.floor(Date.now() / 1000));
    headers['Retry-After'] = retryAfter.toString();

    return new Response(
      JSON.stringify({ 
        success: false, 
        message: `Too many requests. Tactical pause required. Please try again in ${retryAfter} seconds.` 
      }), 
      { 
        status: 429,
        headers
      }
    );
  }
  
  // Standard practice is to send remaining headers on successful requests too
  // since this helper returns null for success to let the route continue
  // the route needs to manually append these headers to its final response.
  return null;
};

