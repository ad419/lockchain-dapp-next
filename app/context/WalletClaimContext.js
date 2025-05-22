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

// Add these at the top level with your other caches
const listenerTimestamps = new LRUCache({
  max: 500,
  ttl: 600000, // 10 minutes
});

const MAX_LISTENER_SETUPS = 3; // Maximum number of setups allowed in the cooldown period

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
  ttl: 3600000, // Increase to 60 minutes for stable data
  updateAgeOnGet: true,
  allowStale: true,

  // Add revalidation strategy
  fetchMethod: async (key) => {
    // Only trigger for claim keys
    if (!key.startsWith("claim_")) return null;

    const username = key.replace("claim_", "");
    // Perform background refresh without blocking UI
    setTimeout(() => refreshClaimInBackground(username), 0);
    return null; // Return null to use stale data while refreshing
  },
});

// Background refresh function
const refreshClaimInBackground = async (username) => {
  try {
    const response = await fetch(
      `/api/check-wallet-claim?twitterUsername=${encodeURIComponent(
        username
      )}&backgroundRefresh=true`
    );
    if (response.ok) {
      const data = await response.json();
      const cacheKey = `claim_${username.toLowerCase()}`;

      // Only update cache if data structure is valid
      if (data && typeof data.hasClaimed === "boolean") {
        claimCache.set(cacheKey, {
          hasClaimed: data.hasClaimed,
          claim: data.claim,
          lastRefreshed: Date.now(),
        });
      }
    }
  } catch (error) {
    // Silent failure for background refresh
    console.debug("Background refresh failed silently:", error);
  }
};

