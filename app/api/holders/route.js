import { NextResponse } from "next/server";
import { LRUCache } from "lru-cache";
import Moralis from "moralis";
import { db } from "../../lib/firebase-admin";
import admin from "firebase-admin";
import { getMoralisClient } from "../../lib/moralis-client";

const CONTRACT_ADDRESS = "0x32481ac9B124bD82944eac67B2EA449797d402D1";
const MAX_SUPPLY = 1_000_000_000;
const MORALIS_API_KEY = process.env.MORALIS_API_KEY;

// Update your caches object to include the new global caches
const caches = {
  // Existing caches
  holders: new LRUCache({
    max: 1,
    ttl: 30000,
    updateAgeOnGet: true,
    allowStale: true,
  }),
  tokenPrice: new LRUCache({
    max: 1,
    ttl: 60000,
    updateAgeOnGet: true,
    allowStale: true,
  }),
  socialData: new LRUCache({
    max: 100,
    ttl: 300000, // 5 minutes cache
    updateAgeOnGet: true,
  }),
  apiResponse: new LRUCache({
    max: 1,
    ttl: 20000,
    updateAgeOnGet: true,
    allowStale: true,
  }),

  // New global caches - these don't use LRUCache as we manage their lifecycle manually
  allWalletClaims: null,
  allWalletClaimsUserIds: null,
  allWalletClaimsLastUpdated: 0,
  allUsers: null,
  allUsersLastUpdated: 0,

  // Function to clear all global caches
  clearGlobalCaches() {
    this.allWalletClaims = null;
    this.allWalletClaimsUserIds = null;
    this.allWalletClaimsLastUpdated = 0;
    this.allUsers = null;
    this.allUsersLastUpdated = 0;
    console.log("🧹 Global caches cleared");
  },
};

// Initialize Moralis once
let moralisStarted = false;
const initMoralis = async () => {
  if (!moralisStarted) {
    try {
      await Moralis.start({ apiKey: MORALIS_API_KEY });
      moralisStarted = true;
    } catch (error) {
      console.error("Error initializing Moralis:", error);
      throw error;
    }
  }
};

// Add this function to provide fallback data when Moralis fails
const getFallbackHolders = () => {
  console.log("⚠️ Using emergency fallback holder data");
  // Return minimal emergency fallback data
  return [
    {
      address: "0x32481ac9B124bD82944eac67B2EA449797d402D1",
      value: "100000000000000000000000000",
      balance_formatted: "100000000.000000000000000000",
      percentage: 10,
      is_contract: true,
      label: "LockChain Contract",
    },
    // Include a few more placeholder entries
  ];
};

// Update the fetchHoldersData function with better error handling
async function fetchHoldersData(forceRefresh = false) {
  try {
    // First check cache unless forced refresh
    if (!forceRefresh && caches.holders.has("data")) {
      console.log("✅ Using cached holders data");
      return caches.holders.get("data");
    }

    // Check for stale data as secondary fallback
    const hasStaleData = caches.holders.has("data", { allowStale: true });

    try {
      // Get properly initialized Moralis client
      const Moralis = await getMoralisClient();

      console.log("🔄 Fetching fresh holders data from Moralis");
      const response = await Moralis.EvmApi.token.getTokenOwners({
        chain: "0x2105",
        tokenAddress: CONTRACT_ADDRESS,
        limit: 100,
        order: "DESC",
      });

      // Validate Moralis response
      if (!response || !response.result || !Array.isArray(response.result)) {
        console.error("❌ Invalid response format from Moralis:", response);
        throw new Error("Invalid response format from Moralis");
      }

      if (response.result.length === 0) {
        console.warn("⚠️ Moralis returned zero holders");

        // Try using stale cached data first
        if (hasStaleData) {
          console.log("↩️ Falling back to stale cached data");
          return caches.holders.get("data", { allowStale: true });
        }

        // If no cache at all, use emergency fallback
        return getFallbackHolders();
      }

      console.log(`✅ Received ${response.result.length} holders from Moralis`);

      const holders = response.result.map((holder) => {
        const address = holder.ownerAddress;
        try {
          const balance = holder.balance || "0";
          const formattedBalance = (Number(balance) / 1e18).toFixed(18);
          const percentage = (Number(balance) / (MAX_SUPPLY * 1e18)) * 100;

          return {
            address: address,
            value: balance,
            balance_formatted: formattedBalance,
            percentage: percentage,
            is_contract: false,
            label: null,
          };
        } catch (err) {
          console.warn(`Error processing holder ${address}:`, err);
          // Return a safe fallback for this holder
          return {
            address: address,
            value: "0",
            balance_formatted: "0.000000000000000000",
            percentage: 0,
            is_contract: false,
            label: null,
            error: true,
          };
        }
      });

      // Safety check - filter out any malformed entries
      const validHolders = holders.filter(
        (h) =>
          h &&
          typeof h.address === "string" &&
          !isNaN(Number(h.balance_formatted))
      );

      if (validHolders.length === 0) {
        console.error("❌ All holder entries were invalid");

        // Try using stale cached data first
        if (hasStaleData) {
          console.log("↩️ Falling back to stale cached data");
          return caches.holders.get("data", { allowStale: true });
        }

        // If no cache at all, use emergency fallback
        return getFallbackHolders();
      }

      const sortedHolders = validHolders.sort(
        (a, b) => Number(b.balance_formatted) - Number(a.balance_formatted)
      );

      // Cache the holders data
      caches.holders.set("data", sortedHolders);
      console.log(`💾 Cached ${sortedHolders.length} holders successfully`);

      return sortedHolders;
    } catch (error) {
      console.error("❌ Error fetching holders from Moralis:", error);

      // Return cached data even if expired in case of error
      if (hasStaleData) {
        console.log("↩️ Falling back to stale cached data after error");
        return caches.holders.get("data", { allowStale: true });
      }

      // Last resort - return emergency fallback data
      console.log("🚨 Using emergency fallback data - no cache available");
      return getFallbackHolders();
    }
  } catch (outerError) {
    console.error("❌ Critical error in fetchHoldersData:", outerError);
    return getFallbackHolders();
  }
}

