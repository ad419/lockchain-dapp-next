import { NextResponse } from "next/server";
import { LRUCache } from "lru-cache";

const CONTRACT_ADDRESS = "0x50e756Da72c902474CE43e36f05dD530580d5370";
const MAX_SUPPLY = 1_000_000_000;

// Initialize LRU cache with 5-minute TTL and max 1000 items
const cache = new LRUCache({
  max: 1000, // Increased to handle 500 holders plus other data
  ttl: 1000 * 60 * 5, // 5 minutes
  updateAgeOnGet: true,
  updateAgeOnHas: true,
  sizeCalculation: (value) => {
    // Calculate size based on the data type
    if (typeof value === "object") {
      return JSON.stringify(value).length;
    }
    return 1;
  },
  maxSize: 5000000, // 5MB max size
});

async function fetchHoldersData() {
  // Check cache first
  const cachedData = cache.get("holders");
  if (cachedData) {
    return cachedData;
  }

  const query = `
    {
      EVM(dataset: archive, network: base) {
        TokenHolders(
          date: "2025-03-27"
          tokenSmartContract: "0x50e756Da72c902474CE43e36f05dD530580d5370"
          limit: { count: 500 }
          orderBy: { descending: Balance_Amount }
        ) {
          Holder {
            Address
          }
          Balance {
            Amount
          }
        }
      }
    }
  `;

  const response = await fetch("https://streaming.bitquery.io/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ory_at_iHWFlxpooDvH88bLKM7xjqT1pSIEPZhUEy6jZEd_PSM.gX-NqqbX2TM_TomIfEjszRu5wToC9G252ecltPdUvuM`,
    },
    body: JSON.stringify({ query }),
    next: { revalidate: 300 }, // Cache for 5 minutes
  });

  const data = await response.json();

  // Store in cache
  cache.set("holders", data);

  return data;
}

