import { LRUCache } from "lru-cache";

// Configuration for different cache types
const CACHE_CONFIG = {
  // Longer-lived data (user profiles, wallet claims)
  PERSISTENT: {
    max: 1000,
    ttl: 1000 * 60 * 30, // 30 minutes
    allowStale: true,
    updateAgeOnGet: true,
  },

  // Medium-lived data (messages, holder info)
  STANDARD: {
    max: 500,
    ttl: 1000 * 60 * 5, // 5 minutes
    allowStale: true,
    updateAgeOnGet: true,
  },

  // Short-lived frequently changing data
  VOLATILE: {
    max: 200,
    ttl: 1000 * 60 * 2, // 2 minutes
    allowStale: true,
    updateAgeOnGet: true,
  },

  // Very short-lived data
  EPHEMERAL: {
    max: 100,
    ttl: 1000 * 30, // 30 seconds
    allowStale: true,
    updateAgeOnGet: true,
  },
};

// Create different cache instances
const caches = {
  // User data, wallet claims, etc.
  users: new LRUCache(CACHE_CONFIG.PERSISTENT),
  walletClaims: new LRUCache(CACHE_CONFIG.PERSISTENT),

  // Messages and social data
  messages: new LRUCache(CACHE_CONFIG.STANDARD),
  userMessages: new LRUCache(CACHE_CONFIG.STANDARD),

  // Collection queries
  collectionQueries: new LRUCache(CACHE_CONFIG.STANDARD),

  // Document reads
  documents: new LRUCache(CACHE_CONFIG.STANDARD),

  // Request tracking for rate limiting
  requestCounts: {
    reads: 0,
    writes: 0,
    deletes: 0,
    lastReset: Date.now(),
  },
};

// Reset request counters every minute
setInterval(() => {
  caches.requestCounts.reads = 0;
  caches.requestCounts.writes = 0;
  caches.requestCounts.deletes = 0;
  caches.requestCounts.lastReset = Date.now();
}, 60000);

/**
 * Cached document fetch from Firestore
 * @param {object} db - Firestore db instance
 * @param {string} collection - Collection name
 * @param {string} docId - Document ID
 * @param {object} options - Cache options
 * @returns {Promise<object|null>} Document data or null
 */
export async function getCachedDoc(db, collection, docId, options = {}) {
  const {
    bypassCache = false,
    cacheTime = null, // Override default cache time
    onCacheMiss = null, // Callback on cache miss
    staleIfError = true, // Return stale data on error
  } = options;

  const cacheKey = `${collection}:${docId}`;

  // Check if we have a valid cache entry
  if (!bypassCache && caches.documents.has(cacheKey)) {
    console.log(`Cache hit: ${cacheKey}`);
    return caches.documents.get(cacheKey);
  }

  if (onCacheMiss) onCacheMiss(cacheKey);

  try {
    // Track request
    caches.requestCounts.reads++;

    // Fetch from Firestore
    console.log(`Cache miss, fetching: ${cacheKey}`);
    const docRef = db.collection(collection).doc(docId);
    const doc = await docRef.get();

    if (!doc.exists) {
      // Cache the miss too (negative caching)
      caches.documents.set(
        cacheKey,
        null,
        cacheTime || CACHE_CONFIG.STANDARD.ttl / 2
      );
      return null;
    }

    const data = { id: doc.id, ...doc.data() };

    // Cache the result
    caches.documents.set(cacheKey, data, cacheTime);

    return data;
  } catch (error) {
    console.error(`Error fetching ${cacheKey}:`, error);

    // If requested, return stale data on error
    if (staleIfError && caches.documents.has(cacheKey, { allowStale: true })) {
      console.log(`Returning stale data for ${cacheKey} after error`);
      return caches.documents.get(cacheKey, { allowStale: true });
    }

    throw error;
  }
}

/**
 * Cached collection query from Firestore
 * @param {object} db - Firestore db instance
 * @param {string} collection - Collection name
 * @param {function} queryFn - Function that builds and executes the query
 * @param {string} cacheKey - Key for caching
 * @param {object} options - Cache options
 * @returns {Promise<Array>} Query results
 */
