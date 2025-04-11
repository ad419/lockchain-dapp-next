import { NextResponse } from "next/server";
import { db } from "../../lib/firebase-admin";
import { serverCache } from "../../lib/server-cache";
import { LRUCache } from "lru-cache";

// Keep rate limiting logic as you have it
const rateLimits = new LRUCache({ max: 1000, ttl: 3600000 });
const RATE_LIMIT = { tokensPerInterval: 40, interval: 60000, burstLimit: 80 };

// Helper function to check rate limits
const checkRateLimit = (ip) => {
  const now = Date.now();
  let rateData = rateLimits.get(ip);

  if (!rateData) {
    rateData = {
      tokens: RATE_LIMIT.burstLimit - 1,
      lastRefill: now,
    };
    rateLimits.set(ip, rateData);
    return { allowed: true, remaining: rateData.tokens };
  }

  const timePassed = now - rateData.lastRefill;
  const refillAmount =
    Math.floor(timePassed / RATE_LIMIT.interval) * RATE_LIMIT.tokensPerInterval;

  if (refillAmount > 0) {
    rateData.tokens = Math.min(
      RATE_LIMIT.burstLimit,
      rateData.tokens + refillAmount
    );
    rateData.lastRefill = now;
  }

  if (rateData.tokens > 0) {
    rateData.tokens--;
    rateLimits.set(ip, rateData);
    return { allowed: true, remaining: rateData.tokens };
  } else {
    const timeUntilRefill = RATE_LIMIT.interval - (now - rateData.lastRefill);
    return {
      allowed: false,
      remaining: 0,
      retryAfter: Math.ceil(timeUntilRefill / 1000),
    };
  }
};

export async function GET(request) {
  try {
    // Get client IP for rate limiting
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";

    // Apply rate limiting
    const rateLimit = checkRateLimit(ip);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          message: `Rate limit exceeded. Try again in ${rateLimit.retryAfter} seconds.`,
        },
        { status: 429 }
      );
    }

    const { searchParams } = new URL(request.url);
    const username = searchParams.get("username");
    const forceRefresh = searchParams.get("refresh") === "true";
    const includeWallet = searchParams.get("includeWallet") !== "false";

    if (!username) {
      return NextResponse.json(
        { success: false, message: "Username required" },
        { status: 400 }
      );
    }

    // Normalize username for cache lookups
    const normalizedUsername = username.toLowerCase();

    // Check cache first (unless force refresh requested)
    const cacheKey = `${normalizedUsername}${
      includeWallet ? "_with_wallet" : ""
    }`;
    const cachedProfile = serverCache.getProfileCache(normalizedUsername);

    if (!forceRefresh && cachedProfile) {
      // Log the cache hit for statistics
      serverCache.logHit(cachedProfile.stale);

      console.log(
        `Cache ${
          cachedProfile.stale ? "STALE HIT" : "HIT"
        } for ${normalizedUsername} - age: ${Math.round(
          cachedProfile.age / 1000
        )}s`
      );

      // Get cache statistics
      const cacheStats = serverCache.getHitRate();

      // Start background refresh if data is stale
      if (cachedProfile.stale) {
        // Don't block the response - do this asynchronously
        setTimeout(
          () => refreshProfileInBackground(normalizedUsername, includeWallet),
          0
        );
      }

      // Return cached data immediately with cache metadata
      return NextResponse.json(
        {
          success: true,
          user: cachedProfile.data,
          cached: true,
          fresh: !cachedProfile.stale,
          age: Math.round(cachedProfile.age / 1000),
          cacheStats: {
            hitRate: Math.round(cacheStats.hitRate),
            hits: cacheStats.hits,
            misses: cacheStats.misses,
          },
        },
        {
          headers: {
            "Cache-Control": "public, max-age=60, s-maxage=300",
            "X-Cache": cachedProfile.stale ? "STALE-HIT" : "HIT",
          },
        }
      );
    }

    // Cache miss or forced refresh, log it
    serverCache.logMiss();
    console.log(
      `Cache MISS for ${normalizedUsername}, fetching from Firestore`
    );
    const startTime = Date.now();

    // Try multiple case variations for username lookup
    let userDoc = await findUserDocument(username);

    if (!userDoc) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    // Build profile data from user document
    const userId = userDoc.id;
    const userData = userDoc.data();
    const profileData = buildProfileData(userId, userData, username);

    // Only fetch wallet data if specifically requested
    if (includeWallet) {
      await addWalletDataToProfile(profileData, userId);
    }

    // Add metadata
    profileData._cachedAt = new Date().toISOString();
    profileData._queryTimeMs = Date.now() - startTime;

    // Store in cache
    serverCache.setProfileCache(normalizedUsername, profileData);

    // Return the profile data
    return NextResponse.json({
      success: true,
      user: profileData,
      cached: false,
      queryTimeMs: profileData._queryTimeMs,
    });
  } catch (error) {
    console.error("Error in user-profile route:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch user profile" },
      { status: 500 }
    );
  }
}

