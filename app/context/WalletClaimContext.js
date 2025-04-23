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
import { LRUCache } from "lru-cache";
// Add this import at the top with your other imports
import { mutate as mutateGlobal } from "swr";

// Add these imports at the top of the file
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

// Cache with shorter TTL for visibility status
const visibilityCache = new LRUCache({
  max: 500,
  ttl: 60000, // 1 minute - shorter TTL for visibility changes
  updateAgeOnGet: true,
  allowStale: false, // Don't allow stale data for visibility
});

// Long-term cache for wallet claims
const claimCache = new LRUCache({
  max: 500,
  ttl: 1800000, // 30 minutes
  updateAgeOnGet: true,
  allowStale: true,
});

export function WalletClaimProvider({ children }) {
  const { data: session } = useSession();
  const { address, isConnected } = useAccount();

  // Add this line at the top level with other state variables
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

  // Add position cache
  const holderPositionCache = new LRUCache({
    max: 500,
    ttl: 60000, // 1 minute - refresh position data more frequently
    updateAgeOnGet: true,
    allowStale: true,
  });

  // Ref for Firestore listener
  const unsubscribeRef = useRef(null);

  // Get Twitter username from session
  const username = session?.user?.username || null;

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

              // Update the local state and cache immediately
              setWalletClaim((prev) => ({
                ...prev,
                ...updatedData,
                id: docSnapshot.id,
              }));

              // Update visibility state specifically
              setShowProfile(updatedData.showProfile !== false);

              // Update cache with fresh data
              if (username) {
                const cacheKey = `claim_${username.toLowerCase()}`;
                if (claimCache.has(cacheKey)) {
                  const cached = claimCache.get(cacheKey);
                  const updatedClaim = {
                    ...cached.claim,
                    ...updatedData,
                  };

                  claimCache.set(cacheKey, {
                    hasClaimed: true,
                    claim: updatedClaim,
                  });

                  // Special cache for visibility status with shorter TTL
                  visibilityCache.set(
                    `visibility_${updatedClaim.walletAddress}`,
                    {
                      showProfile: updatedData.showProfile !== false,
                      lastUpdated: Date.now(),
                    }
                  );
                }
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

  // Function to check wallet claim status
  const checkWalletClaim = useCallback(
    async (forceRefresh = false) => {
      if (!username) {
        return false;
      }

      const cacheKey = `claim_${username.toLowerCase()}`;

      // Return cached result unless forced refresh
      if (!forceRefresh && claimCache.has(cacheKey)) {
        console.log("Using cached wallet claim for:", username);
        const cachedData = claimCache.get(cacheKey);
        setHasClaimedWallet(cachedData.hasClaimed);
        setWalletClaim(cachedData.claim);

        // Set visibility from cached claim
        if (cachedData.claim?.walletAddress) {
          // Check visibility-specific cache first (more up-to-date)
          const visibilityCacheKey = `visibility_${cachedData.claim.walletAddress}`;
          if (visibilityCache.has(visibilityCacheKey)) {
            const visibilityData = visibilityCache.get(visibilityCacheKey);
            setShowProfile(visibilityData.showProfile);
          } else {
            setShowProfile(cachedData.claim.showProfile !== false);
          }
        }

        // Even with cached data, set up listener if we have a claim ID
        if (cachedData.claim?.id && !unsubscribeRef.current) {
          setupFirestoreListener(cachedData.claim.id);
        }

        return cachedData.hasClaimed;
      }

      try {
        setIsCheckingClaim(true);
        console.log("Checking wallet claim for:", username);

        const response = await fetch(
          `/api/check-wallet-claim?twitterUsername=${encodeURIComponent(
            username
          )}`
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

        // Update cache with structured data
        claimCache.set(cacheKey, {
          hasClaimed: data.hasClaimed,
          claim: data.claim,
        });

        // Also update visibility cache if we have a claim
        if (data.claim?.walletAddress) {
          visibilityCache.set(`visibility_${data.claim.walletAddress}`, {
            showProfile: data.claim.showProfile !== false,
            lastUpdated: Date.now(),
          });
        }

        // Set up Firestore listener for the claimed wallet
        if (data.hasClaimed && data.claim?.id) {
          setupFirestoreListener(data.claim.id);
        }

        return data.hasClaimed;
      } catch (error) {
        console.error("Error checking wallet claim:", error);

        // Try to use stale cache data in case of error
        if (claimCache.has(cacheKey, { allowStale: true })) {
          const staleData = claimCache.get(cacheKey, { allowStale: true });
          return staleData.hasClaimed;
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

      try {
        setIsCheckingPosition(true);

        // Use current position from cache if available and not forcing refresh
        const normalizedAddress = address.toLowerCase();
        if (!forceRefresh) {
          const cachedPosition = holderPositionCache.get(normalizedAddress);
          if (cachedPosition && Date.now() - cachedPosition.timestamp < 60000) {
            // Use cached data if less than 1 minute old
            console.log(
              "Using cached holder position:",
              cachedPosition.position
            );
            setHolderPosition(cachedPosition.position);
            setUserHolderData(cachedPosition.position?.data || null);
            setUserHolderIndex(
              cachedPosition.position?.rank
                ? cachedPosition.position.rank - 1
                : null
            );
            setIsCheckingPosition(false);
            return cachedPosition.position;
          }
        }

        console.log("Fetching fresh holder position for:", normalizedAddress);

        // Fetch fresh data from API
        const response = await fetch(
          `/api/check-holder-position?wallet=${normalizedAddress}`
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

        // Update position in state and cache
        setHolderPosition(data.position);

        // Also update the holder data and index for easier access
        setUserHolderData(data.position.data || null);
        setUserHolderIndex(data.position.rank ? data.position.rank - 1 : null);

        // Update cache
        holderPositionCache.set(normalizedAddress, {
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

  // Function to claim wallet - improved with optimistic updates
  const claimWallet = useCallback(async () => {
    if (!isConnected || !address || !username) {
      return {
        success: false,
        error: "Wallet not connected or user not logged in",
      };
    }

    try {
      setIsClaiming(true);

      // Optimistic UI update - immediately show claiming in progress
      setHasClaimedWallet(true);

      // Create temporary optimistic claim object
      const optimisticClaim = {
        walletAddress: address,
        twitterUsername: username,
        claimedAt: new Date().toISOString(),
        userId: session?.user?.id,
        showProfile: true,
        _isOptimistic: true, // Flag to identify this is optimistic data
      };

      setWalletClaim(optimisticClaim);

      // Update cache optimistically
      const cacheKey = `claim_${username.toLowerCase()}`;
      claimCache.set(cacheKey, {
        hasClaimed: true,
        claim: optimisticClaim,
      });

      // Now make the actual API request
      const response = await fetch("/api/claim-wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress: address,
          twitterUsername: username,
        }),
      });

      if (!response.ok) {
        // Revert optimistic updates if request failed
        setHasClaimedWallet(false);
        setWalletClaim(null);
        claimCache.delete(cacheKey);

        const error = await response.json();
        throw new Error(error.error || "Failed to claim wallet");
      }

      const data = await response.json();

      if (data.success) {
        // Update with actual server data (replacing optimistic data)
        setHasClaimedWallet(true);
        setWalletClaim(data.claim);
        setShowProfile(true);

        // Update cache with actual data
        claimCache.set(cacheKey, {
          hasClaimed: true,
          claim: data.claim,
        });

        // Update visibility cache
        visibilityCache.set(`visibility_${data.claim.walletAddress}`, {
          showProfile: true,
          lastUpdated: Date.now(),
        });

        // Set up Firestore listener for real-time updates
        if (data.claim && data.claim.id) {
          setupFirestoreListener(data.claim.id);
        }

        // Force refresh holder data to ensure we get our position
        checkHolderPosition(true);

        // Important: Also invalidate Redis cache after wallet claim
        try {
          // Make a background API call to invalidate Redis cache
          fetch(`/api/holders?refresh=true&invalidate=${address}`, {
            method: "GET",
            headers: { "x-internal-request": "true" },
          }).catch((err) => {
            // Non-blocking, just log errors
            console.warn("Cache invalidation error:", err);
          });
        } catch (error) {
          console.warn("Failed to invalidate cache:", error);
        }

        // Force refresh global leaderboard data
        try {
          // Non-blocking API call to refresh leaderboard
          fetch("/api/holders?refresh=true", {
            method: "GET",
            headers: { "x-force-refresh": "true" },
          }).catch((err) =>
            console.warn("Non-critical error refreshing leaderboard:", err)
          );

          // Also force SWR to revalidate if you're using useSWR in your components
          mutateGlobal("/api/holders");
        } catch (refreshError) {
          console.warn("Failed to refresh leaderboard:", refreshError);
        }
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
  }, [
    isConnected,
    address,
    username,
    setupFirestoreListener,
    session?.user?.id,
  ]);

  // Function to toggle profile visibility with optimistic updates
  const toggleProfileVisibility = useCallback(async () => {
    if (!walletClaim || !walletClaim.walletAddress) {
      return { success: false, error: "No wallet claimed" };
    }

    try {
      setIsToggling(true);

      // Optimistically update the UI immediately
      const newVisibility = !showProfile;
      setShowProfile(newVisibility);

      // Optimistically update the cache
      const walletAddr = walletClaim.walletAddress;
      visibilityCache.set(`visibility_${walletAddr}`, {
        showProfile: newVisibility,
        lastUpdated: Date.now(),
      });

      // Now make the API call
      const response = await fetch("/api/profile-visibility", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: walletClaim.walletAddress,
          showProfile: newVisibility,
        }),
      });

      if (!response.ok) {
        // Revert optimistic update on failure
        setShowProfile(!newVisibility);
        visibilityCache.set(`visibility_${walletAddr}`, {
          showProfile: !newVisibility,
          lastUpdated: Date.now(),
        });

        throw new Error("Failed to update profile visibility");
      }

      const result = await response.json();

      // Real-time updates should handle the state update,
      // but we'll update manually just in case
      if (walletClaim && walletClaim.id) {
        setWalletClaim((prev) => ({
          ...prev,
          showProfile: newVisibility,
        }));

        // Update claim cache as well
        if (username) {
          const cacheKey = `claim_${username.toLowerCase()}`;
          if (claimCache.has(cacheKey)) {
            const cached = claimCache.get(cacheKey);
            claimCache.set(cacheKey, {
              ...cached,
              claim: { ...cached.claim, showProfile: newVisibility },
            });
          }
        }
      }

      // Invalidate the social data cache for this wallet
      if (result.success && walletAddr) {
        try {
          // Request cache invalidation
          await fetch(`/api/holders?address=${walletAddr}`, {
            method: "PATCH",
          });
        } catch (invalidateError) {
          console.error("Error invalidating cache:", invalidateError);
          // Continue anyway since the main operation succeeded
        }
      }

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
  }, [walletClaim, showProfile, username]);

  // Add this function to batch check multiple addresses at once
  const batchCheckWalletClaims = async (addresses) => {
    if (!addresses || addresses.length === 0) return new Map();

    // Create a map for results
    const results = new Map();
    const normalizedAddresses = addresses.map((addr) => addr.toLowerCase());

    try {
      // Check cache first
      const uncachedAddresses = normalizedAddresses.filter((addr) => {
        const cacheKey = `claim_${addr}`;
        if (claimCache.has(cacheKey)) {
          results.set(addr, claimCache.get(cacheKey));
          return false;
        }
        return true;
      });

      if (uncachedAddresses.length === 0) {
        return results;
      }

      // Batch into chunks of 10 (Firestore limit for 'in' queries)
      const chunkSize = 10;
      for (let i = 0; i < uncachedAddresses.length; i += chunkSize) {
        const chunk = uncachedAddresses.slice(i, i + chunkSize);

        // Create Firestore query with 'in' operator
        const walletsRef = collection(db, "walletClaims");
        const q = query(walletsRef, where("walletAddress", "in", chunk));
        const walletsSnapshot = await getDocs(q);

        // Process results
        walletsSnapshot.forEach((doc) => {
          const data = doc.data();
          const walletAddr = data.walletAddress.toLowerCase();

          // Add to results
          results.set(walletAddr, {
            hasClaimed: true,
            claim: {
              id: doc.id,
              ...data,
            },
          });

          // Cache the result
          claimCache.set(`claim_${walletAddr}`, {
            hasClaimed: true,
            claim: {
              id: doc.id,
              ...data,
            },
          });
        });

        // Set empty results for addresses not found
        chunk.forEach((addr) => {
          if (!results.has(addr)) {
            results.set(addr, { hasClaimed: false, claim: null });
            claimCache.set(`claim_${addr}`, { hasClaimed: false, claim: null });
          }
        });
      }

      return results;
    } catch (error) {
      console.error("Error in batch check wallet claims:", error);
      return results;
    }
  };

  // Define clearCache function
  const clearCache = useCallback(() => {
    console.log("🧹 Clearing wallet claim caches");
    claimCache.clear();
    visibilityCache.clear();
    holderPositionCache.clear();

    // Also clear any in-memory state
    setHasClaimedWallet(false);
    setWalletClaim(null);
    setUserHolderData(null);
    setUserHolderIndex(null);
    setHolderPosition(null);
  }, []);

  // Add this function to your WalletClaimContext.js
  const clearRedisCache = useCallback(async () => {
    if (walletClaim?.walletAddress) {
      try {
        console.log(
          "Clearing Redis cache for wallet:",
          walletClaim.walletAddress
        );

        // Make API call to clear Redis cache for this specific wallet
        const response = await fetch(`/api/clear-cache`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            type: "social",
            walletAddress: walletClaim.walletAddress,
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
    }
  }, [walletClaim?.walletAddress]);

  // Clean up listener when component unmounts
  useEffect(() => {
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, []);

  // Check claim status when session changes
  useEffect(() => {
    if (session && username) {
      checkWalletClaim();
    } else {
      // Reset states when logged out
      clearCache(); // Add this line to use the clearCache function

      // No need for these since clearCache takes care of them
      // setHasClaimedWallet(false);
      // setWalletClaim(null);
      // setUserHolderData(null);
      // setUserHolderIndex(null);

      // Clean up any existing listener
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    }
  }, [session, username, checkWalletClaim, clearCache]); // Add clearCache to dependencies

  // Add this useEffect to clear cache when session changes from user to no user

  // Watch for session becoming null (user logged out)
  useEffect(() => {
    // No need to create useRef inside the effect
    // Just check and update the ref
    if (previousSessionRef.current && !session) {
      console.log("🔄 Session ended - clearing wallet claim cache");
      clearCache();
    }

    // Update the ref with current session value
    previousSessionRef.current = session;
  }, [session, clearCache]);

  // Add clearRedisCache to the cleanup process in your sign-out handling
  // Modify your sign-out effect
  useEffect(() => {
    // If previously had a session but now doesn't (signed out)
    if (previousSessionRef.current && !session) {
      console.log("🔄 Session ended - clearing all caches");

      // First clear the client-side cache
      clearCache();

      // Then clear the Redis cache
      clearRedisCache();
    }

    // Update the ref with current session value
    previousSessionRef.current = session;
  }, [session, clearCache, clearRedisCache]);

  // Add this effect to your WalletClaimProvider

  // Handle session changes
  useEffect(() => {
    // When session becomes available, check wallet claim
    if (session?.user?.id) {
      checkWalletClaim();
    } else {
      // Clear states when logged out
      setHasClaimedWallet(false);
      setWalletClaim(null);
      setUserHolderData(null);
      setUserHolderIndex(null);
      setHolderPosition(null);

      // Also clear caches
      claimCache.clear();
      visibilityCache.clear();
      holderPositionCache.clear();
    }
  }, [session?.user?.id]);

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
    clearRedisCache, // Add this line
  };

  return (
    <WalletClaimContext.Provider value={value}>
      {children}
    </WalletClaimContext.Provider>
  );
}
