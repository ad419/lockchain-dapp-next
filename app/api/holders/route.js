import { NextResponse } from "next/server";
import Moralis from "moralis";
import { db } from "../../lib/firebase-admin";
import admin from "firebase-admin";
import { getMoralisClient } from "../../lib/moralis-client";
import { redis, redisCache } from "../../lib/redis";

const CONTRACT_ADDRESS = "0xd41d5Ee0874Dc10108B518dc527aE798Bf43b53e";
const MAX_SUPPLY = 1_000_000_000;

// We're removing LRU cache and using Redis instead

// Optimize the liveMode flag handling in the GET function

export async function GET(request) {
  try {
    // Check URL parameters for cache control
    const { searchParams } = new URL(request.url);
    const forceRefresh =
      searchParams.get("refresh") === "true" ||
      searchParams.get("forcefresh") === "true";
    const liveMode = searchParams.get("live") === "true";

    // In live mode:
    // 1. Always bypass Redis cache
    // 2. Don't store results back in Redis
    // 3. Add a timestamp to prevent browser caching
    if (liveMode || forceRefresh) {
      console.log(
        `🔄 ${
          liveMode ? "Live mode" : "Force refresh"
        } - fetching fresh data from Moralis`
      );

      // Add cache control headers for live mode
      const headers = new Headers();
      headers.append("Cache-Control", "no-cache, no-store, must-revalidate");
      headers.append("Pragma", "no-cache");
      headers.append("Expires", "0");

      // Rest of your existing data fetching code...
      // No changes to fetchHoldersWithTimeout and fetchTokenPriceWithTimeout

      let holdersData = [];
      let tokenData = {};
      let timeoutOccurred = false;

      // Individual timeouts for each operation
      const fetchHoldersWithTimeout = async () => {
        return Promise.race([
          fetchHoldersData(true, liveMode),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Holders data timeout")), 10000)
          ),
        ]);
      };

      const fetchTokenPriceWithTimeout = async () => {
        return Promise.race([
          fetchTokenPrice(forceRefresh),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Token price timeout")), 8000)
          ),
        ]);
      };

      try {
        // Run data fetches in parallel with individual timeouts
        [holdersData, tokenData] = await Promise.all([
          fetchHoldersWithTimeout().catch((err) => {
            console.error("❌ Holders data fetch timed out:", err);
            timeoutOccurred = true;
            return getFallbackHolders();
          }),
          fetchTokenPriceWithTimeout().catch((err) => {
            console.error("❌ Token price fetch timed out:", err);
            timeoutOccurred = true;
            return {
              mainPair: {
                priceUsd: "0",
                priceChange: { h24: 0, h1: 0 },
                liquidity: { usd: 0 },
                volume: { h24: 0 },
                txns: { h24: { buys: 0, sells: 0 } },
              },
            };
          }),
        ]);

        // Process holders data and build response as in your existing code
        // Always ensure we have arrays and objects to work with
        holdersData = Array.isArray(holdersData) ? holdersData : [];
        tokenData = tokenData || {};

        const currentPrice = Number(tokenData.mainPair?.priceUsd || 0);

        // Add safety checks to prevent null/undefined access
        let socialDataMap = new Map();
        try {
          if (holdersData.length > 0 && !timeoutOccurred) {
            // Only fetch social data if we didn't time out earlier
            // Get all unique addresses
            const addresses = holdersData
              .filter((holder) => holder && holder.address)
              .map((holder) => holder.address.toLowerCase())
              .slice(0, 100); // Limit to top 100 holders to reduce load

            // Fetch social data with timeout
            socialDataMap = await Promise.race([
              fetchSocialDataBatch(addresses),
              new Promise((_, reject) =>
                setTimeout(() => reject(new Error("Social data timeout")), 8000)
              ),
            ]).catch((err) => {
              console.warn("⚠️ Social data fetch timed out:", err);
              return new Map();
            });
          } else {
            console.log(
              "⚠️ Skipping social data fetch due to previous timeout or empty holders data"
            );
          }
        } catch (socialError) {
          console.error("❌ Error fetching social data:", socialError);
          // Continue with empty social data
        }

        // Combine holders data with social data - with extra safety checks
        const holders = holdersData.map((holder, index) => {
          try {
            const normalizedAddress = (holder.address || "").toLowerCase();
            const social = normalizedAddress
              ? socialDataMap.get(normalizedAddress)
              : null;

            // Add rank information for sorted holders
            return {
              address: holder.address || `unknown_${index}`,
              value: holder.value || "0",
              balance_formatted: holder.balance_formatted || "0",
              percentage: Number(holder.percentage || 0).toFixed(8),
              usdValue: (
                Number(holder.balance_formatted || 0) * currentPrice
              ).toFixed(2),
              rank: index + 1,
              is_contract: holder.is_contract || false,
              label: holder.label || null,
              social,
            };
          } catch (err) {
            console.warn(`❌ Error processing holder at index ${index}:`, err);
            // Return safe fallback holder data
            return {
              address: `error_${index}`,
              value: "0",
              balance_formatted: "0",
              percentage: "0",
              usdValue: "0",
              rank: index + 1,
              is_contract: false,
              label: "Error",
              social: null,
            };
          }
        });

        // Track address updates for efficient change detection
        if (holdersData && Array.isArray(holdersData) && redisCache) {
          try {
            // Only track the first 100 addresses to avoid Redis overload
            const topHolders = holdersData.slice(0, 100);

            // Track each address update
            for (const holder of topHolders) {
              if (holder && holder.address && holder.balance) {
                await redisCache.trackAddressUpdate(
                  holder.address.toLowerCase(),
                  holder.balance
                );
              }
            }

            // Update the last modified timestamp
            await redisCache.updateLastModified();
          } catch (trackError) {
            console.warn(
              "Non-critical error tracking address updates:",
              trackError
            );
          }
        }

        const response = {
          holders,
          totalSupply: MAX_SUPPLY,
          tokenPrice: currentPrice,
          dexData: tokenData.mainPair
            ? {
                mainPair: {
                  ...tokenData.mainPair,
                  priceUsd: currentPrice,
                },
              }
            : null,
          cached: false,
          lastUpdated: new Date().toISOString(),
          socialDataCount: socialDataMap.size,
          hadTimeout: timeoutOccurred,
          maintenanceMode: false,
          fromLiveMode: liveMode,
          timestamp: Date.now(), // Add timestamp to prevent browser caching
        };

        // Only save to Redis if not in live mode
        if (!liveMode) {
          // Cache the complete API response in Redis (don't await)
          redisCache.setLeaderboardData(response).catch((err) => {
            console.error("❌ Redis caching error:", err);
          });
        } else {
          // In live mode, update the last modified timestamp but don't store data
          // This helps track that there was an update without using storage
          redisCache.updateLastModified().catch((err) => {
            console.warn("Failed to update last modified timestamp:", err);
          });
        }

        // Return with no-cache headers for live mode
        return new NextResponse(JSON.stringify(response), {
          status: 200,
          headers: liveMode ? headers : undefined,
        });
      } catch (fetchError) {
        console.error("❌ Error in parallel data fetching:", fetchError);

        // Recover individually with more aggressive timeout handling
        console.log("🔄 Attempting recovery with shorter timeouts...");

        try {
          holdersData = await Promise.race([
            fetchHoldersData(false),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error("Recovery timeout")), 5000)
            ),
          ]).catch(() => getFallbackHolders());
        } catch (e) {
          holdersData = getFallbackHolders();
        }

        try {
          tokenData = await Promise.race([
            fetchTokenPrice(false),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error("Recovery timeout")), 5000)
            ),
          ]).catch(() => ({
            mainPair: {
              priceUsd: "0",
              priceChange: { h24: 0, h1: 0 },
              liquidity: { usd: 0 },
              volume: { h24: 0 },
              txns: { h24: { buys: 0, sells: 0 } },
            },
          }));
        } catch (e) {
          tokenData = {
            mainPair: {
              priceUsd: "0",
              priceChange: { h24: 0, h1: 0 },
              liquidity: { usd: 0 },
              volume: { h24: 0 },
              txns: { h24: { buys: 0, sells: 0 } },
            },
          };
        }

        // Always ensure we have arrays and objects to work with
        holdersData = Array.isArray(holdersData) ? holdersData : [];
        tokenData = tokenData || {};

        const currentPrice = Number(tokenData.mainPair?.priceUsd || 0);

        // Add safety checks to prevent null/undefined access
        let socialDataMap = new Map();
        try {
          if (holdersData.length > 0 && !timeoutOccurred) {
            // Only fetch social data if we didn't time out earlier
            // Get all unique addresses
            const addresses = holdersData
              .filter((holder) => holder && holder.address)
              .map((holder) => holder.address.toLowerCase())
              .slice(0, 100); // Limit to top 100 holders to reduce load

            // Fetch social data with timeout
            socialDataMap = await Promise.race([
              fetchSocialDataBatch(addresses),
              new Promise((_, reject) =>
                setTimeout(() => reject(new Error("Social data timeout")), 8000)
              ),
            ]).catch((err) => {
              console.warn("⚠️ Social data fetch timed out:", err);
              return new Map();
            });
          } else {
            console.log(
              "⚠️ Skipping social data fetch due to previous timeout or empty holders data"
            );
          }
        } catch (socialError) {
          console.error("❌ Error fetching social data:", socialError);
          // Continue with empty social data
        }

        // Combine holders data with social data - with extra safety checks
        const holders = holdersData.map((holder, index) => {
          try {
            const normalizedAddress = (holder.address || "").toLowerCase();
            const social = normalizedAddress
              ? socialDataMap.get(normalizedAddress)
              : null;

            // Add rank information for sorted holders
            return {
              address: holder.address || `unknown_${index}`,
              value: holder.value || "0",
              balance_formatted: holder.balance_formatted || "0",
              percentage: Number(holder.percentage || 0).toFixed(8),
              usdValue: (
                Number(holder.balance_formatted || 0) * currentPrice
              ).toFixed(2),
              rank: index + 1,
              is_contract: holder.is_contract || false,
              label: holder.label || null,
              social,
            };
          } catch (err) {
            console.warn(`❌ Error processing holder at index ${index}:`, err);
            // Return safe fallback holder data
            return {
              address: `error_${index}`,
              value: "0",
              balance_formatted: "0",
              percentage: "0",
              usdValue: "0",
              rank: index + 1,
              is_contract: false,
              label: "Error",
              social: null,
            };
          }
        });

        // Track address updates for efficient change detection
        if (holdersData && Array.isArray(holdersData) && redisCache) {
          try {
            // Only track the first 100 addresses to avoid Redis overload
            const topHolders = holdersData.slice(0, 100);

            // Track each address update
            for (const holder of topHolders) {
              if (holder && holder.address && holder.balance) {
                await redisCache.trackAddressUpdate(
                  holder.address.toLowerCase(),
                  holder.balance
                );
              }
            }

            // Update the last modified timestamp
            await redisCache.updateLastModified();
          } catch (trackError) {
            console.warn(
              "Non-critical error tracking address updates:",
              trackError
            );
          }
        }

        const response = {
          holders,
          totalSupply: MAX_SUPPLY,
          tokenPrice: currentPrice,
          dexData: tokenData.mainPair
            ? {
                mainPair: {
                  ...tokenData.mainPair,
                  priceUsd: currentPrice,
                },
              }
            : null,
          cached: false,
          lastUpdated: new Date().toISOString(),
          socialDataCount: socialDataMap.size,
          hadTimeout: timeoutOccurred,
          maintenanceMode: false,
          fromLiveMode: liveMode,
          timestamp: Date.now(), // Add timestamp to prevent browser caching
        };

        // In live mode, make sure to include no-cache headers
        return new NextResponse(JSON.stringify(response), {
          status: 200,
          headers: liveMode ? headers : undefined,
        });
      }
    }

    // If not in live mode, use your existing Redis cache logic
    if (!forceRefresh) {
      const redisData = await redisCache.getLeaderboardData();
      if (redisData) {
        console.log(
          `📌 Using Redis cache (age: ${Math.round(redisData.age / 1000)}s)`
        );
        return NextResponse.json({
          ...redisData,
          cached: true,
          source: "redis",
          cacheAge: Math.round(redisData.age / 1000),
        });
      }
    }

    // No cache hit, fetch fresh data
    console.log("🔄 Fetching fresh leaderboard data");

    // Improved timeout handling with more granular control
    let holdersData = [];
    let tokenData = {};
    let timeoutOccurred = false;

    // Individual timeouts for each operation
    const fetchHoldersWithTimeout = async () => {
      return Promise.race([
        fetchHoldersData(forceRefresh),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Holders data timeout")), 10000)
        ),
      ]);
    };

    const fetchTokenPriceWithTimeout = async () => {
      return Promise.race([
        fetchTokenPrice(forceRefresh),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Token price timeout")), 8000)
        ),
      ]);
    };

    try {
      // Run data fetches in parallel with individual timeouts
      [holdersData, tokenData] = await Promise.all([
        fetchHoldersWithTimeout().catch((err) => {
          console.error("❌ Holders data fetch timed out:", err);
          timeoutOccurred = true;
          return getFallbackHolders();
        }),
        fetchTokenPriceWithTimeout().catch((err) => {
          console.error("❌ Token price fetch timed out:", err);
          timeoutOccurred = true;
          return {
            mainPair: {
              priceUsd: "0",
              priceChange: { h24: 0, h1: 0 },
              liquidity: { usd: 0 },
              volume: { h24: 0 },
              txns: { h24: { buys: 0, sells: 0 } },
            },
          };
        }),
      ]);
    } catch (fetchError) {
      console.error("❌ Error in parallel data fetching:", fetchError);

      // Recover individually with more aggressive timeout handling
      console.log("🔄 Attempting recovery with shorter timeouts...");

      try {
        holdersData = await Promise.race([
          fetchHoldersData(false),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Recovery timeout")), 5000)
          ),
        ]).catch(() => getFallbackHolders());
      } catch (e) {
        holdersData = getFallbackHolders();
      }

      try {
        tokenData = await Promise.race([
          fetchTokenPrice(false),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Recovery timeout")), 5000)
          ),
        ]).catch(() => ({
          mainPair: {
            priceUsd: "0",
            priceChange: { h24: 0, h1: 0 },
            liquidity: { usd: 0 },
            volume: { h24: 0 },
            txns: { h24: { buys: 0, sells: 0 } },
          },
        }));
      } catch (e) {
        tokenData = {
          mainPair: {
            priceUsd: "0",
            priceChange: { h24: 0, h1: 0 },
            liquidity: { usd: 0 },
            volume: { h24: 0 },
            txns: { h24: { buys: 0, sells: 0 } },
          },
        };
      }
    }

    // Always ensure we have arrays and objects to work with
    holdersData = Array.isArray(holdersData) ? holdersData : [];
    tokenData = tokenData || {};

    const currentPrice = Number(tokenData.mainPair?.priceUsd || 0);

    // Add safety checks to prevent null/undefined access
    let socialDataMap = new Map();
    try {
      if (holdersData.length > 0 && !timeoutOccurred) {
        // Only fetch social data if we didn't time out earlier
        // Get all unique addresses
        const addresses = holdersData
          .filter((holder) => holder && holder.address)
          .map((holder) => holder.address.toLowerCase())
          .slice(0, 100); // Limit to top 100 holders to reduce load

        // Fetch social data with timeout
        socialDataMap = await Promise.race([
          fetchSocialDataBatch(addresses),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Social data timeout")), 8000)
          ),
        ]).catch((err) => {
          console.warn("⚠️ Social data fetch timed out:", err);
          return new Map();
        });
      } else {
        console.log(
          "⚠️ Skipping social data fetch due to previous timeout or empty holders data"
        );
      }
    } catch (socialError) {
      console.error("❌ Error fetching social data:", socialError);
      // Continue with empty social data
    }

    // Combine holders data with social data - with extra safety checks
    const holders = holdersData.map((holder, index) => {
      try {
        const normalizedAddress = (holder.address || "").toLowerCase();
        const social = normalizedAddress
          ? socialDataMap.get(normalizedAddress)
          : null;

        // Add rank information for sorted holders
        return {
          address: holder.address || `unknown_${index}`,
          value: holder.value || "0",
          balance_formatted: holder.balance_formatted || "0",
          percentage: Number(holder.percentage || 0).toFixed(8),
          usdValue: (
            Number(holder.balance_formatted || 0) * currentPrice
          ).toFixed(2),
          rank: index + 1,
          is_contract: holder.is_contract || false,
          label: holder.label || null,
          social,
        };
      } catch (err) {
        console.warn(`❌ Error processing holder at index ${index}:`, err);
        // Return safe fallback holder data
        return {
          address: `error_${index}`,
          value: "0",
          balance_formatted: "0",
          percentage: "0",
          usdValue: "0",
          rank: index + 1,
          is_contract: false,
          label: "Error",
          social: null,
        };
      }
    });

    // Track address updates for efficient change detection
    if (holdersData && Array.isArray(holdersData) && redisCache) {
      try {
        // Only track the first 100 addresses to avoid Redis overload
        const topHolders = holdersData.slice(0, 100);

        // Track each address update
        for (const holder of topHolders) {
          if (holder && holder.address && holder.balance) {
            await redisCache.trackAddressUpdate(
              holder.address.toLowerCase(),
              holder.balance
            );
          }
        }

        // Update the last modified timestamp
        await redisCache.updateLastModified();
      } catch (trackError) {
        console.warn(
          "Non-critical error tracking address updates:",
          trackError
        );
      }
    }

    const response = {
      holders,
      totalSupply: MAX_SUPPLY,
      tokenPrice: currentPrice,
      dexData: tokenData.mainPair
        ? {
            mainPair: {
              ...tokenData.mainPair,
              priceUsd: currentPrice,
            },
          }
        : null,
      cached: false,
      lastUpdated: new Date().toISOString(),
      socialDataCount: socialDataMap.size,
      hadTimeout: timeoutOccurred,
      maintenanceMode: false,
    };

    // Cache the complete API response in Redis (don't await to keep response fast)
    redisCache.setLeaderboardData(response).catch((err) => {
      console.error("❌ Redis caching error:", err);
    });

    return NextResponse.json(response);
  } catch (error) {
    console.error("❌ Critical error in GET route:", error);

    // Try to return cached Redis data even if processing failed
    try {
      const redisData = await redisCache.getLeaderboardData();
      if (redisData) {
        console.log("↩️ Critical error recovery - returning Redis cache");
        return NextResponse.json({
          ...redisData,
          recovered: true,
          error: "Recovered from error with Redis data",
          maintenanceMode: false,
        });
      }
    } catch (redisError) {
      console.error("❌ Redis recovery failed:", redisError);
    }

    // Absolute last resort - return minimal working data structure
    return NextResponse.json({
      holders: getFallbackHolders().map((holder, index) => ({
        ...holder,
        rank: index + 1,
        usdValue: "0",
        social: null,
      })),
      totalSupply: MAX_SUPPLY,
      tokenPrice: 0,
      dexData: null,
      cached: false,
      lastUpdated: new Date().toISOString(),
      socialDataCount: 0,
      emergency: true,
      maintenanceMode: true,
      error: "Emergency fallback data",
    });
  }
}

