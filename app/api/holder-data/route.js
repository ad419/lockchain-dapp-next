import { NextResponse } from "next/server";
import { db } from "../../../app/lib/firebase-admin";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get("address");

    if (!address) {
      return NextResponse.json(
        {
          success: false,
          message: "Wallet address is required",
        },
        { status: 400 }
      );
    }

    console.log(`Looking up wallet address: ${address}`);

    // Fetch current holders data from DEX API
    const holdersResponse = await fetch(
      "https://api.dexscreener.com/latest/dex/tokens/0xbBe476B50D857BF41bBd1EB02F777CB9084C2e95",
      {
        next: { revalidate: 60 },
      }
    );

    let tokenPrice = 0;
    try {
      const holdersData = await holdersResponse.json();
      tokenPrice = holdersData?.pairs?.[0]?.priceUsd || 0;
      console.log(`Token price from API: ${tokenPrice}`);
    } catch (error) {
      console.error("Error parsing DEX data:", error);
    }

    // First, check if we have this wallet in walletClaims collection
    const walletClaimsSnapshot = await db
      .collection("walletClaims")
      .where("walletAddress", "==", address)
      .limit(1)
      .get();

    if (walletClaimsSnapshot.empty) {
      console.log(`No wallet claim found for address: ${address}`);

      // Try case-insensitive search
      const allWalletClaimsSnapshot = await db.collection("walletClaims").get();

      const matchingClaim = allWalletClaimsSnapshot.docs.find(
        (doc) =>
          doc.data().walletAddress.toLowerCase() === address.toLowerCase()
      );

      if (!matchingClaim) {
        console.log("No matching wallet claim found (case-insensitive)");
        return NextResponse.json(
          {
            success: false,
            message: "Wallet not found in claims",
            tokenPrice,
          },
          { status: 404 }
        );
      }

      console.log(
        `Found wallet claim with case-insensitive match: ${
          matchingClaim.data().walletAddress
        }`
      );
    }

    // Now get all token holders from the blockchain data
    // Your holders collection seems to be missing, so let's use mock data for now
    // Replace this with actual data once you've set up the holders collection

    // Mock data for demonstration - in production, retrieve from your database
    const mockHolders = [
      {
        address: address,
        balance: "10000000000000000000",
        balance_formatted: 10,
        percentage: 1,
        rank: 42,
        totalHolders: 500,
      },
    ];

    // Check if the holders collection exists
    try {
      const holdersRef = db.collection("holders");
      const holdersSnapshot = await holdersRef.limit(1).get();

      if (!holdersSnapshot.empty) {
        // Collection exists, get real data
        const fullHoldersSnapshot = await holdersRef
          .orderBy("balance", "desc")
          .get();

        const holders = fullHoldersSnapshot.docs.map((doc, index) => ({
          ...doc.data(),
          address: doc.id,
          rank: index + 1,
        }));

        // Find the holder with matching address
        const holder = holders.find(
          (h) => h.address.toLowerCase() === address.toLowerCase()
        );

        if (holder) {
          holder.usdValue = holder.balance_formatted * tokenPrice;
          holder.totalHolders = holders.length;

          console.log(
            `Found holder data for address: ${address}, rank: ${holder.rank}`
          );
          return NextResponse.json({
            success: true,
            data: holder,
            tokenPrice,
          });
        }
      }
    } catch (error) {
      console.error("Error checking holders collection:", error);
    }

    // Fallback to estimate holder data from wallet claims
    try {
      // Get the wallet claim again
      const walletClaimsSnapshot = await db
        .collection("walletClaims")
        .where("walletAddress", "==", address)
        .limit(1)
        .get();

      if (!walletClaimsSnapshot.empty) {
        const walletClaim = walletClaimsSnapshot.docs[0].data();

        // Get the user data
        const userDoc = await db
          .collection("users")
          .doc(walletClaim.userId)
          .get();

        if (userDoc.exists) {
          const userData = userDoc.data();

          // Create an estimated holder record
          const estimatedHolder = {
            address: address,
            balance_formatted: 0, // We don't know the balance
            percentage: 0,
            rank: 0, // We don't know the rank
            usdValue: 0,
            totalHolders: 0,
            firstSeen: walletClaim.claimedAt,
            lastSeen: walletClaim.claimedAt,
            social: {
              name: userData.name || null,
              twitter: userData.twitterUsername || null,
              profileImage: userData.image || null,
              showProfile: walletClaim.showProfile !== false,
            },
          };

          console.log(`Created estimated holder data for address: ${address}`);
          return NextResponse.json({
            success: true,
            data: estimatedHolder,
            tokenPrice,
            estimated: true,
          });
        }
      }
    } catch (error) {
      console.error("Error creating estimated holder data:", error);
    }

    // If we get here, we couldn't find or create holder data
    return NextResponse.json(
      {
        success: false,
        message: "Unable to fetch or create holder data",
        tokenPrice,
      },
      { status: 404 }
    );
  } catch (error) {
    console.error("Error in holder data API:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Internal server error: " + error.message,
      },
      { status: 500 }
    );
  }
}
