import { db } from "./firebase-admin";
import { serverCache } from "./server-cache";

// Add these utility functions at the top, after imports
const COLORS = {
  RESET: "\x1b[0m",
  RED: "\x1b[31m",
  GREEN: "\x1b[32m",
  YELLOW: "\x1b[33m",
  BLUE: "\x1b[34m",
  MAGENTA: "\x1b[35m",
  CYAN: "\x1b[36m",
  BRIGHT: "\x1b[1m",
  DIM: "\x1b[2m",
};

/**
 * Formatting utilities for logs
 */
const LOG = {
  cache: (message) =>
    console.log(
      `${COLORS.BRIGHT}${COLORS.GREEN}🚀 CACHE HIT${COLORS.RESET} ${message}`
    ),
  miss: (message) =>
    console.log(
      `${COLORS.BRIGHT}${COLORS.YELLOW}⚠️  CACHE MISS${COLORS.RESET} ${message}`
    ),
  firebase: (message) =>
    console.log(
      `${COLORS.BRIGHT}${COLORS.RED}🔥 FIREBASE READ${COLORS.RESET} ${message}`
    ),
  info: (message) =>
    console.log(
      `${COLORS.BRIGHT}${COLORS.BLUE}ℹ️  INFO${COLORS.RESET} ${message}`
    ),
  error: (message) =>
    console.error(
      `${COLORS.BRIGHT}${COLORS.RED}⛔ ERROR${COLORS.RESET} ${message}`
    ),
  success: (message) =>
    console.log(
      `${COLORS.BRIGHT}${COLORS.GREEN}✅ SUCCESS${COLORS.RESET} ${message}`
    ),
  perf: (operation, timeMs) =>
    console.log(
      `${COLORS.BRIGHT}${COLORS.MAGENTA}⏱️  PERF${
        COLORS.RESET
      } ${operation} completed in ${timeMs.toFixed(2)}ms`
    ),
};

// Update the getProfileData function with better logging
export async function getProfileData(
  username,
  forceRefresh = false,
  includeWallet = true
) {
  if (!username) return null;

  try {
    const startTime = Date.now();
    const normalizedUsername = username.toLowerCase();
    const cacheKey = `${normalizedUsername}${
      includeWallet ? "_with_wallet" : ""
    }`;

    LOG.info(
      `Request for profile: ${username} (includeWallet=${includeWallet}, forceRefresh=${forceRefresh})`
    );

    // Check cache first (unless forced refresh requested)
    if (!forceRefresh) {
      const cachedProfile = serverCache.getProfileCache(cacheKey);

      if (cachedProfile) {
        const ageSeconds = Math.round(cachedProfile.age / 1000);
        LOG.cache(
          `Profile for ${COLORS.CYAN}${username}${COLORS.RESET} found in cache (age: ${ageSeconds}s)`
        );
        LOG.perf(`Cache retrieval for ${username}`, Date.now() - startTime);

        // Log cache stats
        const hitRate = serverCache.getHitRateFormatted();
        LOG.info(`Cache hit rate: ${hitRate}`);

        return cachedProfile.data;
      }
    }

    LOG.miss(
      `Profile for ${COLORS.CYAN}${username}${COLORS.RESET} not in cache, fetching from Firebase`
    );

    // Try multiple case variations for username lookup
    LOG.firebase(`Starting Firebase query for username: ${username}`);
    const queryStart = Date.now();
    const userDoc = await findUserDocument(username);
    LOG.perf(`Username lookup in Firebase`, Date.now() - queryStart);

    if (!userDoc) {
      LOG.error(`No user found for ${username}`);
      return null;
    }

    // Build profile data from user document
    const userId = userDoc.id;
    const userData = userDoc.data();
    LOG.success(
      `Found user document for ${username} (ID: ${userId.substring(0, 8)}...)`
    );
    const profileData = buildProfileData(userId, userData, username);

    // Fetch wallet data if requested
    if (includeWallet) {
      LOG.info(`Fetching wallet data for userId: ${userId.substring(0, 8)}...`);
      const walletStart = Date.now();
      await addWalletDataToProfile(profileData, userId);
      const walletHasAddress = profileData.walletAddress
        ? "with wallet"
        : "no wallet";
      LOG.perf(
        `Wallet data retrieval (${walletHasAddress})`,
        Date.now() - walletStart
      );
    }

    // Add metadata
    profileData._cachedAt = new Date().toISOString();
    profileData._queryTimeMs = Date.now() - startTime;

    // Store in cache
    LOG.info(`Caching profile data for ${username}`);
    serverCache.setProfileCache(cacheKey, profileData);

    LOG.perf(
      `Total profile data fetch for ${username}`,
      Date.now() - startTime
    );

    return profileData;
  } catch (error) {
    LOG.error(`Failed to fetch profile for ${username}: ${error.message}`);
    console.error(error);
    return null;
  }
}