// Add this function to provide fallback data when Moralis fails
const getFallbackHolders = () => {
  console.log("⚠️ Using emergency fallback holder data");
  // Return minimal emergency fallback data
  return [
    {
      address: "0x32481ac9B124bD82944eac67B2EA449797d402D1",
      value: "100000000000000000000000000",
      balance_formatted: "100000000.000000000000000000",
      percentage: 10,
      is_contract: true,
      label: "LockChain Contract",
    },
    // Add more placeholder holders if needed
  ];
};

// Modify fetchHoldersData function to completely bypass Redis in live mode
async function fetchHoldersData(forceRefresh = false, isLiveMode = false) {
  try {
    // If this is for live mode or forced refresh, completely bypass Redis
    if (!forceRefresh && !isLiveMode) {
      const holdersData = await redisCache.getHoldersData();
      if (holdersData) {
        console.log("✅ Using Redis cached holders data");
        return holdersData;
      }
    } else if (isLiveMode) {
      console.log("🚫 Live mode - bypassing Redis cache completely");
    }

    // Direct call to Moralis API
    console.log("🔄 Fetching fresh holders data from Moralis");

    // Get properly initialized Moralis client
    const Moralis = await getMoralisClient();

    // Call Moralis API with no caching
    const response = await Moralis.EvmApi.token.getTokenOwners({
      chain: "0x2105",
      tokenAddress: CONTRACT_ADDRESS,
      limit: 100,
      order: "DESC",
    });

    // Rest of your validation and processing code
    if (!response || !response.result || !Array.isArray(response.result)) {
      console.error("❌ Invalid response format from Moralis:", response);
      throw new Error("Invalid response format from Moralis");
    }

    // Process response as before, but skip Redis caching in live mode
    const holders = response.result.map((holder) => {
      const address = holder.ownerAddress;
      try {
        const balance = holder.balance || "0";
        const formattedBalance = (Number(balance) / 1e18).toFixed(18);
        const percentage = (Number(balance) / (MAX_SUPPLY * 1e18)) * 100;

        return {
          address: address,
          value: balance,
          balance_formatted: formattedBalance,
          percentage: percentage,
          is_contract: false,
          label: null,
        };
      } catch (err) {
        console.warn(`Error processing holder ${address}:`, err);
        // Return a safe fallback for this holder
        return {
          address: address,
          value: "0",
          balance_formatted: "0.000000000000000000",
          percentage: 0,
          is_contract: false,
          label: null,
          error: true,
        };
      }
    });

    // Safety check - filter out any malformed entries
    const validHolders = holders.filter(
      (h) =>
        h &&
        typeof h.address === "string" &&
        !isNaN(Number(h.balance_formatted))
    );

    if (validHolders.length === 0) {
      console.error("❌ All holder entries were invalid");

      // Try getting stale Redis data
      const staleData = await redisCache.getHoldersData(true);
      if (staleData) {
        console.log(
          "↩️ Falling back to stale Redis data after validation error"
        );
        return staleData;
      }

      // If no Redis data at all, use emergency fallback
      return getFallbackHolders();
    }

    const sortedHolders = validHolders.sort(
      (a, b) => Number(b.balance_formatted) - Number(a.balance_formatted)
    );

    // Skip Redis cache if in live mode
    if (!isLiveMode) {
      // Cache in Redis (your existing code)
      redisCache.setHoldersData(sortedHolders).catch((err) => {
        console.error("❌ Redis caching error:", err);
      });
    } else {
      console.log("🚫 Live mode - skipping Redis cache storage");
    }

    return sortedHolders;
  } catch (error) {
    console.error("❌ Error fetching holders from Moralis:", error);

    // Try getting stale Redis data
    const staleData = await redisCache.getHoldersData(true);
    if (staleData) {
      console.log("↩️ Falling back to stale Redis data after error");
      return staleData;
    }

    // Last resort - return emergency fallback data
    console.log("🚨 Using emergency fallback data - no Redis cache available");
    return getFallbackHolders();
  }
}

