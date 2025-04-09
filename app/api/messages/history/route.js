import { NextResponse } from "next/server";
import { db } from "../../../lib/firebase-admin";

export async function GET(request) {
  try {
    console.log("Message history request received");
    const { searchParams } = new URL(request.url);
    const username = searchParams.get("username");
    const walletAddress = searchParams.get("walletAddress");

    console.log("Query params:", { username, walletAddress });

    if (!username && !walletAddress) {
      console.log("Missing required parameters");
      return NextResponse.json(
        { error: "Username or wallet address is required" },
        { status: 400 }
      );
    }

    // The error occurs here with the combined query and order
    // We need to use a different approach
    try {
      const messagesRef = db.collection("messages");
      let query = messagesRef;

      // Only apply one filter to avoid composite index issues
      if (username && username !== "undefined" && username !== "null") {
        console.log(`Querying by username: ${username}`);
        // This query requires a composite index - make sure it's created
        query = query.where("user", "==", username);
      } else if (
        walletAddress &&
        walletAddress !== "undefined" &&
        walletAddress !== "null"
      ) {
        console.log(`Querying by wallet address: ${walletAddress}`);
        query = query.where("walletAddress", "==", walletAddress);
      }

      console.log("Executing Firestore query");
      // Ordering by timestamp requires the composite index
      const snapshot = await query.orderBy("timestamp", "desc").limit(50).get();
      console.log(`Query returned ${snapshot.size} messages`);

      const messages = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        const timestamp = data.timestamp?.toDate?.() || new Date();

        messages.push({
          id: doc.id,
          ...data,
          timestamp: timestamp,
        });
      });

      return NextResponse.json({
        messages,
        count: messages.length,
      });
    } catch (error) {
      // Log the specific error to help with debugging
      console.error("Firestore query error:", error);

      // If the error contains an index creation URL, extract and provide it
      if (
        error.message &&
        error.message.includes("https://console.firebase.google.com")
      ) {
        const indexUrl = error.message.match(
          /(https:\/\/console\.firebase\.google\.com\S+)/
        );

        return NextResponse.json(
          {
            error: "This query requires a Firestore index",
            details:
              "Please create the required index using this link: " +
              (indexUrl ? indexUrl[0] : "See server logs"),
          },
          { status: 500 }
        );
      }

      throw error; // Re-throw if it's not an index error
    }
  } catch (error) {
    console.error("Error fetching message history:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch message history",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