// Update the getHolderData function with better logging
export async function getHolderData(walletAddress, forceRefresh = false) {
  if (!walletAddress) return null;

  try {
    const startTime = Date.now();
    const normalizedAddress = walletAddress.toLowerCase();
    const shortAddress = `${normalizedAddress.substring(
      0,
      6
    )}...${normalizedAddress.substring(normalizedAddress.length - 4)}`;

    LOG.info(
      `Request for holder data: ${shortAddress} (forceRefresh=${forceRefresh})`
    );

    // Check if we have cached data
    if (!forceRefresh) {
      const cachedHolderData = serverCache.getWalletCache(normalizedAddress);

      if (cachedHolderData) {
        const ageSeconds = Math.round(cachedHolderData.age / 1000);
        LOG.cache(
          `Holder data for ${COLORS.CYAN}${shortAddress}${COLORS.RESET} found in cache (age: ${ageSeconds}s)`
        );
        LOG.perf(`Cache retrieval for holder data`, Date.now() - startTime);
        return cachedHolderData.data;
      }
    }

    LOG.miss(
      `Holder data for ${COLORS.CYAN}${shortAddress}${COLORS.RESET} not in cache, fetching fresh data`
    );

    // Fetch holders data
    const apiStart = Date.now();
    LOG.info(`Making API request to /api/holders for wallet ${shortAddress}`);
    const holdersResponse = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || ""}/api/holders`
    );

    if (!holdersResponse.ok) {
      LOG.error(`Failed to fetch holders data (${holdersResponse.status})`);
      throw new Error(
        `Failed to fetch holders data (${holdersResponse.status})`
      );
    }

    const holdersData = await holdersResponse.json();
    LOG.perf(`Holders API request`, Date.now() - apiStart);
    LOG.info(`Retrieved ${holdersData.holders?.length || 0} holders from API`);

    // Find the holder in the list
    const holder = holdersData.holders?.find(
      (h) => h.address?.toLowerCase() === normalizedAddress
    );

    if (holder) {
      LOG.success(
        `Found holder data for ${shortAddress} - Rank: ${holder.rank}`
      );
    } else {
      LOG.info(`No holder data found for ${shortAddress} in the holders list`);
    }

    // Format holder data or use minimal data if not found
    const holderData = holder
      ? {
          rank: holder.rank || 0,
          balance_formatted: holder.balance_formatted || "0",
          percentage: holder.percentage || "0",
          usdValue: holder.usdValue || "0",
          firstSeen: holder.firstSeen || new Date().toISOString(),
          lastSeen: holder.lastSeen || new Date().toISOString(),
          totalHolders: holdersData.holders?.length || 0,
          _cachedAt: new Date().toISOString(),
        }
      : {
          rank: 0,
          balance_formatted: "0",
          percentage: "0",
          usdValue: "0",
          firstSeen: new Date().toISOString(),
          lastSeen: new Date().toISOString(),
          totalHolders: holdersData.holders?.length || 0,
          _cachedAt: new Date().toISOString(),
        };

    // Cache the data
    LOG.info(`Caching holder data for ${shortAddress}`);
    serverCache.setWalletCache(normalizedAddress, holderData);

    LOG.perf(
      `Total holder data fetch for ${shortAddress}`,
      Date.now() - startTime
    );

    return {
      ...holderData,
      tokenPrice: holdersData.tokenPrice || 0,
    };
  } catch (error) {
    LOG.error(`Failed to fetch holder data: ${error.message}`);
    console.error(error);
    return {
      rank: 0,
      balance_formatted: "0",
      percentage: "0",
      usdValue: "0",
      firstSeen: new Date().toISOString(),
      lastSeen: new Date().toISOString(),
      totalHolders: 0,
      _cachedAt: new Date().toISOString(),
      tokenPrice: 0,
    };
  }
}

// Update the helper functions with better logging
async function findUserDocument(username) {
  try {
    const startTime = Date.now();

    // Try exact username match
    LOG.firebase(`Checking exact username match for "${username}"`);
    const exactUsernameQuery = await db
      .collection("users")
      .where("username", "==", username)
      .limit(1)
      .get();

    if (!exactUsernameQuery.empty) {
      LOG.success(`Found user with exact username match: ${username}`);
      LOG.perf(`Exact username query`, Date.now() - startTime);
      return exactUsernameQuery.docs[0];
    }

    // Try exact Twitter username match
    LOG.firebase(`Checking exact Twitter username match for "${username}"`);
    const twitterUsernameQuery = await db
      .collection("users")
      .where("twitterUsername", "==", username)
      .limit(1)
      .get();

    if (!twitterUsernameQuery.empty) {
      LOG.success(`Found user with exact Twitter username match: ${username}`);
      LOG.perf(`Twitter username query`, Date.now() - startTime);
      return twitterUsernameQuery.docs[0];
    }

    // Try lowercase username
    const lowercaseUsername = username.toLowerCase();
    LOG.firebase(
      `Checking lowercase username match for "${lowercaseUsername}"`
    );
    const lowerUsernameQuery = await db
      .collection("users")
      .where("username", "==", lowercaseUsername)
      .limit(1)
      .get();

    if (!lowerUsernameQuery.empty) {
      LOG.success(
        `Found user with lowercase username match: ${lowercaseUsername}`
      );
      LOG.perf(`Lowercase username query`, Date.now() - startTime);
      return lowerUsernameQuery.docs[0];
    }

    // Try lowercase Twitter username
    LOG.firebase(
      `Checking lowercase Twitter username match for "${lowercaseUsername}"`
    );
    const lowerTwitterQuery = await db
      .collection("users")
      .where("twitterUsername", "==", lowercaseUsername)
      .limit(1)
      .get();

    if (!lowerTwitterQuery.empty) {
      LOG.success(
        `Found user with lowercase Twitter username match: ${lowercaseUsername}`
      );
      LOG.perf(`Lowercase Twitter username query`, Date.now() - startTime);
      return lowerTwitterQuery.docs[0];
    }

    LOG.info(`No user found for any username variation of "${username}"`);
    LOG.perf(`Complete username search (no matches)`, Date.now() - startTime);
    return null;
  } catch (error) {
    LOG.error(`Error finding user document: ${error.message}`);
    console.error(error);
    return null;
  }
}

// Update the wallet data function with better logging
async function addWalletDataToProfile(profileData, userId) {
  try {
    const startTime = Date.now();
    LOG.firebase(
      `Fetching wallet claims for userId: ${userId.substring(0, 8)}...`
    );

    const walletClaimsRef = db.collection("walletClaims");
    const claimDoc = await walletClaimsRef
      .where("userId", "==", userId)
      .limit(1)
      .get();

    if (!claimDoc.empty) {
      const walletData = claimDoc.docs[0].data();
      const shortAddress = walletData.walletAddress
        ? `${walletData.walletAddress.substring(
            0,
            6
          )}...${walletData.walletAddress.substring(
            walletData.walletAddress.length - 4
          )}`
        : "none";

      LOG.success(
        `Wallet claim found for user: ${userId.substring(
          0,
          8
        )}... (address: ${shortAddress})`
      );

      profileData.walletAddress = walletData.walletAddress;
      profileData.walletConnectedAt = walletData.claimedAt
        ? new Date(walletData.claimedAt.seconds * 1000).toISOString()
        : null;
      profileData.showProfile = walletData.showProfile !== false;
      profileData.walletClaimId = claimDoc.docs[0].id;
    } else {
      LOG.info(`No wallet claim found for user: ${userId.substring(0, 8)}...`);
    }

    LOG.perf(
      `Wallet data fetch for user ${userId.substring(0, 8)}...`,
      Date.now() - startTime
    );
  } catch (error) {
    LOG.error(
      `Error fetching wallet data for userId ${userId.substring(0, 8)}...: ${
        error.message
      }`
    );
    console.error(error);
    // Non-critical error, continue without wallet data
  }
}

// Also enhance the server-cache.js file to add more logging capabilities

export function enhanceServerCache(serverCacheObj) {
  // Add method to get formatted hit rate
  serverCacheObj.getHitRateFormatted = () => {
    const total = global.serverCache.hits + global.serverCache.misses;
    const rate = total > 0 ? (global.serverCache.hits / total) * 100 : 0;
    return `${rate.toFixed(1)}% (${global.serverCache.hits}/${total} hits)`;
  };

  return serverCacheObj;
}
