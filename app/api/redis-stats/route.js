import { NextResponse } from "next/server";
import { redisCache } from "../../lib/redis";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";

export async function GET(request) {
  try {
    // Only allow admins to access Redis stats
    const session = await getServerSession(authOptions);
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const stats = await redisCache.getStats();

    return NextResponse.json({
      stats,
      serverTime: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching Redis stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch Redis stats" },
      { status: 500 }
    );
  }
}

// Add a manual cache refresh endpoint
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Clear Redis caches
    await redisCache.invalidate("all");

    // Trigger a refresh by fetching fresh data
    const refreshResponse = await fetch(
      `${
        process.env.NEXTAUTH_URL || process.env.VERCEL_URL || ""
      }/api/holders?refresh=true`,
      { method: "GET" }
    );

    if (!refreshResponse.ok) {
      throw new Error(`Failed to refresh data: ${refreshResponse.status}`);
    }

    return NextResponse.json({
      success: true,
      message: "Redis cache cleared and fresh data fetched",
    });
  } catch (error) {
    console.error("Error in manual refresh:", error);
    return NextResponse.json(
      { error: "Failed to refresh Redis cache" },
      { status: 500 }
    );
  }
}