// Update fetchTokenPrice to use API directly without Redis cache
async function fetchTokenPrice(forceRefresh = false) {
  try {
    console.log("🔄 Fetching fresh token price data from DexScreener");
    const response = await fetch(
      `https://api.dexscreener.com/latest/dex/tokens/${CONTRACT_ADDRESS}`
    );

    if (!response.ok) {
      console.warn(`DexScreener API error: ${response.status}`);
      throw new Error(
        `DexScreener API responded with status ${response.status}`
      );
    }

    const data = await response.json();

    if (!data?.pairs?.length) {
      console.warn("No pairs found for token");
      throw new Error("No pairs found for token");
    }

    // Sort pairs by liquidity
    const sortedPairs = data.pairs.sort(
      (a, b) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0)
    );

    // Calculate combined stats
    const combinedStats = sortedPairs.reduce(
      (acc, pair) => ({
        volume24h: (acc.volume24h || 0) + (pair.volume?.h24 || 0),
        liquidity: (acc.liquidity || 0) + (pair.liquidity?.usd || 0),
        txns24h: {
          buys: (acc.txns24h?.buys || 0) + (pair.txns?.h24?.buys || 0),
          sells: (acc.txns24h?.sells || 0) + (pair.txns?.h24?.sells || 0),
        },
      }),
      {}
    );

    const mainPair = sortedPairs[0];
    const result = {
      pairs: sortedPairs,
      mainPair: {
        ...mainPair,
        info: {
          imageUrl: mainPair.baseToken?.logoURI || null,
          socials: [
            { type: "website", url: mainPair.url || "" },
            {
              type: "twitter",
              url: mainPair.baseToken?.twitter
                ? `https://twitter.com/${mainPair.baseToken.twitter}`
                : "",
            },
          ].filter((social) => social.url),
        },
        combinedStats,
      },
      priceUsd: Number(mainPair.priceUsd || 0),
    };

    return result;
  } catch (error) {
    console.warn("Error fetching token price:", error);

    // Return default data if API request fails
    return {
      pairs: [],
      mainPair: {
        info: { imageUrl: "", socials: [] },
        baseToken: { name: "", symbol: "" },
        priceChange: { h24: 0, h1: 0 },
        liquidity: { usd: 0 },
        volume: { h24: 0 },
        txns: { h24: { buys: 0, sells: 0 } },
        combinedStats: {
          volume24h: 0,
          liquidity: 0,
          txns24h: { buys: 0, sells: 0 },
        },
      },
      priceUsd: 0,
    };
  }
}

