import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { db } from "../../../app/lib/firebase-admin";
import { LRUCache } from "lru-cache";
import { serverCache } from "../../lib/server-cache";

// Keep local cache as a faster first-level cache with shorter TTL
const claimCache = new LRUCache({
  max: 500, // Store up to 500 username entries
  ttl: 600000, // 10 minutes (600,000 ms)
  updateAgeOnGet: true,
});

// Rate limiting configuration
const rateLimits = new LRUCache({
  max: 1000,
  ttl: 3600000,
});

// Rate limit configuration
const RATE_LIMIT = {
  tokensPerInterval: 5,
  interval: 120000,
  burstLimit: 10,
};

// Helper function to check rate limits
const checkRateLimit = (userId) => {
  const now = Date.now();
  let userRateLimit = rateLimits.get(userId);

  if (!userRateLimit) {
    userRateLimit = {
      tokens: RATE_LIMIT.burstLimit - 1,
      lastRefill: now,
    };
    rateLimits.set(userId, userRateLimit);
    return { allowed: true, remaining: userRateLimit.tokens };
  }

  const timePassed = now - userRateLimit.lastRefill;
  const refillAmount =
    Math.floor(timePassed / RATE_LIMIT.interval) * RATE_LIMIT.tokensPerInterval;

  if (refillAmount > 0) {
    userRateLimit.tokens = Math.min(
      RATE_LIMIT.burstLimit,
      userRateLimit.tokens + refillAmount
    );
    userRateLimit.lastRefill = now;
  }

  if (userRateLimit.tokens > 0) {
    userRateLimit.tokens--;
    rateLimits.set(userId, userRateLimit);
    return { allowed: true, remaining: userRateLimit.tokens };
  } else {
    const timeUntilRefill =
      RATE_LIMIT.interval - (now - userRateLimit.lastRefill);
    return {
      allowed: false,
      remaining: 0,
      retryAfter: Math.ceil(timeUntilRefill / 1000),
    };
  }
};

