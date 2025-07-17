// utils/firebase.js - Enhanced error handling
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp,
  orderBy,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { ethers } from "ethers";

// Get user's claimed weeks from Firestore (wallet-based, no auth required)
export const getUserClaimedWeeks = async (userAddress) => {
  try {
    const claimsRef = collection(db, "airdrop_claims");
    const q = query(
      claimsRef,
      where("userAddress", "==", userAddress.toLowerCase()),
      orderBy("weekNumber")
    );
    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        week: data.weekNumber,
        amount: data.amount,
        txHash: data.txHash,
        claimedAt: data.claimedAt?.toDate?.()?.toISOString() || data.claimedAt,
      };
    });
  } catch (error) {
    console.error("Error fetching user claims:", error);
    return [];
  }
};

// Check for duplicate claims with better error handling
export const hasUserClaimedWeek = async (userAddress, weekNumber) => {
  try {
    const claimsRef = collection(db, "airdrop_claims");
    const q = query(
      claimsRef,
      where("userAddress", "==", userAddress.toLowerCase()),
      where("weekNumber", "==", weekNumber)
    );

    const snapshot = await getDocs(q);
    const hasClaimRecord = !snapshot.empty;

    if (hasClaimRecord) {
      console.log(`Week ${weekNumber} already claimed by ${userAddress}`);
    }

    return hasClaimRecord;
  } catch (error) {
    console.error("Error checking claim status:", error);
    // Return false if we can't check (fail-safe approach)
    return false;
  }
};

// Enhanced record claim with better validation
export const recordClaim = async (
  userAddress,
  weekNumber,
  amount,
  txHash,
  signature,
  timestamp
) => {
  try {
    // Double-check if already claimed before recording
    const alreadyClaimed = await hasUserClaimedWeek(userAddress, weekNumber);
    if (alreadyClaimed) {
      throw new Error(`Week ${weekNumber} already claimed`);
    }

    // Verify signature client-side first
    const message = `Claim Week ${weekNumber} - ${amount} LOCK tokens - ${timestamp}`;
    const recoveredAddress = ethers.verifyMessage(message, signature);

    if (recoveredAddress.toLowerCase() !== userAddress.toLowerCase()) {
      throw new Error("Invalid signature");
    }

    // Additional client-side validation
    if (!ethers.isAddress(userAddress)) {
      throw new Error("Invalid wallet address");
    }

    if (weekNumber < 1 || weekNumber > 52) {
      throw new Error("Invalid week number");
    }

    if (amount <= 0) {
      throw new Error("Invalid amount");
    }

    // Check timestamp is recent (within 5 minutes)
    const now = Date.now();
    if (Math.abs(now - timestamp) > 300000) {
      throw new Error("Timestamp too old or in future");
    }

    // Record the claim
    const claimData = {
      userAddress: userAddress.toLowerCase(),
      weekNumber: weekNumber,
      amount: amount,
      txHash: txHash,
      signature: signature,
      timestamp: timestamp,
      claimedAt: serverTimestamp(),
      verified: false, // Will be updated after blockchain verification
    };

    const claimsRef = collection(db, "airdrop_claims");
    const docRef = await addDoc(claimsRef, claimData);

    console.log(`Claim recorded for week ${weekNumber}:`, docRef.id);
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error("Error recording claim:", error);
    throw error;
  }
};
