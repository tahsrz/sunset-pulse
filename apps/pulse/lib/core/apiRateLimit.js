import { checkRateLimit } from '@/lib/core/rateLimit';

/**
 * Helper to apply rate limiting in API routes.
 * @param {string} token - Unique identifier (user ID or IP).
 * @param {number} limit - Max requests per minute.
 * @returns {Promise<Response | null>} - Returns a 429 Response if limited, else null.
 */
export const applyApiRateLimit = async (token, limit = 10) => {
  const { isLimited } = await checkRateLimit(token, limit);
  if (isLimited) {
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: 'Too many requests. Tactical pause required. Please try again in a minute.' 
      }), 
      { 
        status: 429,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
  return null;
};
