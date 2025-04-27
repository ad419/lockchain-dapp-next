import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { db as adminDb } from "../../lib/firebase-admin";
import { redis } from "../../lib/redis";

const CACHE_TTL = 15 * 60; // 15 minutes Redis cache

// Utility function to handle corrupted cache entries
async function clearCorruptedCache(key) {
  try {
    await redis.del(key);
    console.log(`Cleared corrupted cache for key: ${key}`);
    return true;
  } catch (error) {
    console.error(`Failed to clear corrupted cache for key: ${key}`, error);
    return false;
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const twitterUsername = searchParams.get("twitterUsername");
    const refresh = searchParams.get("refresh") === "true";

    // Validate params
    if (!twitterUsername) {
      return NextResponse.json(
        { error: "Twitter username is required" },
        { status: 400 }
      );
    }

    // Check authentication when needed
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Generate Redis key for this claim
    const cacheKey = `claim:${twitterUsername.toLowerCase()}`;

    // Try Redis cache first (unless refresh is requested)
    if (!refresh) {
      try {
        // FIRST: Clear any existing potentially corrupted data
        await redis.del(cacheKey);
        console.log(
          `Flushed Redis cache for ${twitterUsername} to prevent corruption`
        );

        // Continue straight to Firestore lookup
      } catch (redisError) {
        console.warn("Redis error while flushing cache:", redisError);
      }
    }

    // Check Firestore (source of truth)
    console.log("Checking Firestore for claim:", twitterUsername);

    const claimsSnapshot = await adminDb
      .collection("walletClaims")
      .where("twitterUsername", "==", twitterUsername)
      .limit(1)
      .get();

    let result;

    if (claimsSnapshot.empty) {
      result = { hasClaimed: false, claim: null };
    } else {
      const doc = claimsSnapshot.docs[0];
      result = {
        hasClaimed: true,
        claim: {
          id: doc.id,
          ...doc.data(),
          // Convert Firestore timestamp to ISO string if needed
          ...(doc.data().timestamp && {
            timestamp: doc.data().timestamp.toDate().toISOString(),
          }),
          ...(doc.data().claimedAt && {
            claimedAt: doc.data().claimedAt.toDate().toISOString(),
          }),
        },
      };
    }

    // Cache the result in Redis
    try {
      // Only cache claims with proper data structure
      if (result && result.claim) {
        // Convert the object to a string first, then check if it has the correct structure
        const stringifiedResult = JSON.stringify(result);

        if (stringifiedResult && stringifiedResult !== '"[object Object]"') {
          // Cache a simplified version with plain JSON structure
          const safeResult = {
            hasClaimed: result.hasClaimed,
            claim: result.claim
              ? {
                  id: result.claim.id || "",
                  walletAddress: result.claim.walletAddress || "",
                  twitterUsername: result.claim.twitterUsername || "",
                  timestamp: result.claim.timestamp || "",
                  claimedAt: result.claim.claimedAt || "",
                }
              : null,
          };

          const safeString = JSON.stringify(safeResult);

          // Do a sanity check before caching
          try {
            // Test parsing to ensure it's valid
            JSON.parse(safeString);

            // If we got here, it's safe to cache
            await redis.set(cacheKey, safeString, { ex: CACHE_TTL });
            console.log(`Cached claim data in Redis for: ${twitterUsername}`);
          } catch (parseError) {
            console.error("Invalid JSON structure, not caching:", parseError);
          }
        } else {
          console.warn("Invalid data format, not caching in Redis");
        }
      } else {
        console.log("No valid claim to cache in Redis");
      }
    } catch (redisError) {
      console.warn("Failed to cache result in Redis:", redisError);
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error checking wallet claim:", error);
    return NextResponse.json(
      { error: "Failed to check wallet claim" },
      { status: 500 }
    );
  }
}
