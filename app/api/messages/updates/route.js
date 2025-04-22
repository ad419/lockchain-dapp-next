import { NextResponse } from "next/server";
import { db } from "../../../lib/firebase-admin";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const lastTimestamp = searchParams.get("since");

    // Get the global chat document
    const docRef = db.collection("chat").doc("global");
    const doc = await docRef.get();

    if (!doc.exists) {
      return NextResponse.json({ messages: [], hasUpdates: false });
    }

    const data = doc.data();

    // If there's a 'since' parameter, check if there are newer messages
    if (lastTimestamp) {
      const since = new Date(parseInt(lastTimestamp));
      const lastUpdated = data.lastUpdated?.toDate() || new Date();

      // If the document was updated after the client's last check
      if (lastUpdated > since) {
        return NextResponse.json({
          messages: data.messages || [],
          hasUpdates: true,
          lastUpdated: lastUpdated.getTime(),
        });
      } else {
        // No updates
        return NextResponse.json({
          hasUpdates: false,
          lastUpdated: lastUpdated.getTime(),
        });
      }
    }

    // If no timestamp provided, just return all messages
    return NextResponse.json({
      messages: data.messages || [],
      hasUpdates: true,
      lastUpdated: (data.lastUpdated?.toDate() || new Date()).getTime(),
    });
  } catch (error) {
    console.error("Error fetching message updates:", error);
    return NextResponse.json(
      { error: "Failed to fetch message updates" },
      { status: 500 }
    );
  }
}