export async function GET(request) {
  try {
    // Check if user is authenticated
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user ID for rate limiting
    const userId = session.user.id;

    // Check rate limit for this user
    const rateLimit = checkRateLimit(userId);

    if (!rateLimit.allowed) {
      console.log(
        `🛑 RATE LIMITED - User ${userId} has exceeded API call limit`
      );

      // Return 429 Too Many Requests with retry information
      return NextResponse.json(
        {
          error: "Rate limit exceeded",
          retryAfter: rateLimit.retryAfter,
          message: `Too many requests. Please try again in ${rateLimit.retryAfter} seconds.`,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(rateLimit.retryAfter),
            "X-RateLimit-Limit": String(RATE_LIMIT.tokensPerInterval),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(
              Math.floor(Date.now() / 1000) + rateLimit.retryAfter
            ),
          },
        }
      );
    }

    // Continue with the rest of the endpoint logic
    const { searchParams } = new URL(request.url);
    const twitterUsername = searchParams.get("twitterUsername");
    const forceRefresh = searchParams.get("refresh") === "true";

    // NEW: Check for special request header to avoid duplicate calls
    const requestId = request.headers.get("x-request-id");

    // Generate a cache-buster value for this request to prevent duplicates
    const cacheBuster = searchParams.get("cacheBuster") || "";

    if (!twitterUsername) {
      return NextResponse.json(
        { error: "Missing twitterUsername parameter" },
        { status: 400 }
      );
    }

    console.log(
      `👤 Request from ${
        session.user?.name || "Unknown"
      } (${userId}) - Rate limit: ${rateLimit.remaining}/${
        RATE_LIMIT.burstLimit
      } remaining - Twitter: ${twitterUsername}, Force refresh: ${forceRefresh}, RequestID: ${
        requestId || "none"
      }, CacheBuster: ${cacheBuster}`
    );

    // Create a cache key based on the Twitter username
    const normalizedUsername = twitterUsername.toLowerCase();
    const cacheKey = `claim_${normalizedUsername}`;

    // Check local cache first (unless forced refresh)
    if (!forceRefresh && claimCache.has(cacheKey)) {
      const cachedData = claimCache.get(cacheKey);
      const cacheAge = new Date() - new Date(cachedData.timestamp);
      const cacheAgeSeconds = Math.round(cacheAge / 1000);

      console.log(
        `✅ LOCAL CACHE HIT - Returning cached wallet claim for ${twitterUsername} (age: ${cacheAgeSeconds}s, RequestID: ${
          requestId || "none"
        })`
      );

      // Add rate limit headers to response
      const response = NextResponse.json({
        hasClaimed: cachedData.hasClaimed,
        claim: cachedData.claim,
        cached: true,
        cachedAt: cachedData.timestamp,
        cacheAge: cacheAgeSeconds,
        cacheType: "local",
      });

      // Add cache control headers to prevent duplicate requests
      response.headers.set("Cache-Control", "private, max-age=5");
      response.headers.set("Vary", "x-request-id, Authorization");
      response.headers.set(
        "X-RateLimit-Limit",
        String(RATE_LIMIT.tokensPerInterval)
      );
      response.headers.set(
        "X-RateLimit-Remaining",
        String(rateLimit.remaining)
      );

      return response;
    }

    // Check server cache (unless forced refresh)
    if (!forceRefresh) {
      // Use a different cache key format for server cache
      const serverCacheKey = `wallet_claim_${normalizedUsername}`;
      const cachedClaim = serverCache.getProfileCache(serverCacheKey);

      if (cachedClaim) {
        const cacheAge = Math.round(cachedClaim.age / 1000);

        console.log(
          `✅ SERVER CACHE HIT - Returning wallet claim from server cache for ${twitterUsername} (age: ${cacheAge}s)`
        );

        // Update local cache with the server cache data
        claimCache.set(cacheKey, {
          ...cachedClaim.data,
          timestamp: new Date(Date.now() - cachedClaim.age).toISOString(),
        });

        // Add rate limit headers to response
        const response = NextResponse.json({
          ...cachedClaim.data,
          cached: true,
          cachedAt: new Date(Date.now() - cachedClaim.age).toISOString(),
          cacheAge: cacheAge,
          cacheType: "server",
          stale: cachedClaim.stale,
        });

        response.headers.set(
          "X-RateLimit-Limit",
          String(RATE_LIMIT.tokensPerInterval)
        );
        response.headers.set(
          "X-RateLimit-Remaining",
          String(rateLimit.remaining)
        );

        // If data is stale, trigger a background refresh
        if (cachedClaim.stale && !forceRefresh) {
          console.log(
            `🔄 Stale data, triggering background refresh for ${twitterUsername}`
          );

          // Don't await this - let it run in background
          setTimeout(() => {
            refreshWalletClaim(normalizedUsername)
              .then((freshData) => {
                if (freshData) {
                  console.log(
                    `✅ Background refresh completed for ${twitterUsername}`
                  );
                }
              })
              .catch((err) => {
                console.error(
                  `❌ Background refresh failed for ${twitterUsername}:`,
                  err
                );
              });
          }, 0);
        }

        return response;
      }
    }

    // Not in any cache or forced refresh, fetch from Firestore
    console.log(
      `❗ CACHE MISS - Fetching fresh wallet claim from Firestore for ${twitterUsername}`
    );

    const startTime = Date.now();

    // Fetch fresh data using the helper function
    const freshData = await fetchWalletClaim(normalizedUsername);

    const queryTime = Date.now() - startTime;

    console.log(
      `📊 Firestore query completed in ${queryTime}ms - Wallet ${
        freshData.hasClaimed ? "IS" : "NOT"
      } claimed`
    );

    // Update both cache systems
    const serverCacheKey = `wallet_claim_${normalizedUsername}`;

    // Store in local cache
    claimCache.set(cacheKey, {
      ...freshData,
      timestamp: new Date().toISOString(),
    });

    // Store in server cache
    serverCache.setProfileCache(serverCacheKey, freshData);

    console.log(`📥 New data cached for ${twitterUsername} in both caches`);

    // Add rate limit headers to response
    const response = NextResponse.json({
      ...freshData,
      queryTimeMs: queryTime,
      cached: false,
      rateLimit: {
        limit: RATE_LIMIT.tokensPerInterval,
        remaining: rateLimit.remaining,
      },
    });

    // Add cache control headers to prevent duplicate requests
    response.headers.set("Cache-Control", "private, max-age=5");
    response.headers.set("Vary", "x-request-id, Authorization");
    response.headers.set(
      "X-RateLimit-Limit",
      String(RATE_LIMIT.tokensPerInterval)
    );
    response.headers.set("X-RateLimit-Remaining", String(rateLimit.remaining));

    return response;
  } catch (error) {
    console.error("❌ Error in check-wallet-claim route:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Helper function to fetch wallet claim from Firestore
async function fetchWalletClaim(twitterUsername) {
  // Check if wallet is claimed
  const walletClaimsRef = db.collection("walletClaims");
  const claim = await walletClaimsRef
    .where("twitterUsername", "==", twitterUsername)
    .limit(1)
    .get();

  return {
    hasClaimed: !claim.empty,
    claim: claim.empty
      ? null
      : {
          id: claim.docs[0].id,
          ...claim.docs[0].data(),
          claimedAt: claim.docs[0].data().claimedAt.toDate(),
        },
    _cachedAt: new Date().toISOString(),
  };
}

// Helper function to refresh wallet claim in the background
async function refreshWalletClaim(twitterUsername) {
  try {
    const freshData = await fetchWalletClaim(twitterUsername);

    // Update both cache systems
    const localCacheKey = `claim_${twitterUsername}`;
    const serverCacheKey = `wallet_claim_${twitterUsername}`;

    // Store in local cache
    claimCache.set(localCacheKey, {
      ...freshData,
      timestamp: new Date().toISOString(),
    });

    // Store in server cache
    serverCache.setProfileCache(serverCacheKey, freshData);

    console.log(`🔄 Background refresh completed for ${twitterUsername}`);
    return freshData;
  } catch (error) {
    console.error(
      `❌ Background refresh failed for ${twitterUsername}:`,
      error
    );
    return null;
  }
}

// Update the PATCH endpoint to invalidate both caches
export async function PATCH(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user ID for rate limiting
    const userId = session.user.id;

    // Check rate limit, but with more generous limits for cache invalidation
    const rateLimit = checkRateLimit(userId);

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: "Rate limit exceeded",
          retryAfter: rateLimit.retryAfter,
          message: `Too many requests. Please try again in ${rateLimit.retryAfter} seconds.`,
        },
        { status: 429 }
      );
    }

    const { searchParams } = new URL(request.url);
    const username = searchParams.get("username");

    if (!username) {
      return NextResponse.json({ error: "Username required" }, { status: 400 });
    }

    const normalizedUsername = username.toLowerCase();

    // Clear both caches for this username
    const localCacheKey = `claim_${normalizedUsername}`;
    const serverCacheKey = `wallet_claim_${normalizedUsername}`;

    let hadLocalCache = false;
    let hadServerCache = false;

    // Clear local cache
    if (claimCache.has(localCacheKey)) {
      claimCache.delete(localCacheKey);
      hadLocalCache = true;
      console.log(`Local cache invalidated for username: ${username}`);
    }

    // Clear server cache
    const serverCacheResult = serverCache.invalidateProfile(serverCacheKey);
    hadServerCache = serverCacheResult;

    if (hadServerCache) {
      console.log(`Server cache invalidated for username: ${username}`);
    }

    const response = NextResponse.json({
      success: true,
      message: `Cache invalidation: Local: ${
        hadLocalCache ? "Success" : "Not Found"
      }, Server: ${hadServerCache ? "Success" : "Not Found"}`,
    });

    response.headers.set(
      "X-RateLimit-Limit",
      String(RATE_LIMIT.tokensPerInterval)
    );
    response.headers.set("X-RateLimit-Remaining", String(rateLimit.remaining));

    return response;
  } catch (error) {
    console.error("Error invalidating claim cache:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