// Modified to use Redis for social data caching
async function fetchSocialDataBatch(addresses) {
  try {
    if (!addresses || addresses.length === 0) return new Map();

    const socialDataMap = new Map();
    const startTime = Date.now();
    const stats = {
      total: addresses.length,
      fromRedis: 0,
      fromFirestore: 0,
      notFound: 0,
      startTime,
    };

    // First check Redis cache for all addresses
    const uncachedAddresses = [];

    // Change from "if (redis)" to "if (redisCache)"
    if (redisCache) {
      for (const addr of addresses) {
        try {
          const normalizedAddr = addr.toLowerCase();
          const cachedData = await redisCache.getSocialData(normalizedAddr);

          if (cachedData) {
            // Debug log to see what's coming from Redis
            console.log(
              `Redis social data for ${normalizedAddr.slice(0, 6)}...`,
              typeof cachedData,
              JSON.stringify(cachedData).slice(0, 100)
            );

            stats.fromRedis++;
            socialDataMap.set(normalizedAddr, cachedData);
          } else {
            uncachedAddresses.push(normalizedAddr);
          }
        } catch (err) {
          console.warn(`Error checking Redis cache for ${addr}:`, err);
          uncachedAddresses.push(addr.toLowerCase());
        }
      }
    } else {
      // If Redis cache is not available, all addresses need to be fetched
      uncachedAddresses.push(...addresses.map((addr) => addr.toLowerCase()));
    }

    if (uncachedAddresses.length > 0) {
      // Batch fetch wallet claims - improved error handling
      try {
        // Split into chunks of 30 for Firestore limits
        const chunkSize = 30;
        const claimsMap = new Map();

        for (let i = 0; i < uncachedAddresses.length; i += chunkSize) {
          const chunk = uncachedAddresses.slice(i, i + chunkSize);
          if (chunk.length === 0) continue;

          try {
            const claimsSnapshot = await db
              .collection("walletClaims")
              .where("walletAddress", "in", chunk)
              .limit(30)
              .get();

            claimsSnapshot.forEach((doc) => {
              const data = doc.data();
              if (data.walletAddress) {
                claimsMap.set(data.walletAddress.toLowerCase(), {
                  ...data,
                  id: doc.id,
                });
              }
            });
          } catch (chunkError) {
            console.error("Error fetching wallet claims chunk:", chunkError);
          }
        }

        // Get user IDs from claims
        const userIds = Array.from(
          new Set(
            Array.from(claimsMap.values())
              .filter((claim) => claim.userId)
              .map((claim) => claim.userId)
          )
        );

        // Fetch user data if we have user IDs
        const usersMap = new Map();

        if (userIds.length > 0) {
          // Batch user lookups in chunks of 30 for Firestore limits
          for (let i = 0; i < userIds.length; i += 30) {
            const batch = userIds.slice(i, i + 30);
            if (batch.length === 0) continue;

            try {
              const usersSnapshot = await db
                .collection("users")
                .where(admin.firestore.FieldPath.documentId(), "in", batch)
                .get();

              usersSnapshot.docs.forEach((doc) => {
                usersMap.set(doc.id, { ...doc.data(), id: doc.id });
              });
            } catch (err) {
              console.error("Error fetching users batch:", err);
            }
          }
        }

        // Process uncached addresses
        for (const addr of uncachedAddresses) {
          const claim = claimsMap.get(addr);

          if (claim && claim.userId) {
            const userData = usersMap.get(claim.userId);

            if (userData) {
              stats.fromFirestore++;
              const socialData = {
                twitter:
                  userData.username ||
                  userData.twitterUsername ||
                  claim.twitterUsername,
                profileImage: userData.profileImage || userData.image,
                name:
                  userData.name ||
                  userData.twitterUsername ||
                  claim.twitterUsername,
                verified: userData.emailVerified || false,
                showProfile: claim.showProfile !== false,
              };

              // Add to result map
              socialDataMap.set(addr, socialData);

              // Cache in Redis (don't await to keep it fast)
              if (redisCache) {
                // Changed from 'redis' to 'redisCache'
                // Make sure socialData is a plain object without methods or complex types
                const socialDataToStore = {
                  twitter: socialData.twitter || null,
                  profileImage: socialData.profileImage || null,
                  name: socialData.name || null,
                  verified: Boolean(socialData.verified),
                  showProfile: Boolean(socialData.showProfile),
                };

                redisCache
                  .setSocialData(addr, socialDataToStore)
                  .catch((err) => {
                    console.warn(`Error caching social data for ${addr}:`, err);
                  });
              }
            } else {
              stats.notFound++;
            }
          } else {
            stats.notFound++;
          }
        }
      } catch (batchError) {
        console.error("Error in batch processing claims:", batchError);
        // Continue with what we have
      }
    }

    // Calculate and log summary statistics
    const totalTime = Date.now() - stats.startTime;

    console.log(`
📊 SOCIAL DATA SUMMARY:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total addresses:     ${stats.total}
From Redis:          ${stats.fromRedis} (${Math.round(
      (stats.fromRedis / stats.total) * 100
    )}%)
From Firestore:      ${stats.fromFirestore} (${Math.round(
      (stats.fromFirestore / stats.total) * 100
    )}%)
Not found:           ${stats.notFound} (${Math.round(
      (stats.notFound / stats.total) * 100
    )}%)
Total time:          ${totalTime}ms
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `);

    return socialDataMap;
  } catch (error) {
    console.error(`❌ ERROR in fetchSocialDataBatch:`, error);
    return new Map();
  }
}

