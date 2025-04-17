import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";
import { redis, redisCache } from "../../lib/redis";
// Remove the firebase-admin import if not needed for this route
// import { db } from "../../lib/firebase-admin";
// import admin from "firebase-admin";

// Update the route to handle errors better and provide clearer information

export async function GET(request) {
  try {
    // Check if user is authenticated
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the wallet address from query params
    const { searchParams } = new URL(request.url);
    const wallet = searchParams.get("wallet");

    if (!wallet) {
      return NextResponse.json(
        { error: "Wallet address is required" },
        { status: 400 }
      );
    }

    // Normalize the wallet address
    const normalizedWallet = wallet.toLowerCase();
    console.log(`Checking position for wallet: ${normalizedWallet}`);

    // First try to get from Redis cache
    let holders = null;

    try {
      // Get holders data from Redis using redisCache helper
      const holdersData = await redisCache.getHoldersData(true); // Allow stale data

      if (
        holdersData &&
        holdersData.data &&
        Array.isArray(holdersData.data.holders)
      ) {
        holders = holdersData.data.holders;
        console.log(`Got ${holders.length} holders from Redis`);
      } else {
        console.log("No valid holders data in Redis, will fetch from API");
      }
    } catch (redisErr) {
      console.error("Redis error:", redisErr);
    }

    // If not found in Redis, fetch from the holders API
    if (!holders || holders.length === 0) {
      try {
        const apiUrl = process.env.NEXTAUTH_URL || "";
        console.log(`Fetching holders from API: ${apiUrl}/api/holders`);

        const holdersResponse = await fetch(
          `${apiUrl}/api/holders?_=${Date.now()}`,
          { cache: "no-store" }
        );

        if (!holdersResponse.ok) {
          throw new Error(
            `Holders API responded with ${holdersResponse.status}`
          );
        }

        const holdersData = await holdersResponse.json();
        holders = holdersData.holders;

        if (!holders || !Array.isArray(holders)) {
          throw new Error("Invalid data format from holders API");
        }

        console.log(`Fetched ${holders.length} holders from API`);
      } catch (fetchErr) {
        console.error("Error fetching holders data:", fetchErr);
        return NextResponse.json(
          { error: "Failed to retrieve holders data" },
          { status: 500 }
        );
      }
    }

    // Now find the wallet's position
    const position = {
      rank: 0,
      totalHolders: holders.length,
      data: null,
    };

    for (let i = 0; i < holders.length; i++) {
      if (holders[i].address.toLowerCase() === normalizedWallet) {
        position.rank = i + 1;
        position.data = holders[i];
        break;
      }
    }

    console.log(
      `Position found for ${normalizedWallet}:`,
      position.rank ? `Rank #${position.rank}` : "Not found in holders list"
    );

    return NextResponse.json({ position });
  } catch (error) {
    console.error("Error checking holder position:", error);
    return NextResponse.json(
      { error: "Failed to check holder position" },
      { status: 500 }
    );
  }
}
