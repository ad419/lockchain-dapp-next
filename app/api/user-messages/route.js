import { NextResponse } from "next/server";
import { db } from "../../lib/firebase-admin";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get("walletAddress")?.toLowerCase();

    if (!walletAddress) {
      return NextResponse.json(
        { error: "Wallet address is required" },
        { status: 400 }
      );
    }

    // Get the global chat document
    const docRef = db.collection("chat").doc("global");
    const doc = await docRef.get();

    if (!doc.exists) {
      return NextResponse.json({ messages: [] });
    }

    const data = doc.data();

    // Filter messages by the requested wallet address
    const userMessages = (data.messages || [])
      .filter((msg) => msg.walletAddress?.toLowerCase() === walletAddress)
      .map((msg) => ({
        ...msg,
        timestamp: msg.timestamp?.toDate?.() || new Date(msg.timestamp),
      }));

    return NextResponse.json({ messages: userMessages });
  } catch (error) {
    console.error(`Error fetching messages for ${walletAddress}:`, error);
    return NextResponse.json(
      { error: "Failed to fetch user messages" },
      { status: 500 }
    );
  }
}
