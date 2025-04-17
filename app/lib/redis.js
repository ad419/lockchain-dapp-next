import { Redis } from "@upstash/redis";

// Check if required environment variables are present
if (!process.env.UPSTASH_REDIS_URL || !process.env.UPSTASH_REDIS_TOKEN) {
  console.warn(
    "⚠️ Redis environment variables missing. Cache will not work properly."
  );
}

// Create Redis client
let redis;

try {
  redis = new Redis({
    url: process.env.UPSTASH_REDIS_URL || "",
    token: process.env.UPSTASH_REDIS_TOKEN || "",
  });

  // Test the connection
  redis
    .set("connection_test", "ok", { ex: 10 })
    .then(() => {
      console.log("✅ Redis connection successful");
    })
    .catch((err) => {
      console.error("❌ Redis connection failed:", err);
    });
} catch (err) {
  console.error("❌ Failed to initialize Redis client:", err);
  // Create a mock Redis client that logs errors but doesn't crash
  redis = {
    get: async () => {
      console.error("Redis not configured");
      return null;
    },
    set: async () => {
      console.error("Redis not configured");
      return false;
    },
    del: async () => {
      console.error("Redis not configured");
      return 0;
    },
    exists: async () => {
      console.error("Redis not configured");
      return 0;
    },
    keys: async () => {
      console.error("Redis not configured");
      return [];
    },
    ttl: async () => {
      console.error("Redis not configured");
      return -2;
    },
  };
}

export { redis };

// Key prefixes for organization
const KEYS = {
  LEADERBOARD: "leaderboard:data",
  SOCIAL_DATA: "social:",
  HOLDERS_DATA: "holders:data",
  CACHE_META: "cache:meta",
  LAST_MODIFIED: "holders:lastModified", // Add this line
};

// Update or add these functions to properly handle data serialization
function serializeData(data) {
  try {
    // Make sure we're properly converting objects to JSON strings
    if (typeof data === "object" && data !== null) {
      return JSON.stringify(data);
    }
    // If it's already a string, just return it
    if (typeof data === "string") {
      return data;
    }
    // Convert other types to strings
    return String(data);
  } catch (error) {
    console.error("Error serializing data for Redis:", error);
    return JSON.stringify({}); // Return empty object as fallback
  }
}

function deserializeData(data) {
  if (!data) return null;

  try {
    // If it's already an object, just return it
    if (typeof data === "object" && data !== null) {
      return data;
    }

    // If it's a string, try to parse it
    if (typeof data === "string") {
      // Special handling for "[object Object]" which is not valid JSON
      if (data === "[object Object]") {
        console.warn(
          "Found incorrect object serialization in Redis, returning empty object"
        );
        return {};
      }

      // Check if it's a toString output of an object
      if (data.startsWith("[object") && data.endsWith("]")) {
        console.warn(
          `Found invalid object serialization in Redis: ${data}, returning empty object`
        );
        return {};
      }

      return JSON.parse(data);
    }

    // For any other type, return as is
    return data;
  } catch (error) {
    console.error("Error parsing Redis data:", error, typeof data, data);
    return null;
  }
}

