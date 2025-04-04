import { NextResponse } from "next/server";
import { LRUCache } from "lru-cache";
import Moralis from "moralis";
import { db } from "../../lib/firebase-admin";
import admin from "firebase-admin";

const CONTRACT_ADDRESS = "0x32481ac9B124bD82944eac67B2EA449797d402D1";
const MAX_SUPPLY = 1_000_000_000;
const MORALIS_API_KEY = process.env.MORALIS_API_KEY;

// Initialize Moralis once
let moralisStarted = false;
const initMoralis = async () => {
  if (!moralisStarted) {
    await Moralis.start({ apiKey: MORALIS_API_KEY });
    moralisStarted = true;
  }
};

// Initialize LRU cache
const cache = new LRUCache({
  max: 1000,
  ttl: 1000 * 3, // 30 seconds cache
  updateAgeOnGet: true,
});

async function fetchHoldersData() {
  try {
    const cachedData = cache.get("holders");
    if (cachedData) return cachedData;

    await initMoralis();

    const response = await Moralis.EvmApi.token.getTokenOwners({
      chain: "0x2105",
      tokenAddress: CONTRACT_ADDRESS,
      limit: 100,
      order: "DESC",
    });

    const holders = response.result.map((holder) => {
      const address = holder.ownerAddress;
      const balance = holder.balance || "0";
      const formattedBalance = (Number(balance) / 1e18).toFixed(18);
      const percentage = (Number(balance) / (MAX_SUPPLY * 1e18)) * 100;

      return {
        address: address,
        value: balance,
        balance_formatted: formattedBalance,
        percentage: percentage,
        is_contract: false, // We'll need to check this separately if needed
        label: null,
      };
    });

    const sortedHolders = holders.sort(
      (a, b) => Number(b.balance_formatted) - Number(a.balance_formatted)
    );

    cache.set("holders", sortedHolders);
    return sortedHolders;
  } catch (error) {
    console.error("Error fetching holders from Moralis:", error);
    console.error("Error details:", error.message);
    return [];
  }
}

async function fetchTokenPrice() {
  try {
    const response = await fetch(
      `https://api.dexscreener.com/latest/dex/tokens/${CONTRACT_ADDRESS}`,
      { next: { revalidate: 60 } } // Cache for 1 minute
    );

    if (!response.ok) {
      console.warn(`DexScreener API error: ${response.status}`);
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

    const data = await response.json();

    if (!data?.pairs?.length) {
      console.warn("No pairs found for token, returning default values");
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

    return {
      pairs: sortedPairs,
      mainPair: {
        ...mainPair,
        info: {
          imageUrl: mainPair.baseToken?.logoURI || null, // Remove the trustwallet fallback
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
  } catch (error) {
    console.warn("Error fetching token price:", error);
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

async function fetchSocialDataBatch(addresses) {
  try {
    console.log("Checking addresses:", addresses);

    // Get all wallet claims from the correct collection name
    const claimsSnapshot = await db
      .collection("walletClaims") // Changed from wallet_claims to walletClaims
      .get();

    console.log("Total claims found:", claimsSnapshot.size);

    // Create claims map for our addresses
    const claimsMap = new Map();
    claimsSnapshot.forEach((doc) => {
      const data = doc.data();
      const walletAddress = data.walletAddress.toLowerCase();

      if (addresses.includes(walletAddress)) {
        console.log("Found matching claim:", data);
        claimsMap.set(walletAddress, data);
      }
    });

    console.log("Matched claims:", claimsMap.size);

    if (claimsMap.size === 0) {
      console.log("No matching claims found");
      return new Map();
    }

    // Get unique user IDs from claims
    const userIds = [
      ...new Set(Array.from(claimsMap.values()).map((claim) => claim.userId)),
    ];
    console.log("User IDs to fetch:", userIds);

    // Get user data
    const usersSnapshot = await db
      .collection("users")
      .where(admin.firestore.FieldPath.documentId(), "in", userIds)
      .get();

    // Create social data map
    const socialDataMap = new Map();
    claimsMap.forEach((claim, address) => {
      const user = usersSnapshot.docs.find((doc) => doc.id === claim.userId);

      if (user) {
        const userData = user.data();
        socialDataMap.set(address, {
          twitter: userData.username || userData.twitterUsername,
          profileImage: userData.image,
          name: userData.name,
          verified: userData.emailVerified || false,
          showProfile: claim.showProfile !== false, // Use the showProfile value from claim
        });
        console.log(`Added social data for ${address}:`, userData);
      }
    });

    console.log("Final social data map size:", socialDataMap.size);
    return socialDataMap;
  } catch (error) {
    console.error("Error in fetchSocialDataBatch:", error);
    return new Map();
  }
}

export async function GET() {
  try {
    const [holdersData, tokenData] = await Promise.all([
      fetchHoldersData(),
      fetchTokenPrice(),
    ]);

    const currentPrice = Number(tokenData.mainPair?.priceUsd || 0);

    // Get all unique addresses
    const addresses = holdersData.map((holder) => holder.address);
    console.log("Total addresses to check:", addresses.length);

    // Fetch social data for all addresses in one batch
    const socialDataMap = await fetchSocialDataBatch(addresses);
    console.log("Social data map size:", socialDataMap.size);

    // Log a sample of the social data
    if (socialDataMap.size > 0) {
      const sampleAddress = Array.from(socialDataMap.keys())[0];
      console.log("Sample social data:", {
        address: sampleAddress,
        data: socialDataMap.get(sampleAddress),
      });
    }

    // Combine holders data with social data
    const holders = holdersData.map((holder) => {
      const social = socialDataMap.get(holder.address.toLowerCase());
      if (social) {
        console.log(`Found social data for ${holder.address}`);
      }
      return {
        address: holder.address,
        value: holder.value,
        balance_formatted: holder.balance_formatted,
        percentage: Number(holder.percentage).toFixed(8),
        usdValue: (Number(holder.balance_formatted) * currentPrice).toFixed(2),
        is_contract: holder.is_contract,
        label: holder.label,
        social,
      };
    });

    // Log holders with social data
    const holdersWithSocial = holders.filter((h) => h.social);
    console.log("Holders with social data:", holdersWithSocial.length);

    return NextResponse.json({
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
    });
  } catch (error) {
    console.error("Error in GET route:", error);
    return NextResponse.json(
      { error: "Failed to fetch holders data", details: error.message },
      { status: 500 }
    );
  }
}
