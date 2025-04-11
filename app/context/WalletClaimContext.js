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

  // Get Twitter username from session
  const username = session?.user?.name
    ? session.user.name.replace(/\s+/g, "").toLowerCase()
    : null;

  // Function to check wallet claim status
  const checkWalletClaim = useCallback(
    async (forceRefresh = false) => {
      if (!username) {
        return false;
      }

      // Prevent excessive refreshes within 2 seconds
      if (!forceRefresh && Date.now() - lastRefreshTime < 2000) {
        console.log("Skipping refresh - too soon since last check");
        return hasClaimedWallet;
      }

      setLastRefreshTime(Date.now());
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

        return cachedData.hasClaimed;
      }

      try {
        setIsCheckingClaim(true);
        console.log("Checking wallet claim for:", username);

        // Add a unique request ID to prevent duplicate calls
        const requestId = `${Date.now()}-${Math.random()
          .toString(36)
          .substring(2, 10)}`;

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

      // Update manually
      if (walletClaim) {
        setWalletClaim((prev) => ({
          ...prev,
          showProfile: newVisibility,
        }));

        // Update claim cache as well
        if (username) {
          const cacheKey = `claim_${username.toLowerCase()}`;
          if (claimCache.has(cacheKey)) {
            const cached = claimCache.get(cacheKey);
            const updatedClaim = {
              ...cached.claim,
              showProfile: newVisibility,
            };

            claimCache.set(cacheKey, {
              hasClaimed: true,
              claim: updatedClaim,
            });
          }
        }
      }

      // Invalidate the social data cache for this wallet
      if (result.success && walletAddr) {
        try {
          await fetch(`/api/holders?address=${walletAddr}`, {
            method: "PATCH",
          });
        } catch (invalidateError) {
          console.error("Error invalidating cache:", invalidateError);
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

      const { success, claim } = await response.json();

      if (success) {
        // Update state
        setHasClaimedWallet(true);
        setWalletClaim(claim);
        setShowProfile(claim.showProfile !== false);

        // Save in session storage for persistence across page reloads
        if (typeof window !== "undefined") {
          sessionStorage.setItem(
            `walletClaim_${username}`,
            JSON.stringify({
              hasClaimed: true,
              claim,
              timestamp: Date.now(),
            })
          );
        }

        // Update caches
        const cacheKey = `claim_${username.toLowerCase()}`;
        claimCache.set(cacheKey, {
          hasClaimed: true,
          claim,
        });

        if (claim?.walletAddress) {
          visibilityCache.set(`visibility_${claim.walletAddress}`, {
            showProfile: claim.showProfile !== false,
            lastUpdated: Date.now(),
          });
        }

        // Invalidate server cache
        try {
          fetch(`/api/check-wallet-claim?username=${username}`, {
            method: "PATCH",
          }).catch(() => {}); // Ignore errors from cache invalidation

          // Also refresh the holders data to update leaderboard
          fetch("/api/holders?refresh=true", {
            cache: "no-store",
            headers: { "x-force-refresh": "true" },
          }).catch(() => {}); // Ignore errors from cache invalidation
        } catch (cacheError) {
          // Just log but don't prevent success
          console.warn("Cache invalidation error:", cacheError);
        }

        return { success: true, claim };
      } else {
        throw new Error("Failed to claim wallet");
      }
    } catch (error) {
      console.error("Error claiming wallet:", error);
      return { success: false, error: error.message };
    } finally {
      setIsClaiming(false);
    }
  }, [isConnected, address, username]);

  // Check holder position function
  const checkHolderPosition = useCallback(
    async (forceRefresh = false) => {
      if (!address) return null;

      try {
        // First check session storage for recently fetched data
        if (!forceRefresh && typeof window !== "undefined") {
          const cachedData = sessionStorage.getItem(
            `holderData_${address.toLowerCase()}`
          );
          if (cachedData) {
            try {
              const parsed = JSON.parse(cachedData);
              if (Date.now() - parsed.timestamp < 300000) {
                // 5 minutes
                setUserHolderData(parsed.data);
                setUserHolderIndex(parsed.index);
                return parsed.data;
              }
            } catch (e) {
              console.error("Error parsing cached holder data:", e);
            }
          }
        }

        const response = await fetch(
          `/api/holder-data?address=${address.toLowerCase()}`
        );

        if (!response.ok) {
          throw new Error("Failed to fetch holder data");
        }

        const result = await response.json();

        if (result.success) {
          setUserHolderData(result.holderData);
          setUserHolderIndex(result.holderIndex);

          // Cache the result in session storage
          if (typeof window !== "undefined") {
            sessionStorage.setItem(
              `holderData_${address.toLowerCase()}`,
              JSON.stringify({
                data: result.holderData,
                index: result.holderIndex,
                timestamp: Date.now(),
              })
            );
          }

          return result.holderData;
        }

        return null;
      } catch (error) {
        console.error("Error checking holder position:", error);
        return null;
      }
    },
    [address]
  );

  // Initial check when session or address changes
  useEffect(() => {
    if (session && username && !isCheckingClaim) {
      // Add a slight delay to avoid race conditions and duplicate calls
      const timer = setTimeout(() => {
        checkWalletClaim(false).catch(console.error);
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [session, username, checkWalletClaim, isCheckingClaim]);

  // Check if user is in holders list when wallet is connected
  useEffect(() => {
    if (isConnected && address && hasClaimedWallet) {
      // Add a delay to avoid too many requests
      const timer = setTimeout(() => {
        checkHolderPosition().catch(console.error);
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [isConnected, address, hasClaimedWallet, checkHolderPosition]);

  // Load from session storage on initial render
  useEffect(() => {
    if (typeof window !== "undefined" && username) {
      const cachedClaim = sessionStorage.getItem(`walletClaim_${username}`);
      if (cachedClaim) {
        try {
          const parsedClaim = JSON.parse(cachedClaim);
          if (Date.now() - parsedClaim.timestamp < 300000) {
            // 5 minutes
            setHasClaimedWallet(parsedClaim.hasClaimed);
            setWalletClaim(parsedClaim.claim);
            if (parsedClaim.claim?.showProfile !== undefined) {
              setShowProfile(parsedClaim.claim.showProfile);
            }
          }
        } catch (e) {
          console.error("Error parsing session storage:", e);
        }
      }
    }
  }, [username]);

  return (
    <WalletClaimContext.Provider
      value={{
        hasClaimedWallet,
        walletClaim,
        isClaiming,
        isCheckingClaim,
        claimWallet,
        checkWalletClaim,
        userHolderData,
        userHolderIndex,
        checkHolderPosition,
        showProfile,
        toggleProfileVisibility,
        isToggling,
      }}
    >
      {children}
    </WalletClaimContext.Provider>
  );
};
