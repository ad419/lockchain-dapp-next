import { NextResponse } from "next/server";
import { db } from "../../lib/firebase-admin";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";

const MESSAGES_LIMIT = 50;

export async function GET() {
  try {
    const messagesRef = db.collection("messages");
    const snapshot = await messagesRef
      .orderBy("timestamp", "desc")
      .limit(MESSAGES_LIMIT)
      .get();

    const messages = [];
    snapshot.forEach((doc) => {
      messages.push({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate?.() || new Date(),
      });
    });

    console.log("Fetched messages:", messages);
    return NextResponse.json({ messages: messages.reverse() });
  } catch (error) {
    console.error("Error fetching messages:", error);
    return NextResponse.json(
      { error: "Failed to fetch messages" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { text, walletAddress } = await request.json();
    if (!text?.trim()) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    const messagesRef = db.collection("messages");
    const newMessage = {
      text: text.trim(),
      user: session.user.name,
      walletAddress,
      profileImage: session.user.image,
      timestamp: new Date(),
    };

    const docRef = await messagesRef.add(newMessage);
    console.log("Message added:", { id: docRef.id, ...newMessage });

    return NextResponse.json({
      success: true,
      message: {
        id: docRef.id,
        ...newMessage,
      },
    });
  } catch (error) {
    console.error("Error sending message:", error);
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 }
    );
  }
}
