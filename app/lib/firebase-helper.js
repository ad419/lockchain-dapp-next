import { db } from "./firebase-admin";
import { globalCache } from "./cache";

// Track request counts to avoid quota limits
let requestCounts = {
  read: 0,
  lastReset: Date.now(),
};

// Reset counters every minute
setInterval(() => {
  requestCounts.read = 0;
  requestCounts.lastReset = Date.now();
}, 60000);

// Maximum reads per minute
const MAX_READS = 500;

/**
 * Safely execute Firestore operations with caching and rate limiting
 */
export async function safeFirestoreOperation(
  operation,
  cacheKey = null,
  fallbackData = null
) {
  // Check cache first if we have a cache key
  if (cacheKey && globalCache.has(cacheKey)) {
    console.log(`Using cached data for: ${cacheKey}`);
    return globalCache.get(cacheKey);
  }

  // Check if we're approaching rate limits
  if (requestCounts.read > MAX_READS) {
    console.warn("Read rate limit approaching, using cache or fallback");

    // If we have a cache key but no data yet, return fallback
    if (fallbackData !== null) {
      return fallbackData;
    }

    // Wait a bit before trying again
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  try {
    // Increment read counter
    requestCounts.read++;

    // Perform the operation
    const result = await operation();

    // Cache the result if we have a key
    if (cacheKey) {
      globalCache.set(cacheKey, result);
    }

    return result;
  } catch (error) {
    // Handle quota exceeded errors
    if (error.code === 8 && error.details?.includes("Quota exceeded")) {
      console.error(
        `Firebase quota exceeded for operation${
          cacheKey ? `: ${cacheKey}` : ""
        }`
      );

      // Return cached data if available
      if (cacheKey && globalCache.has(cacheKey)) {
        console.log(`Using cached data due to quota error for: ${cacheKey}`);
        return globalCache.get(cacheKey);
      }

      // Return fallback data if provided
      if (fallbackData !== null) {
        return fallbackData;
      }

      // Rethrow with a more user-friendly message
      throw new Error(
        "Service is temporarily unavailable. Please try again later."
      );
    }

    // Rethrow other errors
    throw error;
  }
}