// Helper function to find user document with case variations
async function findUserDocument(username) {
  try {
    // Try exact username match
    const exactUsernameQuery = await db
      .collection("users")
      .where("username", "==", username)
      .limit(1)
      .get();

    if (!exactUsernameQuery.empty) {
      return exactUsernameQuery.docs[0];
    }

    // Try exact Twitter username match
    const twitterUsernameQuery = await db
      .collection("users")
      .where("twitterUsername", "==", username)
      .limit(1)
      .get();

    if (!twitterUsernameQuery.empty) {
      return twitterUsernameQuery.docs[0];
    }

    // Try lowercase username
    const lowerUsernameQuery = await db
      .collection("users")
      .where("username", "==", username.toLowerCase())
      .limit(1)
      .get();

    if (!lowerUsernameQuery.empty) {
      return lowerUsernameQuery.docs[0];
    }

    // Try lowercase Twitter username
    const lowerTwitterQuery = await db
      .collection("users")
      .where("twitterUsername", "==", username.toLowerCase())
      .limit(1)
      .get();

    if (!lowerTwitterQuery.empty) {
      return lowerTwitterQuery.docs[0];
    }

    return null;
  } catch (error) {
    console.error("Error finding user document:", error);
    return null;
  }
}

// Helper function to build profile data object
function buildProfileData(userId, userData, username) {
  return {
    id: userId,
    name: userData.name || username,
    username: userData.username, // Preserve original case
    twitterUsername: userData.twitterUsername || userData.username,
    profileImage: userData.profileImage || userData.image || null,
    bannerImage: userData.bannerImage || null,
    bio: userData.bio || null,
    status: userData.status || null,
    joinedAt: userData.createdAt
      ? new Date(userData.createdAt.seconds * 1000).toISOString()
      : new Date().toISOString(),
    messageStyle: userData.messageStyle || null,
  };
}

// Helper function to add wallet data to profile
async function addWalletDataToProfile(profileData, userId) {
  try {
    const walletClaimsRef = db.collection("walletClaims");
    const claimDoc = await walletClaimsRef
      .where("userId", "==", userId)
      .limit(1)
      .get();

    if (!claimDoc.empty) {
      const walletData = claimDoc.docs[0].data();
      profileData.walletAddress = walletData.walletAddress;
      profileData.walletConnectedAt = walletData.claimedAt
        ? new Date(walletData.claimedAt.seconds * 1000).toISOString()
        : null;
      profileData.showProfile = walletData.showProfile !== false;
      profileData.walletClaimId = claimDoc.docs[0].id;
    }
  } catch (error) {
    console.error(`Error fetching wallet data for userId ${userId}:`, error);
    // Non-critical error, continue without wallet data
  }
}

// Background refresh function
async function refreshProfileInBackground(username, includeWallet) {
  try {
    console.log(`Background refreshing profile for ${username}`);

    // Find the user document
    const userDoc = await findUserDocument(username);

    if (!userDoc) {
      console.log(`No user found for ${username} in background refresh`);
      return;
    }

    // Build profile data
    const userId = userDoc.id;
    const userData = userDoc.data();
    const profileData = buildProfileData(userId, userData, username);

    // Add wallet data if needed
    if (includeWallet) {
      await addWalletDataToProfile(profileData, userId);
    }

    // Update cache timestamp
    profileData._cachedAt = new Date().toISOString();

    // Update cache
    serverCache.setProfileCache(username, profileData);
    console.log(`Background refresh complete for ${username}`);
  } catch (error) {
    console.error(`Background refresh failed for ${username}:`, error);
  }
}
