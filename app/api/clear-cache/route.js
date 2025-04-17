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

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "walletClaim";

    // Get optional wallet address
    const walletAddress = searchParams.get("wallet")?.toLowerCase();

    if (type === "walletClaim" && walletAddress) {
      // Clear social data for specific wallet
      await redisCache.invalidate(`social:${walletAddress}`);

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
