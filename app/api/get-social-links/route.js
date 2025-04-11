import { NextResponse } from "next/server";
import { db } from "../../lib/firebase-admin";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get("walletAddress");

    if (!walletAddress) {
      return NextResponse.json(
        { error: "Wallet address is required" },
        { status: 400 }
      );
    }

    // First get the wallet claim to get userId
    const claimDoc = await db
      .collection("wallet_claims")
      .where("walletAddress", "==", walletAddress.toLowerCase())
      .get();

    if (claimDoc.empty) {
      return NextResponse.json({ socials: null });
    }

    const claimData = claimDoc.docs[0].data();

    // Then get the user data using userId
    const userDoc = await db.collection("users").doc(claimData.userId).get();

    if (!userDoc.exists) {
      console.log("No user found for userId:", claimData.userId);
      return NextResponse.json({ socials: null });
    }

    const userData = userDoc.data();

    // Combine and return the data
    const socials = {
      twitter: userData.username || userData.twitterUsername,
      twitterUsername: userData.username || userData.twitterUsername,
      profileImage: userData.image,
      name: userData.name,
      verified: userData.emailVerified || false,
      walletAddress: walletAddress.toLowerCase(), // Add wallet address for reference
    };

    console.log("Returning social data:", socials);

    return NextResponse.json({ socials });
  } catch (error) {
    console.error("Error fetching social links:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}
