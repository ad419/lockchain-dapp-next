import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { db } from "../../../app/lib/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";

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
    };

    const newClaim = await walletClaimsRef.add(claimData);

    return NextResponse.json({
      success: true,
      claim: {
        id: newClaim.id,
        ...claimData,
        claimedAt: claimData.claimedAt.toDate(),
      },
    });
  } catch (error) {
    console.error("Error in claim-wallet route:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