async function fetchTokenPrice(forceRefresh = false) {
  try {
    // First check cache unless forced refresh
    if (!forceRefresh && caches.tokenPrice.has("data")) {
      console.log("Using cached token price data");
      return caches.tokenPrice.get("data");
    }

    console.log("Fetching fresh token price data");
    const response = await fetch(
      `https://api.dexscreener.com/latest/dex/tokens/${CONTRACT_ADDRESS}`
    );

    if (!response.ok) {
      console.warn(`DexScreener API error: ${response.status}`);
      throw new Error(
        `DexScreener API responded with status ${response.status}`
      );
    }

    const data = await response.json();

    if (!data?.pairs?.length) {
      console.warn("No pairs found for token");
      throw new Error("No pairs found for token");
    }

    // Sort pairs by liquidity
    const sortedPairs = data.pairs.sort(
      (a, b) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0)
    );

    // Calculate combined stats
    const combinedStats = sortedPairs.reduce(
      (acc, pair) => ({
        volume24h: (acc.volume24h || 0) + (pair.volume?.h24 || 0),
        liquidity: (acc.liquidity || 0) + (pair.liquidity?.usd || 0),
        txns24h: {
          buys: (acc.txns24h?.buys || 0) + (pair.txns?.h24?.buys || 0),
          sells: (acc.txns24h?.sells || 0) + (pair.txns?.h24?.sells || 0),
        },
      }),
      {}
    );

    const mainPair = sortedPairs[0];
    const result = {
      pairs: sortedPairs,
      mainPair: {
        ...mainPair,
        info: {
          imageUrl: mainPair.baseToken?.logoURI || null,
          socials: [
            { type: "website", url: mainPair.url || "" },
            {
              type: "twitter",
              url: mainPair.baseToken?.twitter
                ? `https://twitter.com/${mainPair.baseToken.twitter}`
                : "",
            },
          ].filter((social) => social.url),
        },
        combinedStats,
      },
      priceUsd: Number(mainPair.priceUsd || 0),
    };

    // Cache the token price data
    caches.tokenPrice.set("data", result);

    return result;
  } catch (error) {
    console.warn("Error fetching token price:", error);

    // Return cached data even if expired in case of error
    if (caches.tokenPrice.has("data", { allowStale: true })) {
      console.log("Returning stale token price data after error");
      return caches.tokenPrice.get("data", { allowStale: true });
    }

    // Return default data if no cached data available
    return {
      pairs: [],
      mainPair: {
        info: { imageUrl: "", socials: [] },
        baseToken: { name: "", symbol: "" },
        priceChange: { h24: 0, h1: 0 },
        liquidity: { usd: 0 },
        volume: { h24: 0 },
        txns: { h24: { buys: 0, sells: 0 } },
        combinedStats: {
          volume24h: 0,
          liquidity: 0,
          txns24h: { buys: 0, sells: 0 },
        },
      },
      priceUsd: 0,
    };
  }
}

