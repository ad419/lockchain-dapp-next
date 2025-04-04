import { NextResponse } from "next/server";
import { db } from "../../../lib/firebase-admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MESSAGE_LIMIT = 50;

export async function POST(request) {
  try {
    const body = await request.json();
    const { text, walletAddress, user, profileImage } = body;

    if (!text?.trim()) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    const messagesRef = db.collection("messages");
    const newMessage = {
      text: text.trim(),
      walletAddress,
      user,
      profileImage,
      timestamp: new Date(),
    };

    await messagesRef.add(newMessage);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error adding message:", error);
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 }
    );
  }
}

export async function GET() {
  const encoder = new TextEncoder();
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  // Maintain a list of active clients
  if (!global.writers) {
    global.writers = new Set();
  }
  global.writers.add(writer);

  try {
    const messagesRef = db.collection("messages");

    // Real-time listener
    const unsubscribe = messagesRef
      .orderBy("timestamp", "desc")
      .limit(MESSAGE_LIMIT)
      .onSnapshot(
        async (snapshot) => {
          const messages = [];
          snapshot.forEach((doc) => {
            messages.push({
              id: doc.id,
              ...doc.data(),
              timestamp: doc.data().timestamp?.toDate?.() || new Date(),
            });
          });

          // Sort messages by timestamp and ID to ensure consistency
          messages.sort((a, b) => {
            const timeA = new Date(a.timestamp).getTime();
            const timeB = new Date(b.timestamp).getTime();

            // If timestamps are equal, use ID as secondary sort
            if (timeA === timeB) {
              return a.id.localeCompare(b.id);
            }

            return timeA - timeB; // Ascending order (oldest first)
          });

          // reverse the order to show the latest messages first

          // Send the consistently sorted messages to all clients
          const messageData = encoder.encode(
            `data: ${JSON.stringify({ messages })}\n\n`
          );

          // Broadcast to clients
          for (const clientWriter of global.writers) {
            try {
              await clientWriter.write(messageData);
            } catch (error) {
              console.error("Write error:", error);
              global.writers.delete(clientWriter); // Remove failed writer
            }
          }
        },
        (error) => {
          console.error("Snapshot error:", error);
          unsubscribe();
        }
      );

    return new Response(stream.readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Stream error:", error);
    return new Response(
      encoder.encode(`data: ${JSON.stringify({ error: "Stream failed" })}\n\n`),
      { status: 500 }
    );
  }
}
