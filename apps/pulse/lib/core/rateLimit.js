/**
 * High-Precision Sliding Window Rate Limiter
 * Tracks requests over a rolling time frame to prevent "gaming" resets.
 */
const tokenCache = new Map();

/**
 * Checks if a token (e.g., user ID or IP) has exceeded the rate limit.
 * @param {string} token - Unique identifier.
 * @param {number} limit - Max requests per minute.
 * @returns {Promise<{isLimited: boolean, limit: number, remaining: number, reset: number}>}
 */
export const checkRateLimit = async (token, limit = 10) => {
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute rolling window
  
  // Get existing logs for this token
  let timestamps = tokenCache.get(token) || [];
  
  // Filter out timestamps older than the rolling window
  const windowStart = now - windowMs;
  const filtered = timestamps.filter(ts => ts > windowStart);
  
  // Perform the check BEFORE adding the current timestamp to ensure not past limit
  const isLimited = (filtered.length + 1) > limit;
  
  // Always log the attempt if not limited, or log if limited to track history Track the Sliding Window
  filtered.push(now);
  tokenCache.set(token, filtered);
  
  const count = filtered.length;
  const remaining = Math.max(0, limit - count);
  
  // reset time is the oldest request currently in the window will expire when
  const reset = filtered.length > 0 
    ? Math.ceil((filtered[0] + windowMs) / 1000) 
    : Math.ceil((now + windowMs) / 1000);
  
  return { 
    isLimited, 
    limit, 
    remaining, 
    reset 
  };
};


