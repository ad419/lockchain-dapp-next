import { NextResponse } from "next/server";
import { db } from "../../../lib/firebase-admin";
import { getMessages } from "../../../lib/firebase-cache";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Create a cache for message data
const messageCache = {
  data: [],
  lastUpdated: 0,
  listeners: new Map(),
  updateTimeout: null,
};

// Message limit
const MESSAGE_LIMIT = 50;

// Function to notify all clients with fresh data
const notifyAllClients = async () => {
  const encoder = new TextEncoder();
  const messages = messageCache.data;
  const payload = encoder.encode(`data: ${JSON.stringify({ messages })}\n\n`);

  // Use Promise.allSettled to handle errors gracefully
  const writePromises = [];

  // Loop through all client writers
  for (const [clientId, writer] of messageCache.listeners.entries()) {
    writePromises.push(
      writer.write(payload).catch((error) => {
        // Connection broken, remove this client
        console.log(`Client ${clientId} disconnected:`, error.name);
        messageCache.listeners.delete(clientId);
      })
    );
  }

  // Wait for all writes to complete without throwing errors
  await Promise.allSettled(writePromises);

  console.log(`Messages broadcast to ${messageCache.listeners.size} clients`);
};

// Function to fetch latest messages and update cache
const updateMessageCache = async () => {
  try {
    // Don't update too frequently - at most every 2 seconds
    const now = Date.now();
    if (now - messageCache.lastUpdated < 2000) {
      return;
    }

    // Update the timestamp
    messageCache.lastUpdated = now;

    // Clear any pending update
    if (messageCache.updateTimeout) {
      clearTimeout(messageCache.updateTimeout);
    }

    // Use the firebase-cache utility to get messages instead of direct Firestore calls
    const messages = await getMessages(db, MESSAGE_LIMIT);
    messageCache.data = messages;

    // Notify all clients if there are any
    if (messageCache.listeners.size > 0) {
      await notifyAllClients();
    }
  } catch (error) {
    console.error("Error updating message cache:", error);
  }
};

// Set up a Firestore listener for real-time updates
const setupFirestoreListener = () => {
  // Only set up the listener once
  if (messageCache.firestoreUnsubscribe) {
    return;
  }

  try {
    const messagesRef = db.collection("messages");
    messageCache.firestoreUnsubscribe = messagesRef
      .orderBy("timestamp", "desc")
      .limit(MESSAGE_LIMIT)
      .onSnapshot(
        async (snapshot) => {
          // Don't update the cache if there are no changes
          if (snapshot.empty || snapshot.docChanges().length === 0) {
            return;
          }

          // Update cache with new data
          messageCache.data = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
            timestamp: doc.data().timestamp?.toDate?.() || new Date(),
          }));

          messageCache.lastUpdated = Date.now();

          // Notify all clients if there are any
          if (messageCache.listeners.size > 0) {
            await notifyAllClients();
          }
        },
        (error) => {
          console.error("Firestore listener error:", error);
          // Try to restart the listener after a delay
          setTimeout(() => {
            if (messageCache.firestoreUnsubscribe) {
              messageCache.firestoreUnsubscribe();
              messageCache.firestoreUnsubscribe = null;
              setupFirestoreListener();
            }
          }, 5000);
        }
      );
  } catch (error) {
    console.error("Failed to setup Firestore listener:", error);
  }
};

// Clear Firestore listener when no clients are connected
const checkAndCleanupListener = () => {
  if (messageCache.listeners.size === 0 && messageCache.firestoreUnsubscribe) {
    console.log("No more clients connected, removing Firestore listener");
    messageCache.firestoreUnsubscribe();
    messageCache.firestoreUnsubscribe = null;
  }
};

export async function GET() {
  // Generate a unique client ID
  const clientId =
    Date.now().toString() + Math.random().toString(36).substring(2);

  const encoder = new TextEncoder();
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  // If no listeners yet, initialize the cache
  if (messageCache.listeners.size === 0) {
    await updateMessageCache();
    setupFirestoreListener();
  }

  // Add this client to listeners with its ID
  messageCache.listeners.set(clientId, writer);
  console.log(
    `Client ${clientId} connected. Total clients: ${messageCache.listeners.size}`
  );

  try {
    // Send initial ping wrapped in try/catch
    try {
      await writer.write(encoder.encode(`: ping\n\n`));
    } catch (error) {
      console.log(`Initial ping failed for client ${clientId}`);
      messageCache.listeners.delete(clientId);
      checkAndCleanupListener();
      throw error;
    }

    // Set up heartbeat interval
    const heartbeatInterval = setInterval(() => {
      writer.write(encoder.encode(`: heartbeat\n\n`)).catch((error) => {
        console.log(`Heartbeat failed for client ${clientId}:`, error.name);
        clearInterval(heartbeatInterval);
        messageCache.listeners.delete(clientId);
        checkAndCleanupListener();
      });
    }, 15000);

    // Send initial messages from cache
    try {
      await writer.write(
        encoder.encode(
          `data: ${JSON.stringify({ messages: messageCache.data })}\n\n`
        )
      );
    } catch (error) {
      console.log(`Initial data send failed for client ${clientId}`);
      clearInterval(heartbeatInterval);
      messageCache.listeners.delete(clientId);
      checkAndCleanupListener();
      throw error;
    }

    // Return the response with cleanup
    return new Response(stream.readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
      onClose: () => {
        clearInterval(heartbeatInterval);
        messageCache.listeners.delete(clientId);
        console.log(
          `Client ${clientId} disconnected. Remaining clients: ${messageCache.listeners.size}`
        );
        checkAndCleanupListener();
      },
    });
  } catch (error) {
    console.error(`Stream error for client ${clientId}:`, error);
    messageCache.listeners.delete(clientId);
    checkAndCleanupListener();

    return new Response(
      encoder.encode(`data: ${JSON.stringify({ error: "Stream failed" })}\n\n`),
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { text, walletAddress, user, profileImage, customStyle } = body;

    if (!text?.trim()) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    const newMessage = {
      text: text.trim(),
      walletAddress: walletAddress || null,
      user,
      profileImage,
      customStyle: customStyle || null,
      timestamp: new Date(),
    };

    // Add the message to Firestore
    const messagesRef = db.collection("messages");
    await messagesRef.add(newMessage);

    // Update message cache immediately if there are active clients
    if (messageCache.listeners.size > 0) {
      updateMessageCache();
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error adding message:", error);
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 }
    );
  }
}
