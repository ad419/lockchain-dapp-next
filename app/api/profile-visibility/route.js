import { NextResponse } from "next/server";
import { db } from "../../../app/lib/firebase-admin";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get("address");

    if (!address) {
      return NextResponse.json({ error: "Address required" }, { status: 400 });
    }

    const walletClaimsRef = db.collection("walletClaims");
    const claim = await walletClaimsRef
      .where("walletAddress", "==", address.toLowerCase())
      .limit(1)
      .get();

    if (claim.empty) {
      return NextResponse.json({ showProfile: true }); // Default to true
    }

    return NextResponse.json({
      showProfile: claim.docs[0].data().showProfile ?? true,
    });
  } catch (error) {
    console.error("Error getting profile visibility:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { address, showProfile } = await request.json();

    const walletClaimsRef = db.collection("walletClaims");
    const claim = await walletClaimsRef
      .where("walletAddress", "==", address.toLowerCase())
      .limit(1)
      .get();

    if (!claim.empty) {
      await claim.docs[0].ref.update({ showProfile });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating profile visibility:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
