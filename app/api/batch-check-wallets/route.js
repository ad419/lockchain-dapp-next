import { NextResponse } from "next/server";
import { db as adminDb } from "../../lib/firebase-admin";
import { redis } from "../../lib/redis";

const CACHE_TTL = 15 * 60; // 15 minutes Redis cache

export async function POST(request) {
  try {
    const { addresses } = await request.json();

    if (!addresses || !Array.isArray(addresses) || addresses.length === 0) {
      return NextResponse.json(
        { error: "Valid addresses array required" },
        { status: 400 }
      );
    }

    // Normalize addresses
    const normalizedAddresses = addresses.map((addr) => addr.toLowerCase());

    // Results object
    const results = {};

    // Track which addresses still need Firestore lookup
    const uncachedAddresses = [];

    // Check Redis cache first (in parallel)
    await Promise.all(
      normalizedAddresses.map(async (address) => {
        try {
          const cacheKey = `wallet:${address}`;
          const cachedData = await redis.get(cacheKey);

          if (cachedData) {
            const data = JSON.parse(cachedData);
            results[address] = data.claim;
          } else {
            uncachedAddresses.push(address);
          }
        } catch (err) {
          // On Redis error, check Firestore
          uncachedAddresses.push(address);
        }
      })
    );

    // If all addresses were in cache, return immediately
    if (uncachedAddresses.length === 0) {
      return NextResponse.json({ claims: results });
    }

    // Check Firestore for uncached addresses
    const chunkSize = 10; // Firestore 'in' query limit

    for (let i = 0; i < uncachedAddresses.length; i += chunkSize) {
      const chunk = uncachedAddresses.slice(i, i + chunkSize);

      const walletsRef = adminDb.collection("walletClaims");
      const q = walletsRef.where("walletAddress", "in", chunk);
      const snapshot = await q.get();

      // Process found claims
      snapshot.forEach((doc) => {
        const data = doc.data();
        const address = data.walletAddress.toLowerCase();

        const claim = {
          id: doc.id,
          ...data,
          // Convert Firestore timestamps
          ...(data.timestamp && {
            timestamp: data.timestamp.toDate().toISOString(),
          }),
          ...(data.claimedAt && {
            claimedAt: data.claimedAt.toDate().toISOString(),
          }),
        };

        // Add to results
        results[address] = claim;

        // Cache in Redis
        try {
          redis.set(`wallet:${address}`, JSON.stringify({ claim }), {
            ex: CACHE_TTL,
          });
        } catch (e) {
          console.warn("Redis caching error:", e);
        }
      });

      // Mark addresses that weren't found as not claimed
      chunk.forEach((address) => {
        if (!results[address]) {
          results[address] = null;

          // Cache null result
          try {
            redis.set(`wallet:${address}`, JSON.stringify({ claim: null }), {
              ex: CACHE_TTL,
            });
          } catch (e) {
            console.warn("Redis caching error:", e);
          }
        }
      });
    }

    return NextResponse.json({ claims: results });
  } catch (error) {
    console.error("Error batch checking wallets:", error);
    return NextResponse.json(
      { error: "Failed to batch check wallets" },
      { status: 500 }
    );
  }
}
