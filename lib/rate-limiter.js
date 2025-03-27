import { LRUCache } from "lru-cache";

const rateLimit = new LRUCache({
  max: 1000, // Increased max cache size
  ttl: 60 * 1000, // Keep 1 minute window
});

export const rateLimiter = {
  async limit(ip) {
    const tokenCount = rateLimit.get(ip) || 0;

    // Increased limit to 50 requests per minute for testing
    if (tokenCount >= 50) {
      return { success: false };
    }

    rateLimit.set(ip, tokenCount + 1);
    return { success: true };
  },
};