export function WalletClaimProvider({ children }) {
  const { data: session } = useSession();
  const { address, isConnected } = useAccount();

  // Add these at the top level with other refs
  const previousSessionRef = useRef(null);
  const prevClaimRef = useRef(null); // Moved from inside useEffect
  const lastCheckRef = useRef(0); // Moved from inside useEffect
  const checkThrottleRef = useRef({});
  const activeRequests = useRef(new Map());
  const unsubscribeRef = useRef(null);
  const activeListeners = useRef(new Map());
  const listenerAttempts = useRef(new Map());

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

  // Get Twitter username from session
  const username = session?.user?.username || null;

  // Better listener management function
  const setupFirestoreListener = useCallback((claimId) => {
    if (!claimId || typeof window === "undefined") return;

    // Check if we already have an active listener for this claim
    if (activeListeners.current.has(claimId)) {
      console.log(`Listener already active for claim: ${claimId}`);
      return;
    }

    // Check rate limiting
    const now = Date.now();
    const attempts = listenerAttempts.current.get(claimId) || [];

    // Cleanup old attempts (older than 10 minutes)
    const recentAttempts = attempts.filter((time) => now - time < 600000);

    // Check if too many recent attempts
    if (recentAttempts.length >= MAX_LISTENER_SETUPS) {
      console.log(`Rate limiting listener setup for claim: ${claimId}`);
      listenerAttempts.current.set(claimId, recentAttempts);
      return;
    }

    // Update attempts
    listenerAttempts.current.set(claimId, [...recentAttempts, now]);

    try {
      console.log(`Setting up listener for claim: ${claimId}`);

      // Use the imported db instance directly
      const unsubscribe = onSnapshot(
        doc(db, "walletClaims", claimId),
        { includeMetadataChanges: false }, // Only trigger on document data changes
        (docSnapshot) => {
          if (docSnapshot.exists()) {
            const updatedData = docSnapshot.data();
            console.log("Real-time update received:", updatedData);

            // Update state and cache with new data
            updateWalletClaimState(claimId, updatedData);
          }
        },
        (error) => {
          console.error("Firestore listener error:", error);
          // Clean up on error
          activeListeners.current.delete(claimId);
        }
      );

      // Save reference to unsubscribe function
      activeListeners.current.set(claimId, unsubscribe);
    } catch (error) {
      console.error("Error setting up Firestore listener:", error);
    }
  }, []);

  // Helper function to update state and cache
  const updateWalletClaimState = useCallback(
    (claimId, data) => {
      // Update wallet claim state
      setWalletClaim((prev) => ({
        ...prev,
        ...data,
        id: claimId,
      }));

      // Update visibility state
      setShowProfile(data.showProfile !== false);

      // Update cache if username is available
      if (username) {
        const cacheKey = `claim_${username.toLowerCase()}`;
        if (claimCache.has(cacheKey)) {
          const cached = claimCache.get(cacheKey);
          claimCache.set(cacheKey, {
            hasClaimed: true,
            claim: { ...cached.claim, ...data, id: claimId },
            lastUpdated: Date.now(),
          });
        }
      }

      // Update visibility cache
      if (data.walletAddress) {
        visibilityCache.set(`visibility_${data.walletAddress}`, {
          showProfile: data.showProfile !== false,
          lastUpdated: Date.now(),
        });
      }
    },
    [username]
  );

  // Add this helper function to the provider component
  const hasActiveListener = useCallback((claimId) => {
    return unsubscribeRef.current !== null;
  }, []);

  // Add a cleanup utility to avoid promise race conditions
  const cancelActiveRequest = (key) => {
    if (activeRequests.current.has(key)) {
      const controller = activeRequests.current.get(key);
      controller.abort();
      activeRequests.current.delete(key);
    }
  };

  // Update fetch calls to use AbortController
  const makeFetchRequest = async (url, options = {}) => {
    const key = url + JSON.stringify(options.body || {});

    // Cancel any existing request with the same key
    cancelActiveRequest(key);

    // Create new controller
    const controller = new AbortController();
    activeRequests.current.set(key, controller);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      // Request completed successfully, remove from active requests
      activeRequests.current.delete(key);
      return response;
    } catch (error) {
      if (error.name === "AbortError") {
        console.log("Request was aborted:", url);
      }
      throw error;
    }
  };

  // Clean up all pending requests on unmount
  useEffect(() => {
    return () => {
      // Cancel all active requests
      activeRequests.current.forEach((controller) => {
        controller.abort();
      });
      activeRequests.current.clear();
    };
  }, []);

  // Function to check wallet claim status
  const checkWalletClaim = useCallback(
    async (forceRefresh = false) => {
      if (!username) {
        return false;
      }

      const cacheKey = `claim_${username.toLowerCase()}`;

      // Throttle checks to avoid repeated calls
      const now = Date.now();
      const lastCheck = checkThrottleRef.current[cacheKey] || 0;
      const throttleDuration = 5000; // 5 seconds

      if (!forceRefresh && now - lastCheck < throttleDuration) {
        console.log(
          `Throttled check for ${username}, last checked ${
            now - lastCheck
          }ms ago`
        );

        // Return cached data since we're throttling
        if (claimCache.has(cacheKey)) {
          const cachedData = claimCache.get(cacheKey);
          return cachedData.hasClaimed;
        }
      }

      // Update last check timestamp
      checkThrottleRef.current[cacheKey] = now;

      // Use cached data whenever possible
      if (!forceRefresh && claimCache.has(cacheKey)) {
        console.log("Using cached wallet claim for:", username);
        const cachedData = claimCache.get(cacheKey);

        // Only apply cached data if it's valid
        if (cachedData && typeof cachedData.hasClaimed === "boolean") {
          setHasClaimedWallet(cachedData.hasClaimed);
          setWalletClaim(cachedData.claim);

          // Set visibility from data
          if (cachedData.claim?.walletAddress) {
            // Prefer more recent visibility cache
            const visibilityCacheKey = `visibility_${cachedData.claim.walletAddress}`;
            if (visibilityCache.has(visibilityCacheKey)) {
              setShowProfile(
                visibilityCache.get(visibilityCacheKey).showProfile
              );
            } else {
              setShowProfile(cachedData.claim.showProfile !== false);
            }
          }

          // Setup listener only if needed and if we aren't already listening
          if (
            cachedData.hasClaimed &&
            cachedData.claim?.id &&
            !activeListeners.current.has(cachedData.claim.id)
          ) {
            setupFirestoreListener(cachedData.claim.id);
          }

          return cachedData.hasClaimed;
        }
      }

      try {
        setIsCheckingClaim(true);

        // Make network request
        const response = await makeFetchRequest(
          `/api/check-wallet-claim?twitterUsername=${encodeURIComponent(
            username
          )}`
        );

        if (!response.ok) {
          throw new Error("Failed to check wallet claim");
        }

        const data = await response.json();
        setHasClaimedWallet(data.hasClaimed);
        setWalletClaim(data.claim);

        if (data.claim) {
          setShowProfile(data.claim.showProfile !== false);
        }

        // Update cache with new data
        claimCache.set(cacheKey, {
          hasClaimed: data.hasClaimed,
          claim: data.claim,
          lastUpdated: Date.now(),
        });

        // Update visibility cache
        if (data.claim?.walletAddress) {
          visibilityCache.set(`visibility_${data.claim.walletAddress}`, {
            showProfile: data.claim.showProfile !== false,
            lastUpdated: Date.now(),
          });
        }

        // Setup listener only if the user has claimed and we aren't already listening
        if (
          data.hasClaimed &&
          data.claim?.id &&
          !activeListeners.current.has(data.claim.id)
        ) {
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
        const response = await makeFetchRequest(
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

  // Add debounce utility
  const debounce = (fn, delay) => {
    let timer = null;
    return (...args) => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        fn(...args);
        timer = null;
      }, delay);
    };
  };

  // Debounced position checker
  const debouncedPositionCheck = useCallback(
    debounce((force) => {
      checkHolderPosition(force);
    }, 500),
    [checkHolderPosition]
  );

  // Use in your component
  const refreshHolderPosition = () => {
    debouncedPositionCheck(true);
  };

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
      const response = await makeFetchRequest("/api/claim-wallet", {
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

  // Updated toggleProfileVisibility function with forced state parameter
  const toggleProfileVisibility = useCallback(
    async (forcedState = null) => {
      if (!walletClaim || !walletClaim.walletAddress) {
        return { success: false, error: "No wallet claimed" };
      }

      try {
        setIsToggling(true);

        // Use forced state or toggle current state
        const newVisibility = forcedState !== null ? forcedState : !showProfile;

        // Optimistically update the UI immediately
        setShowProfile(newVisibility);

        // Optimistically update the cache
        const walletAddr = walletClaim.walletAddress;
        visibilityCache.set(`visibility_${walletAddr}`, {
          showProfile: newVisibility,
          lastUpdated: Date.now(),
        });

        // Now make the API call
        const response = await makeFetchRequest("/api/profile-visibility", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            address: walletClaim.walletAddress,
            showProfile: newVisibility,
            updateRedis: true, // Add this flag to update Redis directly
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

        // Force refresh the leaderboard data
        await makeFetchRequest("/api/holders?refresh=true", {
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

  // Improved batch check with smart cache prioritization
  const batchCheckWalletClaims = async (addresses) => {
    if (!addresses || addresses.length === 0) return new Map();

    // Create results map
    const results = new Map();
    const normalizedAddresses = addresses.map((addr) => addr.toLowerCase());

    // Track addresses that need Firestore queries
    let uncachedAddresses = [];

    // Check cache first and collect uncached addresses
    normalizedAddresses.forEach((addr) => {
      const cacheKey = `claim_${addr}`;
      if (claimCache.has(cacheKey)) {
        results.set(addr, claimCache.get(cacheKey));
      } else {
        uncachedAddresses.push(addr);
      }
    });

    if (uncachedAddresses.length === 0) {
      return results; // All results from cache
    }

    try {
      // Use a single Firestore query if possible
      if (uncachedAddresses.length <= 10) {
        await fetchClaimBatch(uncachedAddresses, results);
      } else {
        // Process in chunks of 10 for Firestore limits
        const chunks = [];
        for (let i = 0; i < uncachedAddresses.length; i += 10) {
          chunks.push(uncachedAddresses.slice(i, i + 10));
        }

        // Process chunks in parallel for efficiency, with limit
        await Promise.all(
          chunks.map((chunk) => fetchClaimBatch(chunk, results))
        );
      }

      return results;
    } catch (error) {
      console.error("Error in batch check wallet claims:", error);
      return results; // Return whatever we have
    }
  };

  // Helper for batch fetching
  const fetchClaimBatch = async (addresses, resultsMap) => {
    // Query Firestore
    const walletsRef = collection(db, "walletClaims");
    const q = query(walletsRef, where("walletAddress", "in", addresses));

    const walletsSnapshot = await getDocs(q);

    // Process results
    const foundAddresses = new Set();

    walletsSnapshot.forEach((doc) => {
      const data = doc.data();
      if (!data.walletAddress) return;

      const walletAddr = data.walletAddress.toLowerCase();
      foundAddresses.add(walletAddr);

      // Add to results map
      resultsMap.set(walletAddr, {
        hasClaimed: true,
        claim: { id: doc.id, ...data },
      });

      // Update cache
      claimCache.set(`claim_${walletAddr}`, {
        hasClaimed: true,
        claim: { id: doc.id, ...data },
        lastUpdated: Date.now(),
      });
    });

    // Set empty results for addresses not found
    addresses.forEach((addr) => {
      if (!foundAddresses.has(addr)) {
        resultsMap.set(addr, { hasClaimed: false, claim: null });
        claimCache.set(`claim_${addr}`, {
          hasClaimed: false,
          claim: null,
          lastUpdated: Date.now(),
        });
      }
    });
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
        const response = await makeFetchRequest(`/api/clear-cache`, {
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

  // Improved effect for session changes
  useEffect(() => {
    // Only run checks if both session and connection are available
    const shouldRun = username && isConnected;

    // Throttle checks on mount/reconnect
    const now = Date.now();
    const throttleTime = 10000; // 10 seconds between checks

    if (shouldRun && now - lastCheckRef.current > throttleTime) {
      lastCheckRef.current = now;

      // Check if claim status is already known
      if (walletClaim !== null && walletClaim === prevClaimRef.current) {
        // Skip redundant check, data hasn't changed
        console.log("Skipping redundant check, wallet claim data unchanged");
      } else {
        // Check claim status only when needed
        checkWalletClaim(false).then(() => {
          prevClaimRef.current = walletClaim;
        });
      }
    }
  }, [session, isConnected, username, checkWalletClaim, walletClaim]);

  // Network change detection with optimization
  useEffect(() => {
    // When connection or address changes, check holder position
    if (isConnected && address) {
      // For position data, we can be less aggressive with checks
      // Only check on address change or connection change
      checkHolderPosition(false);
    } else {
      // Reset position data when disconnected
      setHolderPosition(null);
      setUserHolderData(null);
      setUserHolderIndex(null);
    }
  }, [isConnected, address, checkHolderPosition]);

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
