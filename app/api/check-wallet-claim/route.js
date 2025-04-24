import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { db as adminDb } from "../../lib/firebase-admin";
import { redis } from "../../lib/redis";

const CACHE_TTL = 15 * 60; // 15 minutes Redis cache

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
        const cachedClaim = await redis.get(cacheKey);
        if (cachedClaim) {
          console.log("Using Redis cached claim data for:", twitterUsername);
          return NextResponse.json(JSON.parse(cachedClaim));
        }
      } catch (redisError) {
        console.warn("Redis error, falling back to Firestore:", redisError);
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
      await redis.set(cacheKey, JSON.stringify(result), { ex: CACHE_TTL });
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
