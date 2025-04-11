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

export const WalletClaimProvider = ({ children }) => {
  const { data: session } = useSession();
  const { address, isConnected } = useAccount();

  // Add a ref to track if initial check has been done
  const initialCheckDoneRef = useRef(false);

  // States
  const [hasClaimedWallet, setHasClaimedWallet] = useState(false);
  const [walletClaim, setWalletClaim] = useState(null);
  const [isClaiming, setIsClaiming] = useState(false);
  const [isCheckingClaim, setIsCheckingClaim] = useState(false);
  const [userHolderData, setUserHolderData] = useState(null);
  const [userHolderIndex, setUserHolderIndex] = useState(null);
  const [showProfile, setShowProfile] = useState(true); // Default to true
  const [isToggling, setIsToggling] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState(0);

  // Ref for Firestore listener
  const unsubscribeRef = useRef(null);

  // Get Twitter username from session
  const username = session?.user?.name
    ? session.user.name.replace(/\s+/g, "").toLowerCase()
    : null;

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
        // Import Firebase client-side only
        import("firebase/firestore").then(
          ({ getFirestore, doc, onSnapshot }) => {
            import("firebase/app").then(
              ({ initializeApp, getApps, getApp }) => {
                // Initialize Firebase if needed
                const firebaseConfig = {
                  apiKey: "AIzaSyBvdIVxvUb3uqpubOvkhPTdEro8aaqbKuI",
                  authDomain: "lockchain-tickets-3eb4d.firebaseapp.com",
                  projectId: "lockchain-tickets-3eb4d",
                  storageBucket: "lockchain-tickets-3eb4d.firebasestorage.app",
                  messagingSenderId: "747664160474",
                  appId: "1:747664160474:web:202fea05b4ed105631d7e3",
                };

                const app = getApps().length
                  ? getApp()
                  : initializeApp(firebaseConfig);
                const firestore = getFirestore(app);

                console.log(
                  "Setting up real-time listener for claim:",
                  claimId
                );
                const unsubscribe = onSnapshot(
                  doc(firestore, "walletClaims", claimId),
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
              }
            );
          }
        );
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

      // Skip additional checks if not forced and we checked recently
      if (!forceRefresh && Date.now() - lastRefreshTime < 10000) {
        console.log("Skipping refresh - too soon since last check");
        return hasClaimedWallet;
      }

      // Update timestamp before the request
      setLastRefreshTime(Date.now());

      try {
        setIsCheckingClaim(true);

        // Generate a unique request ID to prevent duplicate calls
        const requestId = `${Date.now()}-${Math.random()
          .toString(36)
          .substring(2, 10)}`;

        // Get cached session storage value first
        const cachedValue =
          typeof window !== "undefined"
            ? sessionStorage.getItem(`walletClaim_${username}`)
            : null;

        if (!forceRefresh && cachedValue) {
          try {
            const parsedCache = JSON.parse(cachedValue);
            const cacheAge = Date.now() - parsedCache.timestamp;

            // Use cache if less than 5 minutes old
            if (cacheAge < 300000) {
              console.log(`Using session storage cache for ${username}`);
              setHasClaimedWallet(parsedCache.hasClaimed);
              setWalletClaim(parsedCache.claim);
              if (parsedCache.claim) {
                setShowProfile(parsedCache.claim.showProfile !== false);
              }
              return parsedCache.hasClaimed;
            }
          } catch (e) {
            console.error("Error parsing cached wallet claim:", e);
          }
        }

        console.log(`Making API request for wallet claim: ${username}`);
        const response = await fetch(
          `/api/check-wallet-claim?twitterUsername=${encodeURIComponent(
            username
          )}&cacheBuster=${Date.now()}`,
          {
            headers: {
              "x-request-id": requestId,
            },
            cache: "no-store",
          }
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

        // Save in session storage
        if (typeof window !== "undefined") {
          sessionStorage.setItem(
            `walletClaim_${username}`,
            JSON.stringify({
              hasClaimed: data.hasClaimed,
              claim: data.claim,
              timestamp: Date.now(),
            })
          );
        }

        return data.hasClaimed;
      } catch (error) {
        console.error("Error checking wallet claim:", error);
        return hasClaimedWallet;
      } finally {
        setIsCheckingClaim(false);
      }
    },
    [username, hasClaimedWallet, lastRefreshTime]
  );

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

  // Function to claim wallet
  const claimWallet = useCallback(async () => {
    if (!isConnected || !address || !username) {
      return {
        success: false,
        error: "Wallet not connected or user not logged in",
      };
    }

    try {
      setIsClaiming(true);

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
        setHasClaimedWallet(true);
        setWalletClaim(data.claim);
        setShowProfile(true); // Default to visible

        // Update cache
        const cacheKey = `claim_${username.toLowerCase()}`;
        claimCache.set(cacheKey, {
          hasClaimed: true,
          claim: data.claim,
        });

        // Update visibility cache
        if (data.claim?.walletAddress) {
          visibilityCache.set(`visibility_${data.claim.walletAddress}`, {
            showProfile: true,
            lastUpdated: Date.now(),
          });
        }

        // Set up Firestore listener for the newly claimed wallet
        if (data.claim && data.claim.id) {
          setupFirestoreListener(data.claim.id);
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
  }, [isConnected, address, username, setupFirestoreListener]);

  // Function to check holder position
  const checkHolderPosition = useCallback(
    (holders) => {
      if (!walletClaim?.walletAddress || !holders?.length) {
        setUserHolderData(null);
        setUserHolderIndex(null);
        return null;
      }

      try {
        const holderIndex = holders.findIndex(
          (holder) =>
            holder.address.toLowerCase() ===
            walletClaim.walletAddress.toLowerCase()
        );

        if (holderIndex !== -1) {
          const holderData = {
            ...holders[holderIndex],
            rank: holderIndex + 1,
          };

          setUserHolderData(holderData);
          setUserHolderIndex(holderIndex);

          return holderData;
        }

        setUserHolderData(null);
        setUserHolderIndex(null);
        return null;
      } catch (error) {
        console.error("Error checking holder position:", error);
        setUserHolderData(null);
        setUserHolderIndex(null);
        return null;
      }
    },
    [walletClaim]
  );

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

      // Batch into chunks of 10
      const chunkSize = 10;
      for (let i = 0; i < uncachedAddresses.length; i += chunkSize) {
        const chunk = uncachedAddresses.slice(i, i + chunkSize);

        // Create Firestore query with 'in' operator
        const walletsSnapshot = await db
          .collection("walletClaims")
          .where("walletAddress", "in", chunk)
          .get();

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

  // Clean up listener when component unmounts
  useEffect(() => {
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, []);

  // Check initial claim status only once when session changes
  useEffect(() => {
    if (session && username && !initialCheckDoneRef.current) {
      initialCheckDoneRef.current = true;
      checkWalletClaim(false);
    }
  }, [session, username]);

  // Reset the initialCheck flag when session changes
  useEffect(() => {
    initialCheckDoneRef.current = false;
  }, [session?.user?.id]);

  // Check claim status when session changes
  useEffect(() => {
    if (session && username) {
      checkWalletClaim();
    } else {
      // Reset states when logged out
      setHasClaimedWallet(false);
      setWalletClaim(null);
      setUserHolderData(null);
      setUserHolderIndex(null);
      setShowProfile(true);

      // Clean up any existing listener
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    }
  }, [session, username, checkWalletClaim]);

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
    checkWalletClaim,
    claimWallet,
    checkHolderPosition,
    toggleProfileVisibility,
    batchCheckWalletClaims,
    clearCache: () => {
      claimCache.clear();
      visibilityCache.clear();
    },
  };

  return (
    <WalletClaimContext.Provider value={value}>
      {children}
    </WalletClaimContext.Provider>
  );
};
