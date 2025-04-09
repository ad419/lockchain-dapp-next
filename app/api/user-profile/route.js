import { NextResponse } from "next/server";
import { db } from "../../../app/lib/firebase-admin";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get("username");

    if (!username) {
      return NextResponse.json(
        {
          success: false,
          message: "Username is required",
        },
        { status: 400 }
      );
    }

    console.log(`Looking up user profile for username: ${username}`);

    // First, try to find the user by twitterUsername
    const usersSnapshot = await db
      .collection("users")
      .where("twitterUsername", "==", username)
      .limit(1)
      .get();

    if (usersSnapshot.empty) {
      console.log(`No user found with Twitter username: ${username}`);
      return NextResponse.json(
        {
          success: false,
          message: "User not found",
        },
        { status: 404 }
      );
    }

    const userDoc = usersSnapshot.docs[0];
    const userId = userDoc.id;
    const userData = userDoc.data();

    console.log(`Found user with ID: ${userId}`);

    // Prepare user data
    const profileData = {
      id: userId,
      name: userData.name || username,
      twitterUsername: userData.twitterUsername || userData.username,
      profileImage: userData.profileImage || userData.image || null,
      bannerImage: userData.bannerImage || null,
      bio: userData.bio || null,
      status: userData.status || null,
      joinedAt: userData.createdAt
        ? new Date(userData.createdAt.seconds * 1000).toISOString()
        : null,
    };

    // Now look for wallet claim for this user
    const walletClaimsSnapshot = await db
      .collection("walletClaims")
      .where("userId", "==", userId)
      .limit(1)
      .get();

    if (!walletClaimsSnapshot.empty) {
      const walletDoc = walletClaimsSnapshot.docs[0];
      const walletData = walletDoc.data();

      profileData.walletAddress = walletData.walletAddress;
      profileData.walletConnectedAt = walletData.claimedAt
        ? new Date(walletData.claimedAt.seconds * 1000).toISOString()
        : null;
      profileData.showProfile = walletData.showProfile !== false;

      console.log(`Found wallet for user: ${walletData.walletAddress}`);
    } else {
      console.log(`No wallet claim found for user ID: ${userId}`);
    }

    return NextResponse.json({
      success: true,
      user: profileData,
    });
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch user profile: " + error.message,
      },
      { status: 500 }
    );
  }
}
