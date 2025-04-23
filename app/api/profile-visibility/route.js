import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { db as adminDb } from "../../lib/firebase-admin"; // Use admin SDK
import { redis } from "../../lib/redis";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get("address");

    if (!address) {
      return NextResponse.json(
        { error: "Address is required" },
        { status: 400 }
      );
    }

    // Use admin SDK syntax
    const claims = await adminDb
      .collection("walletClaims")
      .where("walletAddress", "==", address.toLowerCase())
      .limit(1)
      .get();

    if (claims.empty) {
      return NextResponse.json({ showProfile: true }); // Default to true
    }

    const claim = claims.docs[0].data();
    return NextResponse.json({
      showProfile: claim.showProfile !== false, // Default to true if not set
      claimId: claims.docs[0].id,
    });
  } catch (error) {
    console.error("Error fetching profile visibility:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    const { address, showProfile } = await request.json();

    if (!address) {
      return NextResponse.json(
        { success: false, error: "No address provided" },
        { status: 400 }
      );
    }

    // Normalize address for consistency
    const normalizedAddress = address.toLowerCase();

    // Step 1: Update in Firestore
    const querySnapshot = await adminDb
      .collection("walletClaims")
      .where("walletAddress", "==", normalizedAddress)
      .limit(1)
      .get();

    if (querySnapshot.empty) {
      return NextResponse.json(
        { success: false, error: "Wallet claim not found" },
        { status: 404 }
      );
    }

    const claimDoc = querySnapshot.docs[0];
    const claimId = claimDoc.id;
    const claimData = claimDoc.data();

    // Verify ownership
    if (
      claimData.userId !== session.user.id &&
      claimData.twitterUsername !== session.user.username
    ) {
      return NextResponse.json(
        { success: false, error: "Not authorized to update this wallet" },
        { status: 403 }
      );
    }

    // Update Firestore
    await adminDb.collection("walletClaims").doc(claimId).update({
      showProfile: showProfile,
      lastUpdated: new Date().toISOString(),
    });

    // Step 2: Directly update Redis cache for this specific social profile
    try {
      // Try to get the social key specifically for this address
      const socialKey = `social:${normalizedAddress}`;

      // First, check if there's an existing user profile in Firestore
      const userProfileDoc = await adminDb
        .collection("userProfiles")
        .where("twitterUsername", "==", claimData.twitterUsername)
        .limit(1)
        .get();

      // Initialize socialData with just visibility change
      let socialData = { showProfile: showProfile };

      // If user profile exists, use its data
      if (!userProfileDoc.empty) {
        const profileData = userProfileDoc.docs[0].data();

        // Merge profile data - preserve case sensitivity!
        socialData = {
          ...socialData,
          twitter: claimData.twitterUsername, // Use original twitterUsername to preserve case
          name: profileData.name || claimData.twitterUsername,
          profileImage:
            profileData.profileImage ||
            claimData.profileImage ||
            session.user.image,
          bio: profileData.bio,
          verified: profileData.verified || false,
          location: profileData.location,
          website: profileData.website,
        };
      } else {
        // Fallback to session data if no profile exists
        socialData = {
          ...socialData,
          twitter: claimData.twitterUsername, // Original case preserved
          name: session.user.name,
          profileImage: session.user.image || claimData.profileImage,
        };
      }

      // Get any existing Redis data
      const existingSocialData = await redis.get(socialKey);
      if (existingSocialData) {
        try {
          const existingData = JSON.parse(existingSocialData);

          // CRITICAL FIX: Change the merging order to preserve original case
          socialData = {
            ...existingData, // First, keep existing data as base
            showProfile: showProfile, // Update visibility
          };

          // IMPORTANT: Always ensure these fields use the original case
          // Override twitter username to ensure original case is preserved
          if (claimData.twitterUsername) {
            socialData.twitter = claimData.twitterUsername; // Force original case
          }

          // Make sure name doesn't get lost in the merge
          if (!socialData.name && claimData.twitterUsername) {
            socialData.name = claimData.twitterUsername;
          }

          // Ensure profile image is preserved
          if (!socialData.profileImage) {
            socialData.profileImage =
              session.user.image || claimData.profileImage || null;
          }
        } catch (e) {
          console.error("Error parsing existing social data:", e);
        }
      }

      // Log the final data structure before saving
      console.log("Final social data being saved:", socialData);

      // Save the enriched data back to Redis
      await redis.set(socialKey, JSON.stringify(socialData), { ex: 86400 });
      console.log(
        `✅ Redis ${socialKey} updated with visibility ${showProfile}`
      );

      // Now update the holders_data cache with this enriched data
      const holdersDataString = await redis.get("holders_data");
      if (holdersDataString) {
        try {
          const holdersData = JSON.parse(holdersDataString);
          let updated = false;

          if (holdersData && holdersData.holders) {
            for (const holder of holdersData.holders) {
              if (holder.address.toLowerCase() === normalizedAddress) {
                // Update with the enriched social data
                holder.social = socialData;
                updated = true;
                break;
              }
            }

            if (updated) {
              await redis.set("holders_data", JSON.stringify(holdersData), {
                ex: 300,
              });
              console.log(
                "✅ Redis holders_data updated with enriched profile data"
              );
            }
          }
        } catch (e) {
          console.error("Error updating holders_data:", e);
        }
      }

      // Force refresh the holders cache for immediate visibility
      await redis.set("force_holders_refresh", "1", { ex: 10 });
    } catch (redisError) {
      console.error("Redis update error:", redisError);
      // Continue anyway - Firestore is the source of truth
    }

    return NextResponse.json({
      success: true,
      message: `Profile visibility updated to ${
        showProfile ? "visible" : "hidden"
      }`,
    });
  } catch (error) {
    console.error("Error updating profile visibility:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