export async function getCachedQuery(
  db,
  collection,
  queryFn,
  cacheKey,
  options = {}
) {
  const {
    bypassCache = false,
    cacheTime = null,
    staleIfError = true,
    processFn = null, // Optional function to process results
  } = options;

  const fullCacheKey = `query:${collection}:${cacheKey}`;

  // Check if we have a valid cache entry
  if (!bypassCache && caches.collectionQueries.has(fullCacheKey)) {
    console.log(`Cache hit for query: ${fullCacheKey}`);
    return caches.collectionQueries.get(fullCacheKey);
  }

  try {
    // Track request
    caches.requestCounts.reads++;

    // Execute the query
    console.log(`Cache miss, executing query: ${fullCacheKey}`);
    const snapshot = await queryFn(db.collection(collection));

    // Convert to data array
    let results = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Process results if a function is provided
    if (processFn) {
      results = processFn(results);
    }

    // Cache the results
    caches.collectionQueries.set(fullCacheKey, results, cacheTime);

    return results;
  } catch (error) {
    console.error(`Error executing query ${fullCacheKey}:`, error);

    // If requested, return stale data on error
    if (
      staleIfError &&
      caches.collectionQueries.has(fullCacheKey, { allowStale: true })
    ) {
      console.log(`Returning stale data for query ${fullCacheKey} after error`);
      return caches.collectionQueries.get(fullCacheKey, { allowStale: true });
    }

    throw error;
  }
}

/**
 * Batch get multiple documents with caching
 * @param {object} db - Firestore db instance
 * @param {string} collection - Collection name
 * @param {Array<string>} docIds - Document IDs to fetch
 * @param {object} options - Cache options
 * @returns {Promise<Array>} Documents data
 */
export async function batchGetCachedDocs(db, collection, docIds, options = {}) {
  const { bypassCache = false, cacheTime = null } = options;

  if (!docIds.length) return [];

  // Check which docs we have in cache
  const results = {};
  const docsToFetch = [];

  if (!bypassCache) {
    for (const id of docIds) {
      const cacheKey = `${collection}:${id}`;
      if (caches.documents.has(cacheKey)) {
        results[id] = caches.documents.get(cacheKey);
      } else {
        docsToFetch.push(id);
      }
    }
  } else {
    docsToFetch.push(...docIds);
  }

  // If all docs were in cache, return them
  if (docsToFetch.length === 0) {
    console.log(`All ${docIds.length} docs found in cache for ${collection}`);
    return docIds.map((id) => results[id]);
  }

  try {
    // Track request
    caches.requestCounts.reads += Math.ceil(docsToFetch.length / 10); // Count batches

    // Fetch the remaining docs in batches of 10 (Firestore limit)
    console.log(
      `Fetching ${docsToFetch.length} docs from Firestore for ${collection}`
    );
    const batches = [];

    for (let i = 0; i < docsToFetch.length; i += 10) {
      const batch = docsToFetch.slice(i, i + 10);

      batches.push(
        db
          .collection(collection)
          .where(admin.firestore.FieldPath.documentId(), "in", batch)
          .get()
      );
    }

    // Execute all batches
    const snapshots = await Promise.all(batches);

    // Process and cache results
    snapshots.forEach((snapshot) => {
      snapshot.docs.forEach((doc) => {
        const data = { id: doc.id, ...doc.data() };
        results[doc.id] = data;

        // Cache the individual doc
        const cacheKey = `${collection}:${doc.id}`;
        caches.documents.set(cacheKey, data, cacheTime);
      });
    });

    // Handle missing docs (cache nulls for them)
    docsToFetch.forEach((id) => {
      if (!results[id]) {
        results[id] = null;
        const cacheKey = `${collection}:${id}`;
        caches.documents.set(cacheKey, null, cacheTime);
      }
    });

    // Return in the same order as requested
    return docIds.map((id) => results[id]);
  } catch (error) {
    console.error(`Error batch fetching docs for ${collection}:`, error);
    throw error;
  }
}

/**
 * Get user profile data with caching
 * @param {object} db - Firestore db instance
 * @param {string} userId - User ID
 * @returns {Promise<object|null>} User data or null
 */
export async function getUserProfile(db, userId) {
  return getCachedDoc(db, "users", userId, {
    cacheTime: CACHE_CONFIG.PERSISTENT.ttl,
  });
}

/**
 * Get wallet claim with caching
 * @param {object} db - Firestore db instance
 * @param {string} walletAddress - Address to look up
 * @returns {Promise<object|null>} Claim data or null
 */
export async function getWalletClaim(db, walletAddress) {
  const normalizedWallet = walletAddress.toLowerCase();
  const cacheKey = `wallet:${normalizedWallet}`;

  // Check if we have a cached claim
  if (caches.walletClaims.has(cacheKey)) {
    return caches.walletClaims.get(cacheKey);
  }

  try {
    // Track request
    caches.requestCounts.reads++;

    // Query by wallet address
    const claimQuery = await db
      .collection("walletClaims")
      .where("walletAddress", "==", normalizedWallet)
      .limit(1)
      .get();

    if (claimQuery.empty) {
      // Cache the miss (negative caching)
      caches.walletClaims.set(cacheKey, null);
      return null;
    }

    const claim = {
      id: claimQuery.docs[0].id,
      ...claimQuery.docs[0].data(),
    };

    // Cache the result
    caches.walletClaims.set(cacheKey, claim);

    return claim;
  } catch (error) {
    console.error(
      `Error fetching wallet claim for ${normalizedWallet}:`,
      error
    );
    throw error;
  }
}

