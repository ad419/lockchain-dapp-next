import { NextResponse } from "next/server";
import { redisCache } from "../../../lib/redis";

export async function GET(request) {
  try {
    // Get the last-modified timestamp from request headers
    const { searchParams } = new URL(request.url);
    const clientLastModified = searchParams.get("lastModified") || "0";
    const clientStamp = parseInt(clientLastModified);

    // Get address to watch (if provided)
    const watchAddress = searchParams.get("watchAddress")?.toLowerCase();

    // Get server last modified timestamp from Redis - fallback to Date.now()
    let serverLastModified;
    try {
      const timestamp = await redisCache.getLastModified();
      serverLastModified = timestamp || Date.now();
    } catch (err) {
      console.error("Error getting timestamp:", err);
      serverLastModified = Date.now();
    }

    console.log(
      `Check updates: Client time=${clientStamp}, Server time=${serverLastModified}`
    );

    // Determine if data is newer than client's
    const hasUpdates = serverLastModified > clientStamp;

    // If we have updates and we're tracking a specific address
    if (hasUpdates && watchAddress) {
      try {
        // Try to check if the specific address was updated
        const wasAddressUpdated = await redisCache.wasAddressUpdated(
          watchAddress,
          clientStamp
        );

        return NextResponse.json({
          hasUpdates: true,
          updatedAddresses: wasAddressUpdated ? [watchAddress] : [],
          timestamp: serverLastModified,
        });
      } catch (err) {
        // On error, just return general update info
        console.error("Error checking address updates:", err);
        return NextResponse.json({
          hasUpdates: true,
          timestamp: serverLastModified,
        });
      }
    }

    // Return update status
    return NextResponse.json({
      hasUpdates: hasUpdates,
      timestamp: serverLastModified,
    });
  } catch (error) {
    console.error("Error checking for updates:", error);
    return NextResponse.json(
      { error: "Failed to check for updates", hasUpdates: false },
      { status: 500 }
    );
  }
}
