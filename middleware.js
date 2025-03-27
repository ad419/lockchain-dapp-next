import { NextResponse } from "next/server";
import { rateLimiter } from "./lib/rate-limiter";

// Define paths that should be excluded from rate limiting
const EXCLUDED_PATHS = [
  "/api/holders",
  "/api/price",
  "/api/auth", // This will exclude all auth-related routes
];

export async function middleware(request) {
  const path = request.nextUrl.pathname;

  // Only apply rate limiting to API routes that aren't excluded
  if (
    path.startsWith("/api") &&
    !EXCLUDED_PATHS.some((excludedPath) => path.startsWith(excludedPath))
  ) {
    const ip = request.ip ?? request.headers.get("x-real-ip") ?? "127.0.0.1";
    const { success } = await rateLimiter.limit(ip);

    if (!success) {
      return NextResponse.json(
        { error: "Too many requests - please try again later" },
        { status: 429 }
      );
    }
  }

  // Add caching headers for API routes
  const response = NextResponse.next();
  if (path.startsWith("/api")) {
    response.headers.set(
      "Cache-Control",
      "s-maxage=300, stale-while-revalidate"
    );
  }

  return response;
}

export const config = {
  matcher: ["/api/:path*"],
};