/**
 * Get messages with caching
 * @param {object} db - Firestore db instance
 * @param {number} limit - Max messages to fetch
 * @returns {Promise<Array>} Messages
 */
export async function getMessages(db, limit = 50) {
  const cacheKey = `messages:${limit}`;

  // Check if we have cached messages
  if (caches.messages.has(cacheKey)) {
    return caches.messages.get(cacheKey);
  }

  try {
    // Track request
    caches.requestCounts.reads++;

    // Fetch messages
    const messagesRef = db.collection("messages");
    const snapshot = await messagesRef
      .orderBy("timestamp", "desc")
      .limit(limit)
      .get();

    const messages = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp?.toDate?.() || new Date(),
    }));

    // Cache the messages
    caches.messages.set(cacheKey, messages, CACHE_CONFIG.VOLATILE.ttl);

    return messages;
  } catch (error) {
    console.error(`Error fetching messages:`, error);
    throw error;
  }
}

/**
 * Get messages for a specific user
 * @param {object} db - Firestore db instance
 * @param {string} walletAddress - User's wallet address
 * @param {number} limit - Max messages to fetch
 * @returns {Promise<Array>} User messages
 */
export async function getUserMessages(db, walletAddress, limit = 50) {
  const normalizedWallet = walletAddress.toLowerCase();
  const cacheKey = `user-messages:${normalizedWallet}:${limit}`;

  // Check if we have cached user messages
  if (caches.userMessages.has(cacheKey)) {
    return caches.userMessages.get(cacheKey);
  }

  try {
    // Track request
    caches.requestCounts.reads++;

    // Fetch messages
    const messagesRef = db.collection("messages");
    const snapshot = await messagesRef
      .where("walletAddress", "==", normalizedWallet)
      .orderBy("timestamp", "desc")
      .limit(limit)
      .get();

    const messages = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp?.toDate?.() || new Date(),
    }));

    // Cache the user messages
    caches.userMessages.set(cacheKey, messages);

    return messages;
  } catch (error) {
    console.error(`Error fetching messages for ${walletAddress}:`, error);
    throw error;
  }
}

/**
 * Clear specific cache entries (for when data is updated)
 */
export function invalidateCache(type, key) {
  switch (type) {
    case "document":
      caches.documents.delete(key);
      break;
    case "query":
      caches.collectionQueries.delete(`query:${key}`);
      break;
    case "messages":
      // Clear all message caches
      for (const cacheKey of caches.messages.keys()) {
        if (cacheKey.startsWith("messages:")) {
          caches.messages.delete(cacheKey);
        }
      }
      break;
    case "user-messages":
      // Clear specific user messages
      const userWallet = key.toLowerCase();
      for (const cacheKey of caches.userMessages.keys()) {
        if (cacheKey.includes(userWallet)) {
          caches.userMessages.delete(cacheKey);
        }
      }
      break;
    case "wallet-claim":
      caches.walletClaims.delete(`wallet:${key.toLowerCase()}`);
      break;
    case "user":
      caches.documents.delete(`users:${key}`);
      break;
    default:
      break;
  }
}

// Export the caches for direct access if needed
export { caches };

// Export a function to get cache stats for debugging
export function getCacheStats() {
  return {
    documents: {
      size: caches.documents.size,
      maxSize: CACHE_CONFIG.STANDARD.max,
    },
    collectionQueries: {
      size: caches.collectionQueries.size,
      maxSize: CACHE_CONFIG.STANDARD.max,
    },
    users: {
      size: caches.users.size,
      maxSize: CACHE_CONFIG.PERSISTENT.max,
    },
    walletClaims: {
      size: caches.walletClaims.size,
      maxSize: CACHE_CONFIG.PERSISTENT.max,
    },
    messages: {
      size: caches.messages.size,
      maxSize: CACHE_CONFIG.STANDARD.max,
    },
    userMessages: {
      size: caches.userMessages.size,
      maxSize: CACHE_CONFIG.STANDARD.max,
    },
    requestCounts: {
      ...caches.requestCounts,
      minutesSinceReset: Math.round(
        (Date.now() - caches.requestCounts.lastReset) / 60000
      ),
    },
  };
}
