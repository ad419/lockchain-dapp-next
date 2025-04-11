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
  const initialCheckTimerRef = useRef(null);

  // Add this state to track initial loading
  const [isInitialLoading, setIsInitialLoading] = useState(true);

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
        console.log("Cleaning up existing Firestore listener");
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }

      if (!claimId || typeof window === "undefined") return;

      try {
        // Add error tracking
        let retryCount = 0;
        const maxRetries = 3;
        let retryTimeout = null;

        const setupListener = () => {
          // Clear any existing timeout
          if (retryTimeout) {
            clearTimeout(retryTimeout);
            retryTimeout = null;
          }

          // Import Firebase client-side only
          Promise.all([import("firebase/firestore"), import("firebase/app")])
            .then(([firestore, firebase]) => {
              const { getFirestore, doc, onSnapshot } = firestore;
              const { initializeApp, getApps, getApp } = firebase;

              try {
                // Initialize Firebase if needed
                const firebaseConfig = {
                  apiKey: "AIzaSyBvdIVxvUb3uqpubOvkhPTdEro8aaqbKuI",
                  authDomain: "lockchain-tickets-3eb4d.firebaseapp.com",
                  projectId: "lockchain-tickets-3eb4d",
                  storageBucket: "lockchain-tickets-3eb4d.firebasestorage.app",
                  messagingSenderId: "747664160474",
                  appId: "1:747664160474:web:202fea05b4ed105631d7e3",
                };

                // Important: Check if Firebase is already initialized to avoid duplicate apps
                let app;
                try {
                  app = getApps().length
                    ? getApp()
                    : initializeApp(firebaseConfig);
                } catch (initError) {
                  console.error("Firebase initialization error:", initError);
                  app = getApps()[0] || initializeApp(firebaseConfig);
                }

                // Initialize Firestore with explicit settings
                const firestore = getFirestore(app);

                console.log(
                  `Setting up Firestore listener for claim: ${claimId} (attempt ${
                    retryCount + 1
                  }/${maxRetries})`
                );

                // Create document reference with explicit path
                const docRef = doc(firestore, "walletClaims", claimId);

                // Set up listener with error handling
                const unsubscribe = onSnapshot(
                  docRef,
                  (docSnapshot) => {
                    // Success path - reset retry count
                    retryCount = 0;

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

                      // Update session storage for persistence
                      if (username && typeof window !== "undefined") {
                        try {
                          const existingData = sessionStorage.getItem(
                            `walletClaim_${username}`
                          );
                          if (existingData) {
                            const parsed = JSON.parse(existingData);
                            sessionStorage.setItem(
                              `walletClaim_${username}`,
                              JSON.stringify({
                                ...parsed,
                                claim: {
                                  ...parsed.claim,
                                  ...updatedData,
                                },
                                timestamp: Date.now(),
                              })
                            );
                          }
                        } catch (storageErr) {
                          console.error(
                            "Session storage update error:",
                            storageErr
                          );
                        }
                      }
                    }
                  },
                  (error) => {
                    console.error(
                      `Firestore listener error (attempt ${
                        retryCount + 1
                      }/${maxRetries}):`,
                      error
                    );

                    // Clean up the failed listener
                    if (unsubscribeRef.current) {
                      unsubscribeRef.current();
                      unsubscribeRef.current = null;
                    }

                    // Retry logic with exponential backoff
                    if (retryCount < maxRetries) {
                      const backoffTime = Math.min(
                        1000 * Math.pow(2, retryCount),
                        10000
                      );
                      console.log(`Retrying in ${backoffTime}ms...`);

                      retryCount++;
                      retryTimeout = setTimeout(setupListener, backoffTime);
                    } else {
                      console.error(
                        `Max retry attempts (${maxRetries}) reached. Giving up on Firestore listener.`
                      );
                    }
                  }
                );

                // Save the unsubscribe function
                unsubscribeRef.current = unsubscribe;
              } catch (setupError) {
                console.error("Error in Firestore listener setup:", setupError);

                // Retry logic
                if (retryCount < maxRetries) {
                  const backoffTime = Math.min(
                    1000 * Math.pow(2, retryCount),
                    10000
                  );
                  console.log(`Setup error - retrying in ${backoffTime}ms...`);

                  retryCount++;
                  retryTimeout = setTimeout(setupListener, backoffTime);
                }
              }
            })
            .catch((importError) => {
              console.error("Error importing Firebase modules:", importError);
            });
        };

        // Initial setup
        setupListener();

        // Return a cleanup function that includes the timeout
        return () => {
          if (retryTimeout) {
            clearTimeout(retryTimeout);
          }
          if (unsubscribeRef.current) {
            unsubscribeRef.current();
            unsubscribeRef.current = null;
          }
        };
      } catch (error) {
        console.error("Top-level error setting up Firestore listener:", error);
      }
    },
    [username]
  );

  // Use session storage to maintain state across page refreshes
  useEffect(() => {
    if (typeof window !== "undefined") {
      // Check if we have cached claim data in sessionStorage
      const cachedWalletClaim = sessionStorage.getItem(
        `walletClaim_${username}`
      );

      if (cachedWalletClaim) {
        try {
          const parsedClaim = JSON.parse(cachedWalletClaim);
          if (parsedClaim && Date.now() - parsedClaim.timestamp < 300000) {
            // 5 minutes
            console.log("Using session storage cached wallet claim");
            setHasClaimedWallet(parsedClaim.hasClaimed);
            setWalletClaim(parsedClaim.claim);
            if (parsedClaim.claim) {
              setShowProfile(parsedClaim.claim.showProfile !== false);
            }
            // We still want to validate with the server but don't need to wait
            initialCheckDoneRef.current = true;
          }
        } catch (e) {
          console.error("Error parsing cached wallet claim:", e);
        }
      }
    }
  }, [username]);

  // Function to check wallet claim status with retry logic
  const checkWalletClaim = useCallback(
    async (forceRefresh = false) => {
      if (!username) {
        setIsInitialLoading(false);
        return false;
      }

      // Skip additional checks if not forced and we checked recently
      if (!forceRefresh && Date.now() - lastRefreshTime < 10000) {
        console.log("Skipping refresh - too soon since last check");
        setIsInitialLoading(false);
        return hasClaimedWallet;
      }

      // Update timestamp before the request
      setLastRefreshTime(Date.now());

      // For retry logic
      let attempts = 0;
      const maxAttempts = 3;

      const attemptCheck = async () => {
        try {
          setIsCheckingClaim(true);

          // Always check session storage first for immediate UI feedback
          if (typeof window !== "undefined") {
            const cachedValue = sessionStorage.getItem(
              `walletClaim_${username}`
            );

            if (!forceRefresh && cachedValue) {
              try {
                const parsedCache = JSON.parse(cachedValue);
                const cacheAge = Date.now() - parsedCache.timestamp;

                if (cacheAge < 300000) {
                  // 5 minutes
                  console.log(`Using session storage cache for ${username}`);
                  setHasClaimedWallet(parsedCache.hasClaimed);
                  setWalletClaim(parsedCache.claim);

                  if (parsedCache.claim) {
                    setShowProfile(parsedCache.claim.showProfile !== false);

                    // Still set up Firestore listener with the cached claim ID
                    if (parsedCache.claim.id) {
                      setupFirestoreListener(parsedCache.claim.id);
                    }
                  }

                  // Even with cache hit, we'll proceed with the API call in background
                  // but we'll return early for better UX
                  setIsInitialLoading(false);

                  // Make API call in background without awaiting
                  fetch(
                    `/api/check-wallet-claim?twitterUsername=${encodeURIComponent(
                      username
                    )}&cacheBuster=${Date.now()}`,
                    {
                      headers: {
                        "x-request-id": `${Date.now()}-${Math.random()
                          .toString(36)
                          .substring(2, 10)}`,
                      },
                      cache: "no-store",
                    }
                  ).catch((err) =>
                    console.warn("Background refresh error:", err)
                  );

                  return parsedCache.hasClaimed;
                }
              } catch (e) {
                console.error("Error parsing cached wallet claim:", e);
              }
            }
          }

          // Generate a unique request ID to prevent duplicate calls
          const requestId = `${Date.now()}-${Math.random()
            .toString(36)
            .substring(2, 10)}`;

          console.log(
            `Making API request for wallet claim: ${username} (attempt ${
              attempts + 1
            }/${maxAttempts})`
          );

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
            throw new Error(`Failed to check wallet claim: ${response.status}`);
          }

          const data = await response.json();
          console.log("Wallet claim data response:", data);

          // Update state with the retrieved data
          setHasClaimedWallet(data.hasClaimed);
          setWalletClaim(data.claim);

          // Set visibility state
          if (data.claim) {
            setShowProfile(data.claim.showProfile !== false);

            // Set up Firestore listener for real-time updates
            if (data.claim.id) {
              setupFirestoreListener(data.claim.id);
            }
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

          setIsInitialLoading(false);
          return data.hasClaimed;
        } catch (error) {
          console.error(
            `Error checking wallet claim (attempt ${
              attempts + 1
            }/${maxAttempts}):`,
            error
          );

          // Retry logic with exponential backoff
          attempts++;
          if (attempts < maxAttempts) {
            const backoffTime = Math.min(1000 * Math.pow(2, attempts), 8000);
            console.log(`Retrying in ${backoffTime}ms...`);

            await new Promise((resolve) => setTimeout(resolve, backoffTime));
            return attemptCheck(); // Recursive retry
          }

          // Fall back to session storage on all attempts failed
          if (typeof window !== "undefined") {
            const cachedValue = sessionStorage.getItem(
              `walletClaim_${username}`
            );
            if (cachedValue) {
              try {
                const parsedCache = JSON.parse(cachedValue);
                console.log("Using stale session storage cache as fallback");
                setHasClaimedWallet(parsedCache.hasClaimed);
                setWalletClaim(parsedCache.claim);

                if (parsedCache.claim) {
                  setShowProfile(parsedCache.claim.showProfile !== false);
                }

                setIsInitialLoading(false);
                return parsedCache.hasClaimed;
              } catch (e) {
                console.error("Error parsing cached wallet claim:", e);
              }
            }
          }

          setIsInitialLoading(false);
          return hasClaimedWallet; // Return current state as fallback
        } finally {
          setIsCheckingClaim(false);
        }
      };

      return attemptCheck();
    },
    [username, hasClaimedWallet, lastRefreshTime, setupFirestoreListener]
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

  // Function to claim wallet - update this function
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

        // Set up listener for the new claim - with error handling
        if (claim?.id) {
          try {
            setupFirestoreListener(claim.id);
          } catch (listenerError) {
            console.error(
              "Error setting up listener after claim:",
              listenerError
            );
            // Don't fail the whole operation if just the listener fails
          }
        }

        // Schedule a delayed check for holder position
        setTimeout(() => {
          checkHolderPosition(true).catch(console.error);
        }, 3000);

        // Try to invalidate caches in the background
        try {
          fetch(`/api/check-wallet-claim?username=${username}`, {
            method: "PATCH",
            headers: {
              "Cache-Control": "no-cache",
              Pragma: "no-cache",
            },
          }).catch(() => {}); // Ignore errors from cache invalidation

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
  }, [
    isConnected,
    address,
    username,
    setupFirestoreListener,
    checkHolderPosition,
  ]);

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