// Update the fetchSocialDataBatch function to use the prefetched data
async function fetchSocialDataBatch(addresses) {
  try {
    const addressesLower = addresses.map((addr) => addr.toLowerCase());
    const socialDataMap = new Map();

    // Track cache statistics
    const stats = {
      total: addressesLower.length,
      fromCache: 0,
      fromGlobalCache: 0,
      fromFirestore: 0,
      startTime: Date.now(),
    };

    // First check per-address cache
    const uncachedAddresses = [];
    for (const addr of addressesLower) {
      const cacheKey = `social_${addr}`;
      if (caches.socialData.has(cacheKey)) {
        socialDataMap.set(addr, caches.socialData.get(cacheKey));
        stats.fromCache++;
      } else {
        uncachedAddresses.push(addr);
      }
    }

    if (uncachedAddresses.length === 0) {
      console.log(
        `✅ DATA SOURCE: 100% from cache (${stats.fromCache}/${stats.total} addresses)`
      );
      return socialDataMap;
    }

    // Prefetch all claims and users if we have uncached addresses
    const allClaims = await prefetchAllWalletClaims();
    const allUsers = await prefetchAllUsers();

    console.log(
      `⚡ Looking up ${uncachedAddresses.length} addresses in global cache`
    );

    // Process the uncached addresses using our global cache
    for (const addr of uncachedAddresses) {
      const claim = allClaims.get(addr);

      if (claim && claim.userId) {
        const userData = allUsers.get(claim.userId);

        if (userData) {
          stats.fromGlobalCache++;
          const socialData = {
            twitter: userData.username || userData.twitterUsername,
            profileImage: userData.profileImage || userData.image,
            name: userData.name || userData.twitterUsername,
            verified: userData.emailVerified || false,
            showProfile: claim.showProfile !== false,
          };

          // Add to result map
          socialDataMap.set(addr, socialData);

          // Cache for future use
          caches.socialData.set(`social_${addr}`, socialData);
        } else {
          // User not found in global cache
          caches.socialData.set(`social_${addr}`, null);
        }
      } else {
        // No claim for this address
        caches.socialData.set(`social_${addr}`, null);
      }
    }

    // Calculate and log summary statistics
    const totalTime = Date.now() - stats.startTime;
    const cachePercentage = Math.round((stats.fromCache / stats.total) * 100);
    const globalCachePercentage = Math.round(
      (stats.fromGlobalCache / stats.total) * 100
    );

    console.log(`
📊 SOCIAL DATA SUMMARY:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total addresses:     ${stats.total}
From local cache:    ${stats.fromCache} (${cachePercentage}%)
From global cache:   ${stats.fromGlobalCache} (${globalCachePercentage}%)
From Firestore:      ${stats.fromFirestore} (0%)
Not found:           ${stats.total - stats.fromCache - stats.fromGlobalCache}
Total time:          ${totalTime}ms
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `);

    return socialDataMap;
  } catch (error) {
    console.error(`❌ ERROR in fetchSocialDataBatch:`, error);
    return new Map();
  }
}

