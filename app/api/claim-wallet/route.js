import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { db } from "../../lib/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";
import { redisCache } from "../../lib/redis";

export async function POST(request) {
  try {
    // Check if user is authenticated
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { walletAddress, twitterUsername } = await request.json();

    // Validate input
    if (!walletAddress || !twitterUsername) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Convert addresses to lowercase for consistency
    const normalizedWalletAddress = walletAddress.toLowerCase();
    const normalizedTwitterUsername = twitterUsername.toLowerCase();

    // Check if wallet is already claimed
    const walletClaimsRef = db.collection("walletClaims");

    // Check wallet address
    const walletCheck = await walletClaimsRef
      .where("walletAddress", "==", normalizedWalletAddress)
      .limit(1)
      .get();

    if (!walletCheck.empty) {
      return NextResponse.json(
        { error: "Wallet address already claimed" },
        { status: 400 }
      );
    }

    // Check Twitter username
    const twitterCheck = await walletClaimsRef
      .where("twitterUsername", "==", normalizedTwitterUsername)
      .limit(1)
      .get();

    if (!twitterCheck.empty) {
      return NextResponse.json(
        { error: "Twitter account already claimed" },
        { status: 400 }
      );
    }

    // Create new claim
    const claimData = {
      walletAddress: normalizedWalletAddress,
      twitterUsername: normalizedTwitterUsername,
      claimedAt: Timestamp.now(),
      userId: session.user.id,
      showProfile: true, // Default to visible
    };

    const newClaim = await walletClaimsRef.add(claimData);

    // After successful claim, invalidate all relevant caches
    try {
      console.log(
        `Invalidating caches for new wallet claim: ${normalizedWalletAddress}`
      );

      // 1. Invalidate the specific social data cache for this address
      if (redisCache) {
        await redisCache.invalidate(`social:${normalizedWalletAddress}`);
      }

      // 2. Update the last modified timestamp to trigger updates for all users
      await redisCache.updateLastModified();

      // 3. Refresh the social data in Redis
      try {
        // Get user data
        const userDoc = await db.collection("users").doc(session.user.id).get();
        const userData = userDoc.data() || {};

        // Create social data
        const socialData = {
          twitter:
            userData.username ||
            userData.twitterUsername ||
            normalizedTwitterUsername,
          profileImage: userData.profileImage || userData.image,
          name:
            userData.name ||
            userData.twitterUsername ||
            normalizedTwitterUsername,
          verified: userData.emailVerified || false,
          showProfile: true,
        };

        // Store in Redis
        if (redisCache) {
          await redisCache.setSocialData(normalizedWalletAddress, socialData);
        }

        console.log(`✅ Social data cached for ${normalizedWalletAddress}`);
      } catch (socialError) {
        console.error("Error caching social data:", socialError);
      }
    } catch (cacheError) {
      console.error("Failed to invalidate caches:", cacheError);
    }

    // Update the response structure for consistency
    const responseClaimData = {
      id: newClaim.id,
      walletAddress: normalizedWalletAddress,
      twitterUsername: normalizedTwitterUsername,
      timestamp: new Date().toISOString(),
      showProfile: true,
    };

    // Make sure to return a consistent claim object
    return NextResponse.json({
      success: true,
      claim: responseClaimData,
    });
  } catch (error) {
    console.error("Error in claim-wallet route:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
