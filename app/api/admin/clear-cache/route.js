import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { serverCache } from "../../../lib/server-cache";

// Admin-only endpoint to clear or invalidate cache
export async function POST(request) {
  try {
    // Check if user is authenticated and is an admin
    const session = await getServerSession(authOptions);

    // You should implement proper admin checks here
    if (!session || !isAdmin(session.user.id)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { action, username, walletAddress } = await request.json();

    switch (action) {
      case "invalidateProfile":
        if (username) {
          const result = serverCache.invalidateProfile(username);
          return NextResponse.json({
            success: result,
            message: result
              ? `Profile cache for ${username} invalidated`
              : `No cache found for ${username}`,
          });
        }
        return NextResponse.json(
          { error: "Username required" },
          { status: 400 }
        );

      case "invalidateWallet":
        if (walletAddress) {
          const result = serverCache.invalidateWallet(walletAddress);
          return NextResponse.json({
            success: result,
            message: result
              ? `Wallet cache for ${walletAddress} invalidated`
              : `No cache found for ${walletAddress}`,
          });
        }
        return NextResponse.json(
          { error: "Wallet address required" },
          { status: 400 }
        );

      case "clearAll":
        const result = serverCache.clearAllCaches();
        return NextResponse.json({
          success: true,
          message: "All caches cleared",
          details: result,
        });

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Cache admin error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Helper function to check if user is an admin
function isAdmin(userId) {
  // Implement your admin check logic here
  // For example, check against a list of admin user IDs
  const adminUserIds = ["your-admin-user-id-1", "your-admin-user-id-2"];

  return adminUserIds.includes(userId);
}
