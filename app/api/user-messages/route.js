import { NextResponse } from "next/server";
import { db } from "../../lib/firebase-admin";

export const dynamic = "force-dynamic";

// Simple in-memory cache
const userMessagesCache = new Map();
const CACHE_TTL = 60000; // 1 minute

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

    // Check cache first
    const cacheKey = `messages_${walletAddress}`;
    const cached = userMessagesCache.get(cacheKey);
    if (cached && cached.timestamp > Date.now() - CACHE_TTL) {
      return NextResponse.json({ messages: cached.data, fromCache: true });
    }

    // Fetch from Firestore with limit
    const messagesRef = db.collection("messages");
    const snapshot = await messagesRef
      .where("walletAddress", "==", walletAddress)
      .orderBy("timestamp", "desc")
      .limit(50)
      .get();

    const messages = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp?.toDate?.() || new Date(),
    }));

    // Update cache
    userMessagesCache.set(cacheKey, {
      data: messages,
      timestamp: Date.now(),
    });

    return NextResponse.json({ messages });
  } catch (error) {
    console.error("Error fetching user messages:", error);

    // Try to return cached data even if expired
    const cacheKey = `messages_${walletAddress}`;
    const cached = userMessagesCache.get(cacheKey);
    if (cached) {
      return NextResponse.json({
        messages: cached.data,
        fromCache: true,
        cacheAge: Math.floor((Date.now() - cached.timestamp) / 4000),
      });
    }

    return NextResponse.json(
      { error: "Failed to fetch messages" },
      { status: 500 }
    );
  }
}
