import { NextResponse } from "next/server";
import { db } from "../../lib/firebase-admin";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { v4 as uuidv4 } from "uuid";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import admin from "firebase-admin";

const MAX_MESSAGES = 20; // Keep only the last 100 messages

export async function GET() {
  try {
    // Get messages from the messages collection instead of chat.global
    const messagesRef = db.collection("messages");
    const messagesQuery = await messagesRef
      .orderBy("timestamp", "desc")
      .limit(MAX_MESSAGES)
      .get();

    // Process query results
    const messages = messagesQuery.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      timestamp:
        doc.data().timestamp?.toDate() || new Date(doc.data().timestamp),
    }));

    // Return the messages
    return NextResponse.json({
      messages: messages,
      lastUpdated: messages.length > 0 ? messages[0].timestamp : new Date(),
      messageCount: messages.length,
    });
  } catch (error) {
    console.error("Error fetching messages:", error);
    return NextResponse.json(
      { error: "Failed to fetch messages" },
      { status: 500 }
    );
  }
}

// Update your POST method to remove the unnecessary update to chat/global
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { text, walletAddress, customStyle } = await request.json();

    if (!text?.trim()) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    // Create new message object
    const newMessage = {
      text: text.trim(),
      user: session.user.name,
      walletAddress,
      profileImage: session.user.image,
      customStyle: customStyle || null,
      timestamp: new Date(),
    };

    // Add message to the messages collection
    const messageRef = await db.collection("messages").add(newMessage);

    // Update the message with its ID for easier reference
    await messageRef.update({ id: messageRef.id });

    return NextResponse.json({
      success: true,
      message: { ...newMessage, id: messageRef.id },
    });
  } catch (error) {
    console.error("Error sending message:", error);
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 }
    );
  }
}