// Add PATCH endpoint for cache invalidation
export async function PATCH(request) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get("address");
    const invalidateAll = searchParams.get("all") === "true";

    if (invalidateAll) {
      // Clear all Redis caches
      await redisCache.invalidate("all");

      return NextResponse.json({
        success: true,
        message: "All Redis caches invalidated",
      });
    } else if (address) {
      // Invalidate specific address social data
      await redisCache.invalidate(`social:${address.toLowerCase()}`);

      return NextResponse.json({
        success: true,
        message: `Cache invalidated for ${address}`,
      });
    } else {
      // Just invalidate leaderboard
      await redisCache.invalidate("leaderboard");

      return NextResponse.json({
        success: true,
        message: "Leaderboard cache invalidated",
      });
    }
  } catch (error) {
    console.error("Error invalidating cache:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// Update how social data is attached to holders in buildResponse function

// Inside your buildResponse function
function buildResponse(holders, tokenPrice, socialDataMap) {
  // Your existing code...

  // Apply social data to holders
  for (let i = 0; i < formattedHolders.length; i++) {
    const holder = formattedHolders[i];

    // Make sure we're using the lowercase wallet address for consistency
    const normalizedAddr = holder.address.toLowerCase();

    // Get social data
    const socialData = socialDataMap.get(normalizedAddr);

    // Log for debugging
    if (i < 10) {
      console.log(
        `Social data for ${normalizedAddr.slice(0, 6)}:`,
        socialData ? JSON.stringify(socialData).slice(0, 50) + "..." : "null"
      );
    }

    // Only attach social data if holder wants profile shown
    if (socialData && socialData.showProfile !== false) {
      formattedHolders[i] = {
        ...holder,
        twitter: socialData.twitter,
        profileImage: socialData.profileImage,
        name: socialData.name,
        verified: socialData.verified || false,
      };
    } else {
      // Ensure there are no leftover social fields
      formattedHolders[i] = {
        ...holder,
        twitter: null,
        profileImage: null,
        name: null,
        verified: false,
      };
    }
  }

  return {
    holders: formattedHolders,
    tokenPrice,
  };
}
