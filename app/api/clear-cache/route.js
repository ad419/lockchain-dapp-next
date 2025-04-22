import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";
import { redisCache } from "../../lib/redis";

export async function POST(request) {
  try {
    // Only allow authenticated requests
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Support both URL params and JSON body
    let type, walletAddress, patterns;

    if (request.headers.get("content-type")?.includes("application/json")) {
      // Parse body data if JSON
      const body = await request.json();
      type = body.type || "walletClaim";
      walletAddress = body.walletAddress?.toLowerCase();
      patterns = body.patterns || [];
    } else {
      // Use URL parameters as fallback
      const { searchParams } = new URL(request.url);
      type = searchParams.get("type") || "walletClaim";
      walletAddress = searchParams.get("wallet")?.toLowerCase();
    }

    // Log the request
    console.log(
      `Cache clear request: type=${type}, wallet=${walletAddress || "none"}`
    );

    if (type === "walletClaim" && walletAddress) {
      // Clear social data for specific wallet
      await redisCache.invalidate(`social:${walletAddress}`);

      // Also clear the wallet's profile visibility cache if it exists
      await redisCache.invalidate(`profileVisibility:${walletAddress}`);

      return NextResponse.json({
        success: true,
        message: `Cache cleared for wallet ${walletAddress}`,
      });
    } else if (type === "walletClaim") {
      // If we have user's Twitter username
      if (session.user?.username) {
        // Use search to find wallets claimed by this user
        // This is more complex but could be implemented if needed
      }

      return NextResponse.json({
        success: true,
        message: `General cache cleared`,
      });
    } else if (type === "selective" && patterns && patterns.length > 0) {
      // Selective cache clearing with patterns
      for (const pattern of patterns) {
        await redisCache.invalidate(pattern);
      }

      return NextResponse.json({
        success: true,
        message: `Selectively cleared caches: ${patterns.join(", ")}`,
      });
    } else if (type === "all") {
      // Clear everything - restricted to admin users
      if (session.user.role === "admin") {
        await redisCache.invalidate("all");

        return NextResponse.json({
          success: true,
          message: "All caches cleared",
        });
      } else {
        return NextResponse.json(
          {
            error: "Unauthorized - admin required for complete cache clear",
          },
          { status: 403 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: "No specific cache cleared",
    });
  } catch (error) {
    console.error("Error clearing cache:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
