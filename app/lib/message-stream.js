import { db } from "./firebase-admin";
import { messageCache } from "./cache";

// Create a single shared listener
let messagesListener = null;
let lastMessages = [];
let connectedClients = new Set();
const MESSAGE_LIMIT = 50;

export function setupMessageListener() {
  if (messagesListener) return;

  console.log("Setting up shared Firestore message listener");

  const messagesRef = db.collection("messages");
  messagesListener = messagesRef
    .orderBy("timestamp", "desc")
    .limit(MESSAGE_LIMIT)
    .onSnapshot(
      (snapshot) => {
        try {
          const messages = [];
          snapshot.forEach((doc) => {
            messages.push({
              id: doc.id,
              ...doc.data(),
              timestamp: doc.data().timestamp?.toDate?.() || new Date(),
            });
          });

          // Sort messages
          messages.sort((a, b) => {
            const timeA = new Date(a.timestamp).getTime();
            const timeB = new Date(b.timestamp).getTime();

            if (timeA === timeB) {
              return a.id.localeCompare(b.id);
            }

            return timeA - timeB; // Oldest first
          });

          // Update cache
          messageCache.set("latest_messages", messages);
          lastMessages = messages;

          // Broadcast to all clients
          broadcastMessages(messages);
        } catch (error) {
          console.error("Error processing messages snapshot:", error);
        }
      },
      (error) => {
        console.error("Firestore messages snapshot error:", error);

        // Try to restart the listener after a delay
        setTimeout(() => {
          messagesListener = null;
          if (connectedClients.size > 0) {
            setupMessageListener();
          }
        }, 5000);
      }
    );

  return () => {
    if (messagesListener) {
      messagesListener();
      messagesListener = null;
    }
  };
}

function broadcastMessages(messages) {
  const encoder = new TextEncoder();
  const data = encoder.encode(`data: ${JSON.stringify({ messages })}\n\n`);

  for (const client of connectedClients) {
    try {
      client.write(data);
    } catch (error) {
      console.error("Error writing to client:", error);
      connectedClients.delete(client);
    }
  }
}

export function addClient(writer) {
  connectedClients.add(writer);

  // Set up the listener if this is the first client
  if (connectedClients.size === 1) {
    setupMessageListener();
  }

  // Send initial messages immediately
  if (lastMessages.length > 0 || messageCache.has("latest_messages")) {
    const messages =
      lastMessages.length > 0
        ? lastMessages
        : messageCache.get("latest_messages");

    const encoder = new TextEncoder();
    writer.write(encoder.encode(`data: ${JSON.stringify({ messages })}\n\n`));
  }

  return () => {
    connectedClients.delete(writer);

    // If no more clients, remove the listener
    if (connectedClients.size === 0 && messagesListener) {
      messagesListener();
      messagesListener = null;
    }
  };
}
