import { NextResponse } from "next/server";
import { serverCache } from "../../lib/server-cache";
import { LRUCache } from "lru-cache";

// Create a cache for holder data
const holderCache = new LRUCache({
  max: 500, // Cache up to 500 wallet addresses
  ttl: 1800000, // 30 minutes
  updateAgeOnGet: true,
  allowStale: true,
});

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get("address");
    const forceRefresh = searchParams.get("refresh") === "true";

    if (!address) {
      return NextResponse.json(
        { error: "Wallet address is required" },
        { status: 400 }
      );
    }

    // Normalize address
    const normalizedAddress = address.toLowerCase();
    const cacheKey = `holder_${normalizedAddress}`;

    // Check cache first
    if (!forceRefresh && holderCache.has(cacheKey)) {
      const cachedData = holderCache.get(cacheKey);
      console.log(`Cache hit for holder data: ${normalizedAddress}`);

      return NextResponse.json({
        success: true,
        data: cachedData,
        cached: true,
        tokenPrice: await getTokenPrice(),
        cacheAge: Math.round(
          (Date.now() - new Date(cachedData._cachedAt).getTime()) / 1000
        ),
      });
    }

    console.log(`Fetching fresh holder data for ${normalizedAddress}`);

    // Fetch from /api/holders and find the specific holder
    const holdersUrl = new URL("/api/holders", request.url);
    const holdersResponse = await fetch(holdersUrl.toString());

    if (!holdersResponse.ok) {
      throw new Error(
        `Failed to fetch holders data (${holdersResponse.status})`
      );
    }

    const holdersData = await holdersResponse.json();

    // Find the holder in the list
    const holder = holdersData.holders?.find(
      (h) => h.address?.toLowerCase() === normalizedAddress
    );

    // Format holder data or use minimal data if not found
    const holderData = holder
      ? {
          rank: holder.rank || 0,
          balance_formatted: holder.balance_formatted || "0",
          percentage: holder.percentage || "0",
          usdValue: holder.usdValue || "0",
          firstSeen: holder.firstSeen || new Date().toISOString(),
          lastSeen: holder.lastSeen || new Date().toISOString(),
          totalHolders: holdersData.holders?.length || 0,
          _cachedAt: new Date().toISOString(),
        }
      : {
          rank: 0,
          balance_formatted: "0",
          percentage: "0",
          usdValue: "0",
          firstSeen: new Date().toISOString(),
          lastSeen: new Date().toISOString(),
          totalHolders: holdersData.holders?.length || 0,
          _cachedAt: new Date().toISOString(),
        };

    // Cache the data
    holderCache.set(cacheKey, holderData);

    return NextResponse.json({
      success: true,
      data: holderData,
      tokenPrice: holdersData.tokenPrice || 0,
    });
  } catch (error) {
    console.error("Error fetching holder data:", error);

    // Return a helpful error object
    return NextResponse.json({
      success: false,
      data: {
        rank: 0,
        balance_formatted: "0",
        percentage: "0",
        usdValue: "0",
        firstSeen: new Date().toISOString(),
        lastSeen: new Date().toISOString(),
        totalHolders: 0,
      },
      message: error.message,
    });
  }
}

// Helper function to get token price
async function getTokenPrice() {
  try {
    // Try to get cached price
    if (global.tokenPrice && global.tokenPriceUpdated > Date.now() - 300000) {
      return global.tokenPrice; // Return cached price if less than 5 minutes old
    }

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || ""}/api/holders`
    );
    if (!response.ok) return 0;

    const data = await response.json();

    // Cache the price
    global.tokenPrice = data.tokenPrice || 0;
    global.tokenPriceUpdated = Date.now();

    return global.tokenPrice;
  } catch (error) {
    console.error("Error fetching token price:", error);
    return 0;
  }
}
