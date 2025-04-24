"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { useSession } from "next-auth/react";
import { useAccount } from "wagmi";
import { mutate as mutateGlobal } from "swr";

import {
  doc,
  onSnapshot,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { db } from "../lib/firebase"; // Import the existing db instance

// Create context
const WalletClaimContext = createContext(null);

// Custom hook to use the wallet claim context
export const useWalletClaim = () => {
  const context = useContext(WalletClaimContext);
  if (!context) {
    throw new Error("useWalletClaim must be used within a WalletClaimProvider");
  }
  return context;
};

// Fix the localStore implementation
const localStore = {
  get: (key) => {
    if (typeof window === "undefined") return null;
    try {
      // IMPORTANT: Use consistent key structure
      const value = localStorage.getItem(`wc_${key}`);

      if (!value) return null;

      const parsedValue = JSON.parse(value);

      // Debug output to see exact structure
      if (key.includes("claim_")) {
        console.log("Reading from localStorage:", key, parsedValue);
      }

      return parsedValue;
    } catch (e) {
      console.error("Error reading from localStorage:", e);
      return null;
    }
  },
  set: (key, value) => {
    if (typeof window === "undefined") return;
    try {
      // IMPORTANT: Ensure hasClaimed is explicitly a boolean
      if (key.includes("claim_") && value) {
        value.hasClaimed = value.hasClaimed === true;

        // Debug output to verify structure
        console.log("Saving to localStorage:", key, value);
      }

      localStorage.setItem(`wc_${key}`, JSON.stringify(value));
    } catch (e) {
      console.error("Error writing to localStorage:", e);
    }
  },
  remove: (key) => {
    if (typeof window === "undefined") return;
    try {
      localStorage.removeItem(`wc_${key}`);
    } catch (e) {
      console.error("Error removing from localStorage:", e);
    }
  },
  clear: () => {
    if (typeof window === "undefined") return;
    try {
      // Only clear keys that start with wc_
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith("wc_")) {
          localStorage.removeItem(key);
        }
      });
    } catch (e) {
      console.error("Error clearing localStorage:", e);
    }
  },
};

