import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { db } from "../../../app/lib/firebase-admin";

export async function GET(request) {
  try {
    // Check if user is authenticated
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get twitterUsername from query parameters
    const { searchParams } = new URL(request.url);
    const twitterUsername = searchParams.get("twitterUsername");

    if (!twitterUsername) {
      return NextResponse.json(
        { error: "Missing twitterUsername parameter" },
        { status: 400 }
      );
    }

    // Check if wallet is claimed
    const walletClaimsRef = db.collection("walletClaims");
    const claim = await walletClaimsRef
      .where("twitterUsername", "==", twitterUsername.toLowerCase())
      .limit(1)
      .get();

    return NextResponse.json({
      hasClaimed: !claim.empty,
      claim: claim.empty
        ? null
        : {
            id: claim.docs[0].id,
            ...claim.docs[0].data(),
            claimedAt: claim.docs[0].data().claimedAt.toDate(),
          },
    });
  } catch (error) {
    console.error("Error in check-wallet-claim route:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
