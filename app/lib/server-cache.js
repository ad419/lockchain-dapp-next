import { LRUCache } from "lru-cache";
import { enhanceServerCache } from "./profile-data";

// Create a shared server-side cache for profiles
const profileCache = new LRUCache({
  max: 500, // Store up to 500 profiles
  ttl: 3600000, // 1 hour TTL
  updateAgeOnGet: true,
  allowStale: true,
});

// Create a shared server-side cache for wallet data
const walletCache = new LRUCache({
  max: 500, // Store up to 500 wallet entries
  ttl: 1800000, // 30 minutes TTL
  updateAgeOnGet: true,
  allowStale: true,
});

// Create a shared server-side cache for holders data
const holderCache = new LRUCache({
  max: 1, // Only store the latest holder list
  ttl: 30000, // 30 seconds TTL
  updateAgeOnGet: true,
  allowStale: true,
});

// Stats tracking
const cacheStats = {
  hits: 0,
  misses: 0,
  staleHits: 0,
};

// Server-side cache implementation

// Initialize global caches if they don't exist
if (!global.serverCache) {
  global.serverCache = {
    profiles: new Map(),
    wallets: new Map(),
    lastCleanup: Date.now(),
    staleThreshold: 5 * 60 * 1000, // 5 minutes
    maxAge: 60 * 60 * 1000, // 1 hour
    hits: 0,
    misses: 0,
  };

  // Set up periodic cleanup
  setInterval(() => {
    const now = Date.now();
    let expired = 0;

    // Clean up profile cache
    for (const [key, entry] of global.serverCache.profiles.entries()) {
      if (now - entry.timestamp > global.serverCache.maxAge) {
        global.serverCache.profiles.delete(key);
        expired++;
      }
    }

    // Clean up wallet cache
    for (const [key, entry] of global.serverCache.wallets.entries()) {
      if (now - entry.timestamp > global.serverCache.maxAge) {
        global.serverCache.wallets.delete(key);
        expired++;
      }
    }

    if (expired > 0) {
      console.log(
        `\x1b[2m🧹 Cache cleanup: removed ${expired} expired items\x1b[0m`
      );
    }

    global.serverCache.lastCleanup = now;
  }, 15 * 60 * 1000); // Run every 15 minutes

  console.log("\x1b[1m\x1b[36m🚀 Server cache initialized\x1b[0m");
}

export const serverCache = enhanceServerCache({
  // Profile cache methods
  getProfileCache(key) {
    const entry = global.serverCache.profiles.get(key);

    if (!entry) {
      global.serverCache.misses++;
      return null;
    }

    const now = Date.now();
    const age = now - entry.timestamp;
    const stale = age > global.serverCache.staleThreshold;

    global.serverCache.hits++;

    return {
      data: entry.data,
      timestamp: entry.timestamp,
      age,
      stale,
    };
  },

  setProfileCache(key, data) {
    global.serverCache.profiles.set(key, {
      data,
      timestamp: Date.now(),
    });
  },

  // Wallet cache methods
  getWalletCache(key) {
    const entry = global.serverCache.wallets.get(key);

    if (!entry) {
      global.serverCache.misses++;
      return null;
    }

    const now = Date.now();
    const age = now - entry.timestamp;
    const stale = age > global.serverCache.staleThreshold;

    global.serverCache.hits++;

    return {
      data: entry.data,
      timestamp: entry.timestamp,
      age,
      stale,
    };
  },

  setWalletCache(key, data) {
    global.serverCache.wallets.set(key, {
      data,
      timestamp: Date.now(),
    });
  },

  // Holder list cache methods
  getHoldersCache: () => {
    if (!holderCache.has("holders")) return null;

    const item = holderCache.get("holders");
    const now = Date.now();
    const cachedAt = new Date(item._cachedAt).getTime();
    const age = now - cachedAt;
    const stale = age > 10000; // 10 seconds stale threshold

    return {
      data: item,
      age,
      stale,
      fresh: !stale,
    };
  },

  setHoldersCache: (data) => {
    holderCache.set("holders", {
      ...data,
      _cachedAt: new Date().toISOString(),
    });
  },

  // Stats methods
  logHit(stale = false) {
    global.serverCache.hits++;
  },

  logMiss() {
    global.serverCache.misses++;
  },

  getHitRate() {
    const total = global.serverCache.hits + global.serverCache.misses;
    const rate = total > 0 ? (global.serverCache.hits / total) * 100 : 0;

    return {
      hits: global.serverCache.hits,
      misses: global.serverCache.misses,
      total,
      hitRate: rate,
    };
  },

  // Get overall cache stats
  getStats() {
    return {
      profiles: {
        size: global.serverCache.profiles.size,
        keys: [...global.serverCache.profiles.keys()],
      },
      wallets: {
        size: global.serverCache.wallets.size,
        keys: [...global.serverCache.wallets.keys()],
      },
      hits: global.serverCache.hits,
      misses: global.serverCache.misses,
      hitRate: this.getHitRate().hitRate.toFixed(2) + "%",
      lastCleanup: new Date(global.serverCache.lastCleanup).toISOString(),
    };
  },

  // Utility methods
  invalidateProfile: (username) => {
    const key = `profile_${username.toLowerCase()}`;
    if (profileCache.has(key)) {
      profileCache.delete(key);
      return true;
    }
    return false;
  },

  invalidateWallet: (address) => {
    const key = `wallet_${address.toLowerCase()}`;
    if (walletCache.has(key)) {
      walletCache.delete(key);
      return true;
    }
    return false;
  },

  clearAllCaches: () => {
    profileCache.clear();
    walletCache.clear();
    holderCache.clear();
    cacheStats.hits = 0;
    cacheStats.misses = 0;
    cacheStats.staleHits = 0;
    return {
      cleared: true,
      timestamp: new Date().toISOString(),
    };
  },
});