// Modify the GET function with better timeout handling
export async function GET(request) {
  try {
    // Check URL parameters for cache control
    const { searchParams } = new URL(request.url);
    const forceRefresh = searchParams.get("refresh") === "true";

    // Check if we have a cached complete response first to avoid any delay
    if (!forceRefresh && caches.apiResponse.has("data")) {
      console.log("📦 Using cached API response (fast path)");
      return NextResponse.json({
        ...caches.apiResponse.get("data"),
        cached: true,
      });
    }

    // Improved timeout handling with more granular control
    let holdersData = [];
    let tokenData = {};
    let timeoutOccurred = false;

    // Individual timeouts for each operation
    const fetchHoldersWithTimeout = async () => {
      return Promise.race([
        fetchHoldersData(forceRefresh),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Holders data timeout")), 10000)
        ),
      ]);
    };

    const fetchTokenPriceWithTimeout = async () => {
      return Promise.race([
        fetchTokenPrice(forceRefresh),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Token price timeout")), 8000)
        ),
      ]);
    };

    try {
      // Run data fetches in parallel with individual timeouts
      [holdersData, tokenData] = await Promise.all([
        fetchHoldersWithTimeout().catch((err) => {
          console.error("❌ Holders data fetch timed out:", err);
          timeoutOccurred = true;
          // Use cached data if available
          return (
            caches.holders.get("data", { allowStale: true }) ||
            getFallbackHolders()
          );
        }),
        fetchTokenPriceWithTimeout().catch((err) => {
          console.error("❌ Token price fetch timed out:", err);
          timeoutOccurred = true;
          // Use cached data if available
          return (
            caches.tokenPrice.get("data", { allowStale: true }) || {
              mainPair: {
                priceUsd: "0",
                priceChange: { h24: 0, h1: 0 },
                liquidity: { usd: 0 },
                volume: { h24: 0 },
                txns: { h24: { buys: 0, sells: 0 } },
              },
            }
          );
        }),
      ]);
    } catch (fetchError) {
      console.error("❌ Error in parallel data fetching:", fetchError);

      // Recover individually with more aggressive timeout handling
      console.log("🔄 Attempting recovery with shorter timeouts...");

      try {
        holdersData = await Promise.race([
          fetchHoldersData(false),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Recovery timeout")), 5000)
          ),
        ]).catch(() => getFallbackHolders());
      } catch (e) {
        holdersData = getFallbackHolders();
      }

      try {
        tokenData = await Promise.race([
          fetchTokenPrice(false),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Recovery timeout")), 5000)
          ),
        ]).catch(() => ({
          mainPair: {
            priceUsd: "0",
            priceChange: { h24: 0, h1: 0 },
            liquidity: { usd: 0 },
            volume: { h24: 0 },
            txns: { h24: { buys: 0, sells: 0 } },
          },
        }));
      } catch (e) {
        tokenData = {
          mainPair: {
            priceUsd: "0",
            priceChange: { h24: 0, h1: 0 },
            liquidity: { usd: 0 },
            volume: { h24: 0 },
            txns: { h24: { buys: 0, sells: 0 } },
          },
        };
      }
    }

    // Always ensure we have arrays and objects to work with
    holdersData = Array.isArray(holdersData) ? holdersData : [];
    tokenData = tokenData || {};

    const currentPrice = Number(tokenData.mainPair?.priceUsd || 0);

    // Add safety checks to prevent null/undefined access
    let socialDataMap = new Map();
    try {
      if (holdersData.length > 0 && !timeoutOccurred) {
        // Only fetch social data if we didn't time out earlier
        // Get all unique addresses
        const addresses = holdersData
          .filter((holder) => holder && holder.address)
          .map((holder) => holder.address.toLowerCase())
          .slice(0, 100); // Limit to top 100 holders to reduce load

        // Fetch social data with timeout
        socialDataMap = await Promise.race([
          fetchSocialDataBatch(addresses),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Social data timeout")), 8000)
          ),
        ]).catch((err) => {
          console.warn("⚠️ Social data fetch timed out:", err);
          return new Map();
        });
      } else {
        console.log(
          "⚠️ Skipping social data fetch due to previous timeout or empty holders data"
        );
      }
    } catch (socialError) {
      console.error("❌ Error fetching social data:", socialError);
      // Continue with empty social data
    }

    // Combine holders data with social data - with extra safety checks
    const holders = holdersData.map((holder, index) => {
      try {
        const normalizedAddress = (holder.address || "").toLowerCase();
        const social = normalizedAddress
          ? socialDataMap.get(normalizedAddress)
          : null;

        // Add rank information for sorted holders
        return {
          address: holder.address || `unknown_${index}`,
          value: holder.value || "0",
          balance_formatted: holder.balance_formatted || "0",
          percentage: Number(holder.percentage || 0).toFixed(8),
          usdValue: (
            Number(holder.balance_formatted || 0) * currentPrice
          ).toFixed(2),
          rank: index + 1,
          is_contract: holder.is_contract || false,
          label: holder.label || null,
          social,
        };
      } catch (err) {
        console.warn(`❌ Error processing holder at index ${index}:`, err);
        // Return safe fallback holder data
        return {
          address: `error_${index}`,
          value: "0",
          balance_formatted: "0",
          percentage: "0",
          usdValue: "0",
          rank: index + 1,
          is_contract: false,
          label: "Error",
          social: null,
        };
      }
    });

    const response = {
      holders,
      totalSupply: MAX_SUPPLY,
      tokenPrice: currentPrice,
      dexData: tokenData.mainPair
        ? {
            mainPair: {
              ...tokenData.mainPair,
              priceUsd: currentPrice,
            },
          }
        : null,
      cached: !forceRefresh,
      lastUpdated: new Date().toISOString(),
      socialDataCount: socialDataMap.size,
      hadTimeout: timeoutOccurred,
      maintenanceMode: false,
    };

    // Cache the complete API response
    try {
      caches.apiResponse.set("data", response);
    } catch (cacheError) {
      console.error("❌ Error caching API response:", cacheError);
      // Continue without caching
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("❌ Critical error in GET route:", error);

    // Try to return cached response even if it's stale
    if (caches.apiResponse.has("data", { allowStale: true })) {
      console.log("↩️ Critical error recovery - returning stale cache");
      return NextResponse.json({
        ...caches.apiResponse.get("data", { allowStale: true }),
        recovered: true,
        error: "Recovered from error with stale data",
        maintenanceMode: false,
      });
    }

    // Absolute last resort - return minimal working data structure
    return NextResponse.json({
      holders: getFallbackHolders().map((holder, index) => ({
        ...holder,
        rank: index + 1,
        usdValue: "0",
        social: null,
      })),
      totalSupply: MAX_SUPPLY,
      tokenPrice: 0,
      dexData: null,
      cached: false,
      lastUpdated: new Date().toISOString(),
      socialDataCount: 0,
      emergency: true,
      maintenanceMode: true,
      error: "Emergency fallback data",
    });
  }
}

