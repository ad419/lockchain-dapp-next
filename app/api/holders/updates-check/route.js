import { NextResponse } from "next/server";
import { redisCache } from "../../../lib/redis";

export async function GET() {
  try {
    const lastModified = await redisCache.getLastModified();

    // Return just the last-modified timestamp
    return NextResponse.json({
      lastModified,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error("Error in updates-check:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
