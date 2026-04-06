// Simple in-memory rate limiter
const tokenCache = new Map();

/**
 * Checks if a token (e.g., user ID or IP) has exceeded the rate limit.
 * @param {string} token - Unique identifier.
 * @param {number} limit - Max requests per minute.
 * @returns {Promise<{isLimited: boolean}>}
 */
export const checkRateLimit = async (token, limit = 10) => {
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  
  const tokenData = tokenCache.get(token) || { count: 0, startTime: now };
  
  // Reset window if it's expired
  if (now - tokenData.startTime > windowMs) {
    tokenData.count = 1;
    tokenData.startTime = now;
  } else {
    tokenData.count += 1;
  }
  
  tokenCache.set(token, tokenData);
  
  return { isLimited: tokenData.count > limit };
};