// Redis cache helper
export const redisCache = {
  // Store complete leaderboard data
  async setLeaderboardData(data) {
    try {
      // Increase the TTL to 180 seconds (3 minutes) to reduce command frequency
      await redis.set(
        KEYS.LEADERBOARD,
        serializeData({
          data,
          timestamp: Date.now(),
        }),
        { ex: 30 } // Increased from 60 to 180 seconds
      );

      // Store metadata
      await redis.set(
        KEYS.CACHE_META,
        serializeData({
          lastUpdated: Date.now(),
          entries: data.holders?.length || 0,
        })
      );

      // Also update the last modified timestamp
      await this.updateLastModified();

      return true;
    } catch (err) {
      console.error("Redis error setting leaderboard data:", err);
      return false;
    }
  },

  // Get leaderboard data
  async getLeaderboardData() {
    try {
      const cachedData = await redis.get(KEYS.LEADERBOARD);
      if (!cachedData) return null;

      const parsed = deserializeData(cachedData);
      if (!parsed || !parsed.data) return null;

      return {
        ...parsed.data,
        cachedAt: parsed.timestamp,
        age: Date.now() - parsed.timestamp,
      };
    } catch (err) {
      console.error("Redis error getting leaderboard data:", err);
      return null;
    }
  },

  // Store social data for a specific wallet
  async setSocialData(walletAddress, data) {
    try {
      if (!redis || !walletAddress) return false;

      // Only accept proper objects or strings
      if (data === null || data === undefined) {
        console.warn(
          `Invalid social data for ${walletAddress}, skipping cache`
        );
        return false;
      }

      const key = `${KEYS.SOCIAL_DATA}${walletAddress.toLowerCase()}`;

      // Debug log what we're storing
      console.log(
        `Setting social data for ${walletAddress.slice(0, 6)}: ${JSON.stringify(
          data
        ).slice(0, 100)}`
      );

      // Explicitly create a clean object without methods/prototypes
      const cleanData = {
        twitter: data.twitter || null,
        profileImage: data.profileImage || null,
        name: data.name || null,
        verified: Boolean(data.verified),
        showProfile: data.showProfile !== false,
      };

      // Serialize the data
      const serialized = serializeData(cleanData);

      if (!serialized) {
        console.error(`Failed to serialize social data for ${walletAddress}`);
        return false;
      }

      // Store with expiration (12 hours)
      await redis.set(key, serialized, {
        ex: 43200, // 12 hours
      });

      // Also update last modified timestamp
      await this.updateLastModified();

      return true;
    } catch (error) {
      console.error(
        `Error caching social data for ${walletAddress} in Redis:`,
        error
      );
      return false;
    }
  },

  // Get social data for a specific wallet
  async getSocialData(walletAddress) {
    try {
      if (!redis || !walletAddress) return null;

      const key = `${KEYS.SOCIAL_DATA}${walletAddress.toLowerCase()}`;
      const data = await redis.get(key);

      if (!data) return null;

      // Add debug logging
      console.log(
        `Raw Redis data for ${walletAddress.slice(0, 6)}:`,
        typeof data,
        data?.slice?.(0, 100)
      );

      // Make sure we're correctly deserializing
      const deserializedData = deserializeData(data);

      // If we have a nested data structure (from previous bugfix)
      if (deserializedData && deserializedData.data) {
        console.log(`Returning nested data for ${walletAddress.slice(0, 6)}`);
        return deserializedData.data;
      }

      return deserializedData;
    } catch (err) {
      console.error(
        `Error getting social data for ${walletAddress} from Redis:`,
        err
      );
      return null;
    }
  },

  // Token price methods removed since we'll use the API directly without caching

  // Store raw holders data
  async setHoldersData(data) {
    try {
      // Increase TTL to 5 minutes (300 seconds)
      await redis.set(
        KEYS.HOLDERS_DATA,
        serializeData({
          data,
          timestamp: Date.now(),
        }),
        { ex: 300 } // Increased from 120 to 300 seconds
      );

      // Also update the last modified timestamp
      await this.updateLastModified();

      return true;
    } catch (err) {
      console.error("Redis error setting holders data:", err);
      return false;
    }
  },

  // Get raw holders data
  async getHoldersData(allowStale = false) {
    try {
      const cachedData = await redis.get(KEYS.HOLDERS_DATA);
      if (!cachedData) return null;

      const parsed = deserializeData(cachedData);

      // Check if data is stale (TTL <= 0)
      const ttl = await redis.ttl(KEYS.HOLDERS_DATA);

      // If ttl <= 0, data is expired but we might still want to use it
      if (ttl <= 0 && !allowStale) {
        return null;
      }

      return parsed?.data || null;
    } catch (err) {
      console.error("Redis error getting holders data:", err);
      return null;
    }
  },

  // Invalidate specific cache
  async invalidate(key) {
    try {
      if (key === "leaderboard") {
        await redis.del(KEYS.LEADERBOARD);
      } else if (key === "holders") {
        await redis.del(KEYS.HOLDERS_DATA);
      } else if (key.startsWith("social:")) {
        const address = key.split(":")[1];
        await redis.del(`${KEYS.SOCIAL_DATA}${address}`);
      } else if (key === "all") {
        // Get all keys with our prefixes and delete them
        const keys = await redis.keys(`${KEYS.SOCIAL_DATA}*`);
        keys.push(KEYS.LEADERBOARD, KEYS.HOLDERS_DATA, KEYS.CACHE_META);
        // TOKEN_PRICE removed from this list

        if (keys.length > 0) {
          await redis.del(...keys);
        }
      }
      return true;
    } catch (err) {
      console.error("Redis error invalidating cache:", err);
      return false;
    }
  },

  // Get cache stats
  async getStats() {
    try {
      const meta = deserializeData(await redis.get(KEYS.CACHE_META)) || {};
      const socialKeys = await redis.keys(`${KEYS.SOCIAL_DATA}*`);

      return {
        leaderboard: {
          available: Boolean(await redis.exists(KEYS.LEADERBOARD)),
          lastUpdated: meta.lastUpdated
            ? new Date(meta.lastUpdated).toISOString()
            : null,
          entries: meta.entries || 0,
          ttl: await redis.ttl(KEYS.LEADERBOARD),
        },
        socialData: {
          count: socialKeys.length,
        },
        holdersData: {
          available: Boolean(await redis.exists(KEYS.HOLDERS_DATA)),
          ttl: await redis.ttl(KEYS.HOLDERS_DATA),
        },
        // tokenPrice section removed
      };
    } catch (err) {
      console.error("Redis error getting stats:", err);
      return { error: err.message };
    }
  },

  // Track when holders data was last modified
  async updateLastModified() {
    try {
      await redis.set(KEYS.LAST_MODIFIED, Date.now());
      return true;
    } catch (err) {
      console.error("Redis error updating last modified timestamp:", err);
      return false;
    }
  },

  // Get the last modified timestamp
  async getLastModified() {
    try {
      const timestamp = await redis.get(KEYS.LAST_MODIFIED);
      return timestamp ? Number(timestamp) : null;
    } catch (err) {
      console.error("Redis error getting last modified timestamp:", err);
      return null;
    }
  },

  // Track the last modified timestamp for data
  async updateLastModified() {
    try {
      if (!redis) return false;
      const timestamp = Date.now();
      await redis.set("holders:lastModified", timestamp);
      return timestamp;
    } catch (err) {
      console.error("Redis error updating lastModified:", err);
      return false;
    }
  },

  // Get the last modified timestamp
  async getLastModified() {
    try {
      if (!redis) return null;
      const timestamp = await redis.get("holders:lastModified");
      return timestamp ? parseInt(timestamp) : Date.now();
    } catch (err) {
      console.error("Redis error getting lastModified:", err);
      return Date.now();
    }
  },

  // Track when an address balance was last updated
  async trackAddressUpdate(address, balance) {
    try {
      if (!redis) return false;
      if (!address) return false;

      // Get current time
      const timestamp = Date.now();

      // Normalize address
      const normalizedAddress = address.toLowerCase();

      // Store the timestamp of this update
      await redis.set(`address:lastUpdate:${normalizedAddress}`, timestamp);

      // Also store the current balance for future reference
      await redis.set(`address:balance:${normalizedAddress}`, balance);

      return true;
    } catch (err) {
      console.error("Redis error tracking address update:", err);
      return false;
    }
  },

  // Check if an address was updated after a given timestamp
  async wasAddressUpdated(address, sinceTimestamp) {
    try {
      if (!redis) return false;
      if (!address) return false;

      // Normalize address
      const normalizedAddress = address.toLowerCase();

      // Get the last update timestamp for this address
      const lastUpdate = await redis.get(
        `address:lastUpdate:${normalizedAddress}`
      );

      // If no timestamp found, we can't say it was updated
      if (!lastUpdate) return false;

      // Check if the address was updated after the provided timestamp
      return parseInt(lastUpdate) > parseInt(sinceTimestamp);
    } catch (err) {
      console.error("Redis error checking address update:", err);
      return false;
    }
  },

  // Get the last modified timestamp
  getLastModified: async () => {
    try {
      if (!redis) return Date.now();
      const timestamp = await redis.get("holders:lastModified");
      return timestamp ? parseInt(timestamp) : Date.now();
    } catch (err) {
      console.error("Redis error getting lastModified:", err);
      return Date.now();
    }
  },

  // Update the last modified timestamp
  updateLastModified: async () => {
    try {
      if (!redis) return false;
      await redis.set("holders:lastModified", Date.now().toString());
      return true;
    } catch (err) {
      console.error("Redis error updating lastModified:", err);
      return false;
    }
  },

  // Track when an address balance was last updated
  trackAddressUpdate: async (address, balance) => {
    try {
      if (!redis || !address) return false;

      // Normalize address
      const normalizedAddress = address.toLowerCase();

      // Store the timestamp of this update
      await redis.set(
        `address:lastUpdate:${normalizedAddress}`,
        Date.now().toString()
      );

      // Also store the current balance for future reference
      await redis.set(`address:balance:${normalizedAddress}`, balance);

      // Update the global last modified timestamp
      await redis.set("holders:lastModified", Date.now().toString());

      return true;
    } catch (err) {
      console.error("Redis error tracking address update:", err);
      return false;
    }
  },

  // Check if an address was updated after a given timestamp
  wasAddressUpdated: async (address, sinceTimestamp) => {
    try {
      if (!redis || !address) return false;

      // Normalize address
      const normalizedAddress = address.toLowerCase();

      // Get the last update timestamp for this address
      const lastUpdate = await redis.get(
        `address:lastUpdate:${normalizedAddress}`
      );

      // If no timestamp found, we can't say it was updated
      if (!lastUpdate) return false;

      // Check if the address was updated after the provided timestamp
      return parseInt(lastUpdate) > parseInt(sinceTimestamp);
    } catch (err) {
      console.error("Redis error checking address update:", err);
      return false;
    }
  },
};
