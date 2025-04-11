import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { db } from "../../lib/firebase-admin";

export async function GET(request) {
  // Handle GET request to check visibility status
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get("address");

    if (!address) {
      return NextResponse.json(
        { error: "Address is required" },
        { status: 400 }
      );
    }

    const claims = await db
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
  // Handle POST request to update visibility
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { address, showProfile } = await request.json();

    if (!address) {
      return NextResponse.json(
        { error: "Address is required" },
        { status: 400 }
      );
    }

    // Find the wallet claim
    const claims = await db
      .collection("walletClaims")
      .where("walletAddress", "==", address.toLowerCase())
      .limit(1)
      .get();

    if (claims.empty) {
      return NextResponse.json(
        { error: "Wallet claim not found" },
        { status: 404 }
      );
    }

    // Update the showProfile field
    const claimRef = db.collection("walletClaims").doc(claims.docs[0].id);
    await claimRef.update({
      showProfile: showProfile === true,
      lastUpdated: new Date(),
    });

    return NextResponse.json({
      success: true,
      showProfile,
      message: `Profile is now ${
        showProfile ? "visible" : "hidden"
      } on leaderboard`,
    });
  } catch (error) {
    console.error("Error updating profile visibility:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
