import { NextResponse } from "next/server";
import { db } from "../../lib/firebase-admin";
import { serverCache } from "../../lib/server-cache";
import { LRUCache } from "lru-cache";

// Rate limiting setup
const rateLimits = new LRUCache({ max: 1000, ttl: 3600000 });
const RATE_LIMIT = { tokensPerInterval: 10, interval: 60000, burstLimit: 20 };

// Helper function to check rate limits
const checkRateLimit = (ip) => {
  const now = Date.now();
  let rateData = rateLimits.get(ip);

  if (!rateData) {
    rateData = {
      tokens: RATE_LIMIT.burstLimit - 1,
      lastRefill: now,
    };
    rateLimits.set(ip, rateData);
    return { allowed: true, remaining: rateData.tokens };
  }

  const timePassed = now - rateData.lastRefill;
  const refillAmount =
    Math.floor(timePassed / RATE_LIMIT.interval) * RATE_LIMIT.tokensPerInterval;

  if (refillAmount > 0) {
    rateData.tokens = Math.min(
      RATE_LIMIT.burstLimit,
      rateData.tokens + refillAmount
    );
    rateData.lastRefill = now;
  }

  if (rateData.tokens > 0) {
    rateData.tokens--;
    rateLimits.set(ip, rateData);
    return { allowed: true, remaining: rateData.tokens };
  } else {
    const timeUntilRefill = RATE_LIMIT.interval - (now - rateData.lastRefill);
    return {
      allowed: false,
      remaining: 0,
      retryAfter: Math.ceil(timeUntilRefill / 1000),
    };
  }
};

export async function POST(request) {
  try {
    // Get client IP for rate limiting
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";

    // Apply rate limiting
    const rateLimit = checkRateLimit(ip);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          message: `Rate limit exceeded. Try again in ${rateLimit.retryAfter} seconds.`,
        },
        { status: 429 }
      );
    }

    // Parse request body
    const requestData = await request.json();

    // Basic validation
    if (
      !requestData.tokenName ||
      !requestData.tokenSymbol ||
      !requestData.tokenSupply
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Missing required token information",
        },
        { status: 400 }
      );
    }

    // Prepare submission data with server timestamp
    const submissionData = {
      // Form data - ensure no undefined values
      name: requestData.name || "",
      email: requestData.email || "",
      tokenName: requestData.tokenName || "",
      tokenSymbol: requestData.tokenSymbol || "",
      tokenSupply: requestData.tokenSupply || "",
      decimals: requestData.decimals || "18",
      blockchain: requestData.blockchain || "Ethereum",
      tokenType: requestData.tokenType || "ERC-20",
      features: requestData.features || [],
      description: requestData.description || "",
      budget: requestData.budget || "",
      timeframe: requestData.timeframe || "1-2 weeks",

      // User data if available
      ...(requestData.userId && { userId: requestData.userId }),
      ...(requestData.email && { userEmail: requestData.email }),

      // System fields
      createdAt: new Date(),
      status: "pending",
      submittedFromIP: ip,
      createdVia: "api",
    };

    // Save to Firestore using admin SDK
    const tokenRequestsRef = db.collection("tokenRequests");
    const docRef = await tokenRequestsRef.add(submissionData);

    // Return success response
    return NextResponse.json({
      success: true,
      message: "Token request submitted successfully",
      requestId: docRef.id,
    });
  } catch (error) {
    console.error("Error in token-requests route:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to submit token request",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}