export function WalletClaimProvider({ children }) {
  const { data: session } = useSession();
  const { address, isConnected } = useAccount();

  // Track previous session for cleanup
  const previousSessionRef = useRef(null);

  // States
  const [hasClaimedWallet, setHasClaimedWallet] = useState(false);
  const [walletClaim, setWalletClaim] = useState(null);
  const [isClaiming, setIsClaiming] = useState(false);
  const [isCheckingClaim, setIsCheckingClaim] = useState(false);
  const [userHolderData, setUserHolderData] = useState(null);
  const [userHolderIndex, setUserHolderIndex] = useState(null);
  const [showProfile, setShowProfile] = useState(true); // Default to true
  const [isToggling, setIsToggling] = useState(false);

  // Add holder position state
  const [holderPosition, setHolderPosition] = useState(null);
  const [isCheckingPosition, setIsCheckingPosition] = useState(false);

  // Ref for Firestore listener
  const unsubscribeRef = useRef(null);

  // Get Twitter username from session
  const username = session?.user?.username || session?.user?.name || null;

  // Setup Firestore listener for real-time updates
  const setupFirestoreListener = useCallback(
    (claimId) => {
      // Clean up existing listener
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }

      if (!claimId || typeof window === "undefined") return;

      try {
        console.log("Setting up real-time listener for claim:", claimId);

        // Use the imported db instance directly
        const unsubscribe = onSnapshot(
          doc(db, "walletClaims", claimId),
          (docSnapshot) => {
            if (docSnapshot.exists()) {
              const updatedData = docSnapshot.data();
              console.log("Real-time update received:", updatedData);

              // Update the local state
              setWalletClaim((prev) => ({
                ...prev,
                ...updatedData,
                id: docSnapshot.id,
              }));

              // Update visibility state specifically
              setShowProfile(updatedData.showProfile !== false);

              // Update localStorage
              const localData = localStore.get(`claim_${username}`);
              if (localData) {
                localStore.set(`claim_${username}`, {
                  ...localData,
                  claim: {
                    ...localData.claim,
                    ...updatedData,
                    id: docSnapshot.id,
                  },
                });
              }
            }
          },
          (error) => {
            console.error("Firestore listener error:", error);
          }
        );

        // Save the unsubscribe function
        unsubscribeRef.current = unsubscribe;
      } catch (error) {
        console.error("Error setting up Firestore listener:", error);
      }
    },
    [username]
  );

  // Function to check wallet claim status - optimized to use Redis cache
  const checkWalletClaim = useCallback(
    async (forceRefresh = false) => {
      if (!username) {
        return false;
      }

      // First check localStorage for fresh data (less than 5 minutes old)
      if (!forceRefresh) {
        const localData = localStore.get(`claim_${username}`);
        if (localData && localData.timestamp) {
          const freshThreshold = 5 * 60 * 1000; // 5 minutes
          if (Date.now() - localData.timestamp < freshThreshold) {
            console.log("Using fresh localStorage data for:", username);
            setHasClaimedWallet(localData.hasClaimed);
            setWalletClaim(localData.claim);
            setShowProfile(localData.claim?.showProfile !== false);

            // Set up listener if needed
            if (
              localData.hasClaimed &&
              localData.claim?.id &&
              !unsubscribeRef.current
            ) {
              setupFirestoreListener(localData.claim.id);
            }

            return localData.hasClaimed;
          }
        }
      }

      try {
        setIsCheckingClaim(true);
        console.log(
          `Checking wallet claim for: ${username} (force=${forceRefresh})`
        );

        // Use API with Redis caching layer
        const response = await fetch(
          `/api/check-wallet-claim?twitterUsername=${encodeURIComponent(
            username
          )}&refresh=${forceRefresh}`
        );

        if (!response.ok) {
          throw new Error("Failed to check wallet claim");
        }

        const data = await response.json();

        // Update state with the retrieved data
        setHasClaimedWallet(data.hasClaimed);
        setWalletClaim(data.claim);

        // Set visibility state
        if (data.claim) {
          setShowProfile(data.claim.showProfile !== false);
        }

        // Update localStorage with timestamp
        localStore.set(`claim_${username}`, {
          hasClaimed: data.hasClaimed,
          claim: data.claim,
          timestamp: Date.now(),
        });

        // Set up Firestore listener for the claimed wallet
        if (data.hasClaimed && data.claim?.id) {
          setupFirestoreListener(data.claim.id);
        }

        return data.hasClaimed;
      } catch (error) {
        console.error("Error checking wallet claim:", error);

        // Try to use stale localStorage data in case of error
        const localData = localStore.get(`claim_${username}`);
        if (localData) {
          setHasClaimedWallet(localData.hasClaimed);
          setWalletClaim(localData.claim);
          return localData.hasClaimed;
        }

        return false;
      } finally {
        setIsCheckingClaim(false);
      }
    },
    [username, setupFirestoreListener]
  );

  // Function to check holder position
  const checkHolderPosition = useCallback(
    async (forceRefresh = false) => {
      if (!isConnected || !address) {
        console.log("Cannot check position: No wallet connected");
        return null;
      }

      // First check localStorage unless forced refresh
      if (!forceRefresh) {
        const localData = localStore.get(`position_${address.toLowerCase()}`);
        if (localData && localData.timestamp) {
          const freshThreshold = 5 * 60 * 1000; // 5 minutes
          if (Date.now() - localData.timestamp < freshThreshold) {
            console.log("Using fresh localStorage position data");
            setHolderPosition(localData.position);
            setUserHolderData(localData.position?.data || null);
            setUserHolderIndex(
              localData.position?.rank ? localData.position.rank - 1 : null
            );
            return localData.position;
          }
        }
      }

      try {
        setIsCheckingPosition(true);
        console.log(
          `Checking holder position for: ${address} (force=${forceRefresh})`
        );

        // Fetch from API with Redis caching
        const response = await fetch(
          `/api/check-holder-position?wallet=${address.toLowerCase()}&refresh=${forceRefresh}`
        );

        if (!response.ok) {
          const error = await response.json();
          console.error("Error response from check-holder-position:", error);
          throw new Error(error.error || "Failed to check holder position");
        }

        const data = await response.json();
        console.log("Received holder position data:", data);

        if (!data || !data.position) {
          console.warn("Invalid position data received");
          return null;
        }

        // Update position in state
        setHolderPosition(data.position);
        setUserHolderData(data.position.data || null);
        setUserHolderIndex(data.position.rank ? data.position.rank - 1 : null);

        // Save to localStorage
        localStore.set(`position_${address.toLowerCase()}`, {
          position: data.position,
          timestamp: Date.now(),
        });

        return data.position;
      } catch (error) {
        console.error("Error checking holder position:", error);
        return null;
      } finally {
        setIsCheckingPosition(false);
      }
    },
    [isConnected, address]
  );

  // Fix the claimWallet function to properly update localStorage
  const claimWallet = useCallback(async () => {
    if (!isConnected || !address || !username) {
      return {
        success: false,
        error: "Wallet not connected or user not logged in",
      };
    }

    try {
      setIsClaiming(true);

      // Make the API request
      const response = await fetch("/api/claim-wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress: address,
          twitterUsername: username,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to claim wallet");
      }

      const data = await response.json();

      if (data.success) {
        console.log("🎉 Claim successful, updating state...");

        // Update state with actual data
        setHasClaimedWallet(true);
        setWalletClaim(data.claim);
        setShowProfile(true);

        // IMPORTANT: Save to localStorage with correct structure
        const storageData = {
          hasClaimed: true,
          claim: data.claim,
          timestamp: Date.now(),
        };

        console.log("📝 Saving claim data to localStorage:", storageData);
        localStore.set(`claim_${username}`, storageData);

        // Verify it was saved correctly
        const verifyStorage = localStore.get(`claim_${username}`);
        console.log("✅ Verification - localStorage contains:", verifyStorage);

        // Set up Firestore listener for real-time updates
        if (data.claim && data.claim.id) {
          setupFirestoreListener(data.claim.id);
        }

        // Rest of the function...
      }

      return data;
    } catch (error) {
      console.error("Error claiming wallet:", error);
      return {
        success: false,
        error: error.message || "Failed to claim wallet",
      };
    } finally {
      setIsClaiming(false);
    }
  }, [isConnected, address, username, setupFirestoreListener]);

  // Toggle profile visibility
  const toggleProfileVisibility = useCallback(
    async (forcedState = null) => {
      if (!walletClaim || !walletClaim.walletAddress) {
        return { success: false, error: "No wallet claimed" };
      }

      try {
        setIsToggling(true);

        // Use forced state or toggle current state
        const newVisibility = forcedState !== null ? forcedState : !showProfile;

        // Update UI immediately (optimistic)
        setShowProfile(newVisibility);

        // Make the API call
        const response = await fetch("/api/profile-visibility", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            address: walletClaim.walletAddress,
            showProfile: newVisibility,
            updateRedis: true,
          }),
        });

        if (!response.ok) {
          // Revert on failure
          setShowProfile(!newVisibility);
          throw new Error("Failed to update profile visibility");
        }

        // Update local state
        setWalletClaim((prev) => ({
          ...prev,
          showProfile: newVisibility,
        }));

        // Update localStorage
        const localData = localStore.get(`claim_${username}`);
        if (localData) {
          localStore.set(`claim_${username}`, {
            ...localData,
            claim: { ...localData.claim, showProfile: newVisibility },
          });
        }

        // Refresh Redis-cached leaderboard data
        await fetch("/api/holders?refresh=true", {
          method: "GET",
          headers: { "x-force-refresh": "true" },
        });

        // Also force SWR to revalidate
        mutateGlobal("/api/holders");

        return { success: true, showProfile: newVisibility };
      } catch (error) {
        console.error("Error toggling profile visibility:", error);
        return {
          success: false,
          error: error.message || "Failed to update visibility",
        };
      } finally {
        setIsToggling(false);
      }
    },
    [walletClaim, showProfile, username]
  );

  // Batch check multiple wallet addresses
  const batchCheckWalletClaims = async (addresses) => {
    if (!addresses || addresses.length === 0) return new Map();

    // Create a map for results
    const results = new Map();
    const normalizedAddresses = addresses.map((addr) => addr.toLowerCase());

    try {
      // Check API with Redis caching
      const response = await fetch("/api/batch-check-wallets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ addresses: normalizedAddresses }),
      });

      if (!response.ok) {
        throw new Error("Failed to batch check wallets");
      }

      const data = await response.json();

      // Process results
      if (data.claims) {
        for (const [address, claim] of Object.entries(data.claims)) {
          results.set(address.toLowerCase(), {
            hasClaimed: !!claim,
            claim: claim || null,
          });
        }
      }

      return results;
    } catch (error) {
      console.error("Error in batch check wallet claims:", error);

      // Fallback: check directly against Firestore in batches
      try {
        const chunkSize = 10;
        for (let i = 0; i < normalizedAddresses.length; i += chunkSize) {
          const chunk = normalizedAddresses.slice(i, i + chunkSize);
          const walletsRef = collection(db, "walletClaims");
          const q = query(walletsRef, where("walletAddress", "in", chunk));
          const walletsSnapshot = await getDocs(q);

          // Add results from Firestore
          walletsSnapshot.forEach((doc) => {
            const data = doc.data();
            const walletAddr = data.walletAddress.toLowerCase();
            results.set(walletAddr, {
              hasClaimed: true,
              claim: { id: doc.id, ...data },
            });
          });

          // Set empty results for addresses not found
          chunk.forEach((addr) => {
            if (!results.has(addr)) {
              results.set(addr, { hasClaimed: false, claim: null });
            }
          });
        }
      } catch (fbError) {
        console.error("Firestore fallback error:", fbError);
      }

      return results;
    }
  };

  // Clear all local data
  const clearLocalData = useCallback(() => {
    console.log("🧹 Clearing local wallet claim data");

    // Clear localStorage
    localStore.clear();

    // Clear in-memory state
    setHasClaimedWallet(false);
    setWalletClaim(null);
    setUserHolderData(null);
    setUserHolderIndex(null);
    setHolderPosition(null);

    // For backward compatibility
    return true;
  }, []);

  // Clear Redis cache
  const clearRedisCache = useCallback(async () => {
    if (!session) return;

    try {
      console.log("Clearing Redis cache");

      // Make API call to clear Redis cache
      const response = await fetch(`/api/clear-cache`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "user",
          username: username,
        }),
      });

      if (!response.ok) {
        console.warn("Failed to clear Redis cache:", await response.text());
      } else {
        console.log("Redis cache cleared successfully");
      }
    } catch (error) {
      console.error("Error clearing Redis cache:", error);
    }
  }, [session, username]);

  // For backward compatibility
  const clearCache = useCallback(() => {
    clearLocalData();
    return true;
  }, [clearLocalData]);

  // Clean up listener when component unmounts
  useEffect(() => {
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, []);

  // ONE-TIME check on initial mount or session change
  useEffect(() => {
    const checkOnSessionChange = async () => {
      // 1. On login (we have a session)
      if (session?.user?.id && username) {
        // Check if we have fresh data already
        const localData = localStore.get(`claim_${username}`);
        const now = Date.now();
        const CACHE_TIME = 15 * 60 * 1000; // 15 minutes

        // Only check if we don't have fresh data
        if (
          !localData ||
          !localData.timestamp ||
          now - localData.timestamp > CACHE_TIME
        ) {
          console.log("No fresh data found - checking claim status");
          await checkWalletClaim();
        } else {
          console.log("Using cached data on session change");
          // Use the cached data directly
          setHasClaimedWallet(localData.hasClaimed);
          setWalletClaim(localData.claim);
          setShowProfile(localData.claim?.showProfile !== false);

          // Set up listener if needed
          if (
            localData.hasClaimed &&
            localData.claim?.id &&
            !unsubscribeRef.current
          ) {
            setupFirestoreListener(localData.claim.id);
          }
        }

        // Also check position if wallet is connected
        if (isConnected && address) {
          checkHolderPosition();
        }
      }
      // 2. On logout (session ended)
      else if (!session && previousSessionRef.current) {
        console.log("Session ended - clearing data");
        clearLocalData();

        // Clean up listener
        if (unsubscribeRef.current) {
          unsubscribeRef.current();
          unsubscribeRef.current = null;
        }
      }

      // Update reference
      previousSessionRef.current = session;
    };

    checkOnSessionChange();
  }, [
    session?.user?.id,
    username,
    isConnected,
    address,
    checkWalletClaim,
    checkHolderPosition,
    clearLocalData,
    setupFirestoreListener,
  ]);

  // Add a one-time debugging helper function
  const debugCheckClaimStatus = useCallback(() => {
    console.log("🔍 DEBUG: Current claim status:", {
      username,
      hasClaimedWallet,
      walletClaim,
    });

    // Check localStorage directly
    if (username) {
      try {
        // Check using BOTH key patterns to debug
        const data1 = localStorage.getItem(`wc_claim_${username}`);
        const data2 = localStorage.getItem(`claim_${username}`);

        console.log(
          "🗄️ localStorage using wc_claim_ prefix:",
          data1 ? JSON.parse(data1) : null
        );
        console.log(
          "🗄️ localStorage using claim_ directly:",
          data2 ? JSON.parse(data2) : null
        );

        // Check context's get method
        const contextData = localStore.get(`claim_${username}`);
        console.log("🗄️ Using localStore.get:", contextData);
      } catch (e) {
        console.error("Error in debug check:", e);
      }
    }
  }, [username, hasClaimedWallet, walletClaim]);

  // Add this to your useEffect that runs on session change
  useEffect(() => {
    // Run debug check on component mount
    if (session?.user) {
      debugCheckClaimStatus();
    }
  }, [session?.user, debugCheckClaimStatus]);

  // Provide context values
  const value = {
    hasClaimedWallet,
    walletClaim,
    isClaiming,
    isCheckingClaim,
    isToggling,
    userHolderData,
    userHolderIndex,
    showProfile,
    holderPosition,
    isCheckingPosition,
    checkWalletClaim,
    claimWallet,
    checkHolderPosition,
    toggleProfileVisibility,
    batchCheckWalletClaims,
    clearCache,
    clearLocalData,
    clearRedisCache,
  };

  return (
    <WalletClaimContext.Provider value={value}>
      {children}
    </WalletClaimContext.Provider>
  );
}