async function fetchTokenPrice() {
  try {
    const response = await fetch(
      `https://api.dexscreener.com/latest/dex/tokens/${CONTRACT_ADDRESS}`,
      { next: { revalidate: 60 } } // Cache for 5 hours
    );

    if (!response.ok) {
      throw new Error(`DexScreener API error: ${response.status}`);
    }

    const data = await response.json();

    if (!data?.pairs?.length) {
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

    return {
      pairs: sortedPairs,
      mainPair: {
        ...mainPair,
        info: {
          imageUrl:
            mainPair.baseToken.logoURI ||
            `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/smartchain/assets/${CONTRACT_ADDRESS}/logo.png`,
          socials: [
            { type: "website", url: mainPair.url || "" },
            {
              type: "twitter",
              url: `https://twitter.com/${mainPair.baseToken.twitter || ""}`,
            },
          ].filter((social) => social.url),
        },
        combinedStats,
      },
      priceUsd: Number(mainPair.priceUsd || 0),
    };
  } catch (error) {
    console.error("Error fetching token price:", error);
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

async function fetchTotalHolders() {
  // Check cache first
  const cachedTotal = cache.get("totalHolders");
  if (cachedTotal !== undefined) {
    return cachedTotal;
  }

  const query = `{
    EVM(dataset: archive, network: base) {
      TokenHolders(
        date: "2025-03-27"
        tokenSmartContract: "0x50e756Da72c902474CE43e36f05dD530580d5370"
        where: { Balance: { Amount: { gt: "0" } } }
      ) {
        uniq(of: Holder_Address)
      }
    }
  }`;

  const response = await fetch("https://streaming.bitquery.io/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ory_at_iHWFlxpooDvH88bLKM7xjqT1pSIEPZhUEy6jZEd_PSM.gX-NqqbX2TM_TomIfEjszRu5wToC9G252ecltPdUvuM`,
    },
    body: JSON.stringify({ query }),
    next: { revalidate: 300 }, // Cache for 5 minutes
  });

  const data = await response.json();
  const totalHolders = data.data?.EVM?.TokenHolders?.[0]?.uniq || 0;

  // Store in cache
  cache.set("totalHolders", totalHolders);

  return totalHolders;
}

export async function GET() {
  try {
    const [holdersData, tokenData, totalHoldersCount] = await Promise.all([
      fetchHoldersData(),
      fetchTokenPrice(),
      fetchTotalHolders(),
    ]);

    // Get the most recent price from the main pair
    const currentPrice = Number(tokenData.mainPair?.priceUsd || 0);

    const holders =
      holdersData.data?.EVM?.TokenHolders?.map((holder) => ({
        address: holder.Holder.Address,
        value: holder.Balance.Amount,
        percentage: (Number(holder.Balance.Amount) / MAX_SUPPLY) * 100,
        usdValue: Number(holder.Balance.Amount) * currentPrice, // Use the current price
      })) || [];

    return NextResponse.json({
      holders,
      totalSupply: MAX_SUPPLY,
      totalHolders: totalHoldersCount,
      tokenPrice: currentPrice, // Use the same price consistently
      dexData: {
        mainPair: {
          ...tokenData.mainPair,
          priceUsd: currentPrice, // Ensure price is set here too
          info: {
            imageUrl: tokenData.mainPair.info?.imageUrl || "",
            socials: [
              { type: "website", url: tokenData.mainPair.url || "" },
              {
                type: "twitter",
                url: tokenData.mainPair.baseToken?.twitter
                  ? `https://twitter.com/${tokenData.mainPair.baseToken.twitter}`
                  : "",
              },
            ],
          },
        },
      },
    });
  } catch (error) {
    console.error("Error in GET route:", error);
    return NextResponse.json(
      { error: "Failed to fetch holders data", details: error.message },
      { status: 500 }
    );
  }
}

// import { NextResponse } from "next/server";

// const CONTRACT_ADDRESS = "0x5C85D6C6825aB4032337F11Ee92a72DF936b46F6";
// const MAX_SUPPLY = 1_000_000_000;

// async function fetchHoldersData() {
//   const query = `
//     {
//       EVM(dataset: archive, network: bsc) {
//         TokenHolders(
//           date: "2025-03-23"
//           tokenSmartContract: "0x5C85D6C6825aB4032337F11Ee92a72DF936b46F6"
//           limit: { count: 500 }
//           orderBy: { descending: Balance_Amount }
//         ) {
//           Holder {
//             Address
//           }
//           Balance {
//             Amount
//           }
//         }
//       }
//     }
//   `;

//   const response = await fetch("https://streaming.bitquery.io/graphql", {
//     method: "POST",
//     headers: {
//       "Content-Type": "application/json",
//       Authorization: `Bearer ory_at_iHWFlxpooDvH88bLKM7xjqT1pSIEPZhUEy6jZEd_PSM.gX-NqqbX2TM_TomIfEjszRu5wToC9G252ecltPdUvuM`,
//     },
//     body: JSON.stringify({ query }),
//     next: { revalidate: 360 }, // Cache for 5 minutes
//   });

//   return response.json();
// }

// async function fetchTokenPrice() {
//   try {
//     const response = await fetch(
//       `https://api.dexscreener.com/latest/dex/tokens/${CONTRACT_ADDRESS}`,
//       { next: { revalidate: 60 } } // Cache for 5 hours
//     );

//     if (!response.ok) {
//       throw new Error(`DexScreener API error: ${response.status}`);
//     }

//     const data = await response.json();

//     if (!data?.pairs?.length) {
//       throw new Error("No pairs found for token");
//     }

//     // Sort pairs by liquidity
//     const sortedPairs = data.pairs.sort(
//       (a, b) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0)
//     );

//     // Calculate combined stats
//     const combinedStats = sortedPairs.reduce(
//       (acc, pair) => ({
//         volume24h: (acc.volume24h || 0) + (pair.volume?.h24 || 0),
//         liquidity: (acc.liquidity || 0) + (pair.liquidity?.usd || 0),
//         txns24h: {
//           buys: (acc.txns24h?.buys || 0) + (pair.txns?.h24?.buys || 0),
//           sells: (acc.txns24h?.sells || 0) + (pair.txns?.h24?.sells || 0),
//         },
//       }),
//       {}
//     );

//     const mainPair = sortedPairs[0];

//     return {
//       pairs: sortedPairs,
//       mainPair: {
//         ...mainPair,
//         info: {
//           imageUrl:
//             mainPair.baseToken.logoURI ||
//             `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/smartchain/assets/${CONTRACT_ADDRESS}/logo.png`,
//           socials: [
//             { type: "website", url: mainPair.url || "" },
//             {
//               type: "twitter",
//               url: `https://twitter.com/${mainPair.baseToken.twitter || ""}`,
//             },
//           ].filter((social) => social.url),
//         },
//         combinedStats,
//       },
//       priceUsd: Number(mainPair.priceUsd || 0),
//     };
//   } catch (error) {
//     console.error("Error fetching token price:", error);
//     return {
//       pairs: [],
//       mainPair: {
//         info: { imageUrl: "", socials: [] },
//         baseToken: { name: "", symbol: "" },
//         priceChange: { h24: 0, h1: 0 },
//         liquidity: { usd: 0 },
//         volume: { h24: 0 },
//         txns: { h24: { buys: 0, sells: 0 } },
//         combinedStats: {
//           volume24h: 0,
//           liquidity: 0,
//           txns24h: { buys: 0, sells: 0 },
//         },
//       },
//       priceUsd: 0,
//     };
//   }
// }

// async function fetchTotalHolders() {
//   const query = `{
//     EVM(dataset: archive, network: bsc) {
//       TokenHolders(
//         date: "2025-03-23"
//         tokenSmartContract: "0x5C85D6C6825aB4032337F11Ee92a72DF936b46F6"
//         where: { Balance: { Amount: { gt: "0" } } }
//       ) {
//         uniq(of: Holder_Address)
//       }
//     }
//   }`;

//   const response = await fetch("https://streaming.bitquery.io/graphql", {
//     method: "POST",
//     headers: {
//       "Content-Type": "application/json",
//       Authorization: `Bearer ory_at_iHWFlxpooDvH88bLKM7xjqT1pSIEPZhUEy6jZEd_PSM.gX-NqqbX2TM_TomIfEjszRu5wToC9G252ecltPdUvuM`,
//     },
//     body: JSON.stringify({ query }),
//     next: { revalidate: 18000 }, // Cache for 5 hours
//   });

//   const data = await response.json();
//   return data.data?.EVM?.TokenHolders?.[0]?.uniq || 0;
// }

// export async function GET() {
//   try {
//     const [holdersData, tokenData, totalHoldersCount] = await Promise.all([
//       fetchHoldersData(),
//       fetchTokenPrice(),
//       fetchTotalHolders(),
//     ]);

//     // Get the most recent price from the main pair
//     const currentPrice = Number(tokenData.mainPair?.priceUsd || 0);

//     const holders =
//       holdersData.data?.EVM?.TokenHolders?.map((holder) => ({
//         address: holder.Holder.Address,
//         value: holder.Balance.Amount,
//         percentage: (Number(holder.Balance.Amount) / MAX_SUPPLY) * 100,
//         usdValue: Number(holder.Balance.Amount) * currentPrice, // Use the current price
//       })) || [];

//     return NextResponse.json({
//       holders,
//       totalSupply: MAX_SUPPLY,
//       totalHolders: totalHoldersCount,
//       tokenPrice: currentPrice, // Use the same price consistently
//       dexData: {
//         mainPair: {
//           ...tokenData.mainPair,
//           priceUsd: currentPrice, // Ensure price is set here too
//           info: {
//             imageUrl: tokenData.mainPair.info?.imageUrl || "",
//             socials: [
//               { type: "website", url: tokenData.mainPair.url || "" },
//               {
//                 type: "twitter",
//                 url: tokenData.mainPair.baseToken?.twitter
//                   ? `https://twitter.com/${tokenData.mainPair.baseToken.twitter}`
//                   : "",
//               },
//             ],
//           },
//         },
//       },
//     });
//   } catch (error) {
//     console.error("Error in GET route:", error);
//     return NextResponse.json(
//       { error: "Failed to fetch holders data", details: error.message },
//       { status: 500 }
//     );
//   }
// }