// Add this function to force refresh social data for an address
export async function PATCH(request) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get("address");

    if (!address) {
      return NextResponse.json({ error: "Address required" }, { status: 400 });
    }

    // Normalize address
    const normalizedAddress = address.toLowerCase();

    // Remove from cache to force refresh
    if (caches.socialData.has(`social_${normalizedAddress}`)) {
      caches.socialData.delete(`social_${normalizedAddress}`);
    }

    return NextResponse.json({
      success: true,
      message: `Cache invalidated for ${normalizedAddress}`,
    });
  } catch (error) {
    console.error("Error invalidating cache:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// Add this function to pre-fetch and cache all wallet claims in one query
async function prefetchAllWalletClaims() {
  // Check if we already have a complete cache
  if (
    caches.allWalletClaims &&
    caches.allWalletClaimsLastUpdated > Date.now() - 300000
  ) {
    console.log("📦 Using cached wallet claims collection (age: < 5 minutes)");
    return caches.allWalletClaims;
  }

  console.log("🔄 Prefetching all wallet claims to optimize queries");
  try {
    // Get all wallet claims in one go (with a reasonable limit if needed)
    const snapshot = await db.collection("walletClaims").limit(1000).get();

    // Create a map for faster lookups
    const claimsMap = new Map();
    let userIds = new Set();

    snapshot.docs.forEach((doc) => {
      const data = doc.data();
      if (data.walletAddress && data.userId) {
        // Store by wallet address (lowercase for case-insensitive lookup)
        claimsMap.set(data.walletAddress.toLowerCase(), {
          ...data,
          id: doc.id,
        });

        // Collect unique user IDs for the next query
        userIds.add(data.userId);
      }
    });

    console.log(
      `✅ Prefetched ${claimsMap.size} wallet claims with ${userIds.size} unique users`
    );

    // Store in module-level cache
    caches.allWalletClaims = claimsMap;
    caches.allWalletClaimsUserIds = Array.from(userIds);
    caches.allWalletClaimsLastUpdated = Date.now();

    return claimsMap;
  } catch (error) {
    console.error("❌ Error prefetching wallet claims:", error);
    return new Map();
  }
}

// Add this function to pre-fetch all users from the collected user IDs
async function prefetchAllUsers() {
  // Check if we already have a complete cache
  if (caches.allUsers && caches.allUsersLastUpdated > Date.now() - 300000) {
    console.log("📦 Using cached users collection (age: < 5 minutes)");
    return caches.allUsers;
  }

  // Make sure we have user IDs to query
  if (!caches.allWalletClaimsUserIds || !caches.allWalletClaimsUserIds.length) {
    await prefetchAllWalletClaims();
  }

  const userIds = caches.allWalletClaimsUserIds;
  if (!userIds || !userIds.length) {
    console.log("⚠️ No user IDs available for prefetching users");
    return new Map();
  }

  console.log(`🔄 Prefetching ${userIds.length} users to optimize queries`);

  try {
    // Process in batches of 30 (Firestore 'in' query limit)
    const userMap = new Map();

    // Fetch users in batches
    for (let i = 0; i < userIds.length; i += 30) {
      const batchIds = userIds.slice(i, i + 30);
      console.log(
        `📥 Fetching batch of ${batchIds.length} users (${i + 1}-${
          i + batchIds.length
        } of ${userIds.length})`
      );

      const snapshot = await db
        .collection("users")
        .where(admin.firestore.FieldPath.documentId(), "in", batchIds)
        .get();

      snapshot.docs.forEach((doc) => {
        userMap.set(doc.id, { ...doc.data(), id: doc.id });
      });
    }

    console.log(
      `✅ Prefetched ${userMap.size} users out of ${userIds.length} IDs`
    );

    // Store in module-level cache
    caches.allUsers = userMap;
    caches.allUsersLastUpdated = Date.now();

    return userMap;
  } catch (error) {
    console.error("❌ Error prefetching users:", error);
    return new Map();
  }
}
