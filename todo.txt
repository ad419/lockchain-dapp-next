"use client";

// Correctly place these as constants outside the component
const DEBUG = process.env.NODE_ENV === "development";
const throttledLogs = {};
const API_CALL_LIMIT = 30; // Maximum allowed API calls before cooldown
const COOLDOWN_DURATION = 30000; // 15 seconds cooldown in milliseconds

function throttledLog(id, message, data, interval = 2000) {
  if (!DEBUG) return;

  const now = Date.now();
  if (!throttledLogs[id] || now - throttledLogs[id] > interval) {
    console.log(`[${id}] ${message}`, data || "");
    throttledLogs[id] = now;
  }
}

// Import your dependencies
import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { useInView } from "react-intersection-observer";
import { motion } from "framer-motion";
import { useVirtualizer } from "@tanstack/react-virtual";
import useSWR from "swr";
import { useSession } from "next-auth/react";
import AnimatedNumber from "./AnimatedNumber";
import Modal from "./Modal";
import Tooltip from "./Tooltip";
import "../styles/Leaderboard.css";
import Link from "next/link";
import Image from "next/image";
import Messages from "./Messages";
import { useToast } from "../context/ToastContext";
import { useWalletClaim } from "../context/WalletClaimContext";
import { useRouter } from "next/navigation";

const MAX_SUPPLY = 1_000_000_000;
const DEFAULT_TOKEN_DATA = {
  totalSupply: MAX_SUPPLY,
  tokenPrice: 0,
  dexData: {
    mainPair: {
      info: {},
      baseToken: {},
      priceChange: { h24: 0, h1: 0 },
      liquidity: { usd: 0 },
      volume: { h24: 0 },
      txns: { h24: { buys: 0, sells: 0 } },
    },
  },
};

const RANK_TITLES = {
  1: { title: "S Tier", color: "#FFD700", badge: "👑" },
  2: { title: "Tier 2", color: "#C0C0C0", badge: "💎" },
  3: { title: "Tier 2", color: "#CD7F32", badge: "💎" },
  4: { title: "Tier 2", color: "#6286fc", badge: "💎" },
  5: { title: "Tier 2", color: "#6286fc", badge: "💎" },
  6: { title: "Tier 3", color: "#7DA0FF", badge: "🛡️" },
  7: { title: "Tier 3", color: "#7DA0FF", badge: "🛡️" },
  8: { title: "Tier 3", color: "#7DA0FF", badge: "🛡️" },
  9: { title: "Tier 3", color: "#7DA0FF", badge: "🛡️" },
  10: { title: "Tier 3", color: "#7DA0FF", badge: "🛡️" },
};

const defaultTokenLogo = "../images/logo.png";

const getRankTitle = (rank) => {
  if (rank <= 10) {
    return RANK_TITLES[rank];
  } else if (rank <= 50) {
    return { title: "The Chosen", color: "#b2b1fc", badge: "⭐" };
  }
  return { title: "Token Holder", color: "#6286fc", badge: "🔒" };
};

// Update your fetcher function to handle 304 responses

const fetcher = async (url, { refreshData } = {}) => {
  try {
    // Add timestamp only when explicitly refreshing or in live mode
    const timestamp =
      refreshData || url.includes("live=true") ? `&t=${Date.now()}` : "";
    const fetchUrl = `${url}${
      url.includes("?") ? timestamp : timestamp.replace("&", "?")
    }`;

    console.log(`Fetching ${fetchUrl}`);

    // Add cache control headers to prevent browser caching
    const response = await fetch(fetchUrl, {
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    });

    // Handle 404 Not Found specifically
    if (response.status === 404) {
      console.error(`API endpoint not found: ${fetchUrl}`);
      throw new Error(`API endpoint not found (404): ${url}`);
    }

    if (!response.ok) {
      throw new Error(`Network response was not ok: ${response.status}`);
    }

    const data = await response.json();

    try {
      sessionStorage.setItem(`cache_${url}`, JSON.stringify(data));
      sessionStorage.setItem(`cache_timestamp_${url}`, Date.now().toString());
      localStorage.setItem("lastHoldersRefresh", Date.now().toString());
    } catch (e) {
      console.warn("Could not cache data:", e);
    }

    return data;
  } catch (error) {
    console.error("Fetching data failed:", error);
    throw error;
  }
};

const generateWalletColor = (walletAddress) => {
  if (!walletAddress) return "#6286fc";
  const hash = walletAddress.slice(-6);
  const r = parseInt(hash.slice(0, 2), 16);
  const g = parseInt(hash.slice(2, 4), 16);
  const b = parseInt(hash.slice(4, 6), 16);
  return `rgb(${r}, ${g}, ${b})`;
};

const STATIC_SOCIAL_LINKS = [
  {
    type: "Website",
    url: "https://thegreatfinancialexperiment.com/",
    icon: "🌐",
  },
  {
    type: "Twitter",
    url: "https://x.com/LockChainAi",
    icon: "𝕏",
  },
];

// Add a helper function to format large numbers in Leaderboard.js
const formatSupply = (supply, useShortFormat = false) => {
  if (useShortFormat) {
    if (supply >= 1_000_000_000) {
      return `${(supply / 1_000_000_000).toFixed(1)}B`;
    } else if (supply >= 1_000_000) {
      return `${(supply / 1_000_000).toFixed(1)}M`;
    } else if (supply >= 1_000) {
      return `${(supply / 1_000).toFixed(1)}K`;
    }
  }

  // Format with commas for readability when not using short format
  return supply.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

// Add this component within your Leaderboard.js file
const MaintenanceMessage = ({ error, onRetry }) => {
  return (
    <div className="leaderboard-maintenance">
      <div className="maintenance-icon">🛠️</div>
      <h3>Leaderboard Temporarily Unavailable</h3>
      <p>
        We're experiencing some technical difficulties with our data provider.
        The leaderboard will be back online shortly.
      </p>
      {error && <div className="maintenance-error">{error}</div>}
      <button className="retry-button" onClick={onRetry}>
        <span className="retry-icon">🔄</span> Try Again
      </button>
    </div>
  );
};

// Add this function at the top level of your component:
const isSafeUrl = (url) => {
  if (!url) return false;

  // Check if it's a string
  if (typeof url !== "string") return false;

  // Check if it's a valid URL format
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

// Add this hook near the top of your component file

// Custom hook for responsive address formatting
const useResponsiveAddressFormat = () => {
  const [format, setFormat] = useState({
    prefixLength: 6,
    suffixLength: 4,
  });

  useEffect(() => {
    const updateFormat = () => {
      if (window.innerWidth <= 320) {
        setFormat({ prefixLength: 4, suffixLength: 3 });
      } else if (window.innerWidth <= 375) {
        setFormat({ prefixLength: 5, suffixLength: 3 });
      } else {
        setFormat({ prefixLength: 6, suffixLength: 4 });
      }
    };

    // Initial format
    updateFormat();

    // Update on resize
    window.addEventListener("resize", updateFormat);
    return () => window.removeEventListener("resize", updateFormat);
  }, []);

  return format;
};

export default function LeaderboardClient({ initialData }) {
  const router = useRouter();
  // First, add these state variables at the top with your other state
  const [isMobileView, setIsMobileView] = useState(false);
  const [expandedRows, setExpandedRows] = useState(new Set());

  // Add a new state variable
  const [darkMode, setDarkMode] = useState(true);

  // Add a toggle function
  const toggleTheme = useCallback(() => {
    setDarkMode((prev) => !prev);
  }, []);

  // Add this to keep track of expanded row heights
  const expandedRowHeights = useRef(new Map());

  // Add this effect with your other useEffect hooks
  useEffect(() => {
    const checkMobile = () => {
      setIsMobileView(window.innerWidth <= 768);
    };

    // Initial check
    checkMobile();

    // Add event listener
    window.addEventListener("resize", checkMobile);

    // Cleanup
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // =============================================
  // 1. ALL HOOKS DEFINITIONS FIRST (no conditionals)
  // =============================================
  const { showToast } = useToast();
  const { data: session } = useSession();
  const {
    walletClaim,
    userHolderData,
    userHolderIndex,
    checkHolderPosition,
    isCheckingClaim,
    isCheckingPosition,
    checkWalletClaim,
    holderPosition,
  } = useWalletClaim();

  // Move the hook declarations here, inside the component
  const [liveModeInCooldown, setLiveModeInCooldown] = useState(false);
  const [cooldownEndTime, setCooldownEndTime] = useState(0);
  const cooldownTimerRef = useRef(null);

  // All other useState, useRef, useCallback, useMemo hooks here...
  const apiCallsCount = useRef(0);
  const [mounted, setMounted] = useState(false);
  const scrollRef = useRef(null);
  const tableContainerRef = useRef(null);
  const { ref: inViewRef, inView } = useInView();
  const [currentPage, setCurrentPage] = useState(1);
  const [holdersPerPage] = useState(20);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const animationTimeoutRef = useRef(null);
  const [claimChecked, setClaimChecked] = useState(false);
  const [walletDataLoading, setWalletDataLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState(0);
  const [apiError, setApiError] = useState(null);
  const liveModeIntervalRef = useRef(null);
  const [updatedHolders, setUpdatedHolders] = useState(new Set());
  const previousHoldersRef = useRef(null);
  const [updateDetected, setUpdateDetected] = useState(false);
  const [liveModeCooldown, setLiveModeCooldown] = useState(false);
  // Add this line near the top of your component where you define other state variables
  const [userWalletData, setUserWalletData] = useState(null);

  // Replace your existing liveMode state with this:
  const [liveMode, setLiveMode] = useState(() => {
    // Try to get the saved preference from localStorage
    if (typeof window !== "undefined") {
      try {
        const savedMode = localStorage.getItem("leaderboard_live_mode");
        return savedMode === "true";
      } catch (e) {
        console.warn("Could not access localStorage", e);
        return false;
      }
    }
    return false;
  });

  // Update your SWR configuration to better handle caching
  const {
    data,
    error,
    isLoading,
    mutate: refreshData,
  } = useSWR("/api/holders", fetcher, {
    fallbackData: { ...DEFAULT_TOKEN_DATA, ...initialData },
    revalidateOnFocus: !liveMode, // Don't revalidate on focus in live mode
    revalidateOnReconnect: !liveMode,
    dedupingInterval: liveMode ? 0 : 30000, // No deduping in live mode
    // This is important - increase cache freshness time in live mode
    refreshInterval: liveMode ? 0 : undefined, // No auto-refresh in live mode, we handle it manually
    onSuccess: (data) => {
      // Only update last refresh time when data successfully loads
      if (data?.holders?.length > 0) {
        setLastRefreshTime(Date.now());
        setApiError(null);
      }
    },
    onError: (err) => {
      console.error("Error fetching holders data:", err);
      setApiError(err.message || "Failed to load leaderboard data");
    },
  });

  // Add this function to your LeaderboardClient component

  const checkForUpdates = useCallback(async () => {
    try {
      // Don't check if a refresh is already in progress
      if (isRefreshing) {
        console.log("Skip update check: refresh in progress");
        return false;
      }

      // Add throttling - don't check more than once every 5 seconds
      const now = Date.now();
      const lastCheck = parseInt(
        sessionStorage.getItem("lastUpdateCheck") || "0"
      );
      if (now - lastCheck < 5000) {
        console.log("Skip update check: too soon");
        return false;
      }

      // Update the last check timestamp
      sessionStorage.setItem("lastUpdateCheck", now.toString());

      // Get the last refresh time
      let lastModified;
      try {
        lastModified = localStorage.getItem("lastHoldersRefresh") || "0";
      } catch (e) {
        lastModified = "0";
      }

      // Log the request we're about to make
      console.log(
        `Checking updates since ${new Date(
          parseInt(lastModified)
        ).toLocaleTimeString()}`
      );

      // Add watch parameters if user wallet is connected
      const watchParams =
        walletClaim?.walletAddress && userHolderData
          ? `&watchAddress=${walletClaim.walletAddress.toLowerCase()}`
          : "";

      // Make the API call with explicit cache control
      console.log(
        `Request URL: /api/holders/check-updates?lastModified=${lastModified}${watchParams}`
      );
      const response = await fetch(
        `/api/holders/check-updates?lastModified=${lastModified}${watchParams}`,
        {
          headers: {
            "Cache-Control": "no-cache, no-store, must-revalidate",
            Pragma: "no-cache",
            cache: "no-store",
          },
        }
      );

      if (!response.ok) {
        console.error(`Update check failed: ${response.status}`);
        return false;
      }

      // Parse the response
      const data = await response.json();
      console.log("Update check response:", data);

      // Handle updates if any
      if (data.hasUpdates) {
        console.log("Updates detected, refreshing data");
        setUpdateDetected(true);
        setTimeout(() => setUpdateDetected(false), 1500);

        // IMPORTANT CHANGE: Set isRefreshing to prevent competing updates
        setIsRefreshing(true);

        try {
          // Directly fetch fresh data from the API
          const freshDataResponse = await fetch(
            `/api/holders?refresh=true&t=${Date.now()}&forceFresh=true`,
            {
              headers: {
                "Cache-Control": "no-cache, no-store, must-revalidate",
                Pragma: "no-cache",
                Expires: "0",
              },
              cache: "no-store",
            }
          );

          if (!freshDataResponse.ok) {
            throw new Error(
              `Failed to fetch fresh data: ${freshDataResponse.status}`
            );
          }

          // Parse the fresh data
          const freshData = await freshDataResponse.json();

          // Clear any existing cache that might be causing the reversion
          try {
            sessionStorage.removeItem("cache_/api/holders");
            localStorage.setItem(
              "lastHoldersRefresh",
              data.timestamp.toString()
            );
          } catch (e) {
            console.warn("Could not clear cached data:", e);
          }

          // Update the SWR cache with fresh data and force it to revalidate
          await refreshData(freshData, { revalidate: true });

          // Update the last refresh time
          setLastRefreshTime(Date.now());
        } catch (error) {
          console.error("Error refreshing data after update detection:", error);
        } finally {
          // Release the refresh lock after a short delay
          setTimeout(() => setIsRefreshing(false), 500);
        }

        // Check holder position if needed
        if (
          walletClaim?.walletAddress &&
          data.updatedAddresses?.includes(
            walletClaim.walletAddress.toLowerCase()
          )
        ) {
          checkHolderPosition(true);
        }

        return true;
      } else {
        console.log("No updates detected");
        return false;
      }
    } catch (error) {
      console.error("Error checking for updates:", error);
      return false;
    }
  }, [
    refreshData,
    walletClaim?.walletAddress,
    userHolderData,
    checkHolderPosition,
    isRefreshing,
    setIsRefreshing,
    setLastRefreshTime,
  ]);

  // Modify the handleRefresh function in Leaderboard.js
  const handleRefresh = useCallback(async () => {
    const now = Date.now();
    const timeSinceLastRefresh = now - lastRefreshTime;

    // Throttle refreshes to prevent API abuse
    if (isRefreshing || timeSinceLastRefresh < 15000) {
      showToast(
        `Please wait ${Math.ceil(
          (15000 - timeSinceLastRefresh) / 1000
        )}s before refreshing again`,
        "info"
      );
      return;
    }

    setIsRefreshing(true);
    setLastRefreshTime(now);
    setApiError(null);

    try {
      console.log("🔄 Manual refresh triggered using direct API call");

      // Same approach as handleDirectRefresh - make a direct API call
      const cacheBuster = Date.now();
      const response = await fetch(
        `/api/holders?refresh=true&t=${cacheBuster}&forceFresh=true`,
        {
          headers: {
            "Cache-Control": "no-cache, no-store, must-revalidate",
            Pragma: "no-cache",
            Expires: "0",
          },
          // This next line is critical - it tells fetch to bypass the browser cache
          cache: "no-store",
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to refresh: ${response.status}`);
      }

      // Parse the fresh data
      const freshData = await response.json();

      // Clear any cached data in SessionStorage and LocalStorage
      try {
        sessionStorage.removeItem("cache_/api/holders");
        localStorage.setItem("lastHoldersRefresh", Date.now().toString());
      } catch (e) {
        console.warn("Storage error:", e);
      }

      // Force SWR to completely revalidate with the fresh data
      // revalidate: true is key here - it forces a full refresh
      await refreshData(freshData, { revalidate: true });

      // If we have wallet info, check holder position
      if (session && walletClaim && !isCheckingPosition) {
        checkHolderPosition(true); // Force a position refresh too
      }

      showToast("Leaderboard data refreshed!", "success");
    } catch (error) {
      console.error("Error refreshing data:", error);
      setApiError(error.message || "Failed to refresh leaderboard data");
      showToast("Failed to refresh data. Please try again.", "error");
    } finally {
      setTimeout(() => setIsRefreshing(false), 1000);
    }
  }, [
    refreshData,
    lastRefreshTime,
    showToast,
    session,
    walletClaim,
    checkHolderPosition,
    isRefreshing,
    isCheckingPosition,
  ]);

  // Direct Moralis polling implementation
  useEffect(() => {
    // Clear any existing interval when component unmounts or live mode changes
    if (liveModeIntervalRef.current) {
      clearInterval(liveModeIntervalRef.current);
      liveModeIntervalRef.current = null;
    }

    // If live mode is enabled, set up regular polling
    if (liveMode) {
      console.log("🔴 Live mode activated - polling Moralis every 10 seconds");

      // First, force an immediate refresh to get fresh data
      handleDirectRefresh();

      // Then set up interval for future refreshes
      liveModeIntervalRef.current = setInterval(() => {
        if (!isRefreshing) {
          console.log("🔄 Live mode refreshing data directly from Moralis...");
          handleDirectRefresh();
        }
      }, 10000); // Poll every 10 seconds

      showToast("Live updates active - refreshing every 10 seconds", "info");
    } else {
      console.log("⚫ Live mode deactivated");
    }

    // Clean up interval on unmount
    return () => {
      if (liveModeIntervalRef.current) {
        clearInterval(liveModeIntervalRef.current);
        liveModeIntervalRef.current = null;
      }
    };
  }, [liveMode]);

  // Add a direct refresh function that skips cache
  const handleDirectRefresh = useCallback(async () => {
    if (isRefreshing || liveModeInCooldown) return;

    // Increment API call counter
    apiCallsCount.current++;

    // Check if we've hit the API call limit
    if (apiCallsCount.current >= API_CALL_LIMIT) {
      // Disable live mode and enter cooldown
      setLiveMode(false);
      setLiveModeInCooldown(true);

      // Calculate when cooldown will end
      const endTime = Date.now() + COOLDOWN_DURATION;
      setCooldownEndTime(endTime);

      // Show notification to user
      showToast(
        `Live mode disabled for ${
          COOLDOWN_DURATION / 1000
        } seconds to prevent API overuse`,
        "warning"
      );

      // Set timer to notify when cooldown is over
      cooldownTimerRef.current = setTimeout(() => {
        setLiveModeInCooldown(false);
        showToast("You can enable live updates again", "info");
      }, COOLDOWN_DURATION);

      // Early return to avoid making the API call
      return;
    }

    setIsRefreshing(true);

    try {
      console.log(
        `📡 Direct API call #${apiCallsCount.current} - Fetching fresh data from Moralis`
      );

      // Clear any cached data in SessionStorage before making the request
      try {
        sessionStorage.removeItem("cache_/api/holders");
        localStorage.setItem("lastHoldersRefresh", Date.now().toString());
      } catch (e) {
        console.warn("Storage error:", e);
      }

      // Direct call to API with additional cache busting parameters
      const cacheBuster = Date.now();
      const response = await fetch(
        `/api/holders?live=true&t=${cacheBuster}&forceFresh=true`,
        {
          headers: {
            "Cache-Control": "no-cache, no-store, must-revalidate",
            Pragma: "no-cache",
            Expires: "0",
          },
          cache: "no-store", // Critical for bypassing browser cache
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.status}`);
      }

      const freshData = await response.json();

      // Update SWR cache with the fresh data and force revalidation
      await refreshData(freshData, { revalidate: true });

      // Update last refresh time
      setLastRefreshTime(Date.now());

      // Check for user wallet position change
      if (session && walletClaim && !isCheckingPosition) {
        checkHolderPosition(true); // Force refresh position data
      }
    } catch (error) {
      console.error("Live mode refresh failed:", error);
      setApiError(error.message || "Failed to refresh data");

      // If we have too many consecutive errors, disable live mode
      if (apiCallsCount.current > 5) {
        setLiveMode(false);
        showToast("Live updates disabled due to API errors", "error");
      }
    } finally {
      setIsRefreshing(false);
    }
  }, [
    refreshData,
    session,
    walletClaim,
    checkHolderPosition,
    isCheckingPosition,
    showToast,
    isRefreshing,
    liveModeInCooldown,
  ]);

  // Replace the existing live mode useEffect with this simple version
  useEffect(() => {
    // No need for any interval handling - SWR will handle the polling
    if (liveMode) {
      console.log("🔴 Live mode enabled - using SWR's built-in polling");
      // No direct API calls here - let SWR handle it with refreshInterval
    } else {
      console.log("⚫ Live mode disabled");
    }
  }, [liveMode]);

  // Add this effect to update userWalletData when walletClaim changes
  useEffect(() => {
    if (walletClaim) {
      // Create a userWalletData object from the walletClaim
      setUserWalletData({
        walletAddress: walletClaim.walletAddress,
        userId: walletClaim.userId,
        profileImage: walletClaim.profileImage || session?.user?.image,
        username: walletClaim.twitterUsername || session?.user?.username,
      });
    } else {
      setUserWalletData(null);
    }
  }, [walletClaim, session]);

  // Optimize this useEffect to avoid unnecessary work with a better map approach
  useEffect(() => {
    // Skip first render or when data is loading
    if (!data?.holders || isLoading) {
      if (data?.holders) {
        // Only update the ref if we have data
        previousHoldersRef.current = new Map(
          data.holders.map((h) => [h.address.toLowerCase(), h.balance])
        );
      }
      return () => {}; // Always return a function!
    }

    // If we don't have previous data, just store current data and exit
    if (!previousHoldersRef.current) {
      previousHoldersRef.current = new Map(
        data.holders.map((h) => [h.address.toLowerCase(), h.balance])
      );
      return () => {}; // Always return a function!
    }

    // Check for updates
    const updates = new Set();
    data.holders.forEach((holder) => {
      const addr = holder.address.toLowerCase();
      const prevBalance = previousHoldersRef.current.get(addr);

      // Add address to updates if balance changed
      if (prevBalance !== undefined && prevBalance !== holder.balance) {
        updates.add(addr);
      }
    });

    // Update state if there are changes
    if (updates.size > 0) {
      console.log(`Found ${updates.size} holders with balance changes`);

      // Store the updated addresses for highlighting
      setUpdatedHolders(updates);

      // If the changed address matches our wallet, refresh position
      if (
        walletClaim?.walletAddress &&
        updates.has(walletClaim.walletAddress.toLowerCase())
      ) {
        checkHolderPosition(true);
      }

      // IMPORTANT: Make sure to update the previousHoldersRef AFTER setting updatedHolders
      // This ensures we don't lose the updated state
      previousHoldersRef.current = new Map(
        data.holders.map((h) => [h.address.toLowerCase(), h.balance])
      );

      // Clear the highlighting after animation completes
      const timerId = setTimeout(() => {
        setUpdatedHolders(new Set());
      }, 4000);

      // Return cleanup function
      return () => clearTimeout(timerId);
    }

    // Update reference for next comparison ONLY if no updates were found
    // This prevents losing updated values
    if (updates.size === 0) {
      previousHoldersRef.current = new Map(
        data.holders.map((h) => [h.address.toLowerCase(), h.balance])
      );
    }

    // Always return a function for cleanup
    return () => {};
  }, [
    data?.holders,
    isLoading,
    walletClaim?.walletAddress,
    checkHolderPosition,
  ]);

  // Update the handleRefresh function to refresh all data sources

  useEffect(() => {
    setMounted(true);
    return () => {};
  }, []);

  useEffect(() => {
    return () => {
      if (cooldownTimerRef.current) {
        clearTimeout(cooldownTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const startAnimation = () => {
      setIsAnimating(true);
      animationTimeoutRef.current = setTimeout(() => {
        setIsAnimating(false);
        animationTimeoutRef.current = setTimeout(() => {
          startAnimation();
        }, 30000);
      }, 60000);
    };

    startAnimation();

    return () => {
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }
    };
  }, []);

  // Optimize the position checking effect
  useEffect(() => {
    // Skip if we've already checked or don't have necessary data
    if (!data?.holders?.length || !walletClaim?.walletAddress || claimChecked) {
      return;
    }

    console.log(
      "Initial position check for wallet:",
      walletClaim.walletAddress
    );
    checkHolderPosition();
    setClaimChecked(true);
  }, [
    data?.holders,
    walletClaim?.walletAddress,
    checkHolderPosition,
    claimChecked,
  ]);

  useEffect(() => {
    if (!session) {
      setClaimChecked(false);
    }
  }, [session]);

  useEffect(() => {
    const handleScroll = () => {
      if (!tableContainerRef.current) return;

      const tableHeader =
        tableContainerRef.current.querySelector(".table-header");

      if (tableHeader) {
        if (tableContainerRef.current.scrollTop > 5) {
          tableHeader.classList.add("scrolled-vertical");
        } else {
          tableHeader.classList.remove("scrolled-vertical");
        }

        if (tableContainerRef.current.scrollLeft > 5) {
          tableContainerRef.current.classList.add("scrolled");
        } else {
          tableContainerRef.current.classList.remove("scrolled");
        }
      }
    };

    if (tableContainerRef.current) {
      tableContainerRef.current.addEventListener("scroll", handleScroll);
      setTimeout(handleScroll, 100);
    }

    return () => {
      if (tableContainerRef.current) {
        tableContainerRef.current.removeEventListener("scroll", handleScroll);
      }
    };
  }, [mounted]);

  const totalPages = useMemo(() => {
    return Math.ceil((data?.holders?.length ?? 0) / holdersPerPage);
  }, [data?.holders?.length, holdersPerPage]);

  useEffect(() => {
    const savedPage = sessionStorage.getItem("leaderboard_current_page");
    if (savedPage && parseInt(savedPage) <= totalPages) {
      setCurrentPage(parseInt(savedPage));
    }

    return () => {
      sessionStorage.setItem(
        "leaderboard_current_page",
        currentPage.toString()
      );
    };
  }, [currentPage, totalPages]);

  const {
    totalSupply = MAX_SUPPLY,
    tokenPrice = 0,
    dexData = DEFAULT_TOKEN_DATA.dexData,
  } = data || {};

  const indexOfLastHolder = currentPage * holdersPerPage;
  const indexOfFirstHolder = indexOfLastHolder - holdersPerPage;

  const holders = useMemo(() => {
    if (!data?.holders) return [];
    return data.holders
      .map((holder, index) => ({ ...holder, rank: index + 1 }))
      .slice(indexOfFirstHolder, indexOfLastHolder);
  }, [data?.holders, indexOfFirstHolder, indexOfLastHolder]);

  // Now add rowVirtualizer FIRST, without the toggleRowExpand dependency
  const rowVirtualizer = useVirtualizer({
    count: holdersPerPage,
    getScrollElement: () => scrollRef.current,
    estimateSize: (index) => {
      const holder = holders[index];
      if (!holder) return 50;

      // Add more height for expanded rows based on content
      if (expandedRows.has(holder.address)) {
        // Add extra space if social info is present
        const hasSocial = holder.social && holder.social.twitter;
        const isContract = holder.is_contract;

        // Base height + additional height for social or contract info
        return 150 + (hasSocial ? 40 : 0) + (isContract ? 30 : 0);
      }

      return 50; // Default height for collapsed rows
    },
    overscan: 10, // Increase overscan to prevent content jumping
    scrollToFn: (offset, { behavior }) => {
      if (scrollRef.current) {
        scrollRef.current.scrollTo({ top: offset, behavior });
      }
    },
  });

  // THEN add toggleRowExpand AFTER rowVirtualizer is defined
  const toggleRowExpand = useCallback((address) => {
    setExpandedRows((prevRows) => {
      const newRows = new Set(prevRows);
      if (newRows.has(address)) {
        newRows.delete(address);
      } else {
        newRows.add(address);
      }

      // Force the virtualizer to recalculate sizes after expanding/collapsing
      setTimeout(() => {
        if (rowVirtualizer && rowVirtualizer.measure) {
          try {
            rowVirtualizer.measure();
          } catch (err) {
            console.error("Failed to measure virtualizer", err);
          }
        }
      }, 50);

      return newRows;
    });
  }, []);

  // Add this utility function near your other utility functions at the top
  const formatNumber = (value, decimals = 2) => {
    // Handle null/undefined values
    if (value == null) return "0";

    // Convert to number if needed
    const num = typeof value === "string" ? parseFloat(value) : value;

    // Format based on magnitude
    if (Math.abs(num) >= 1_000_000_000) {
      return `${(num / 1_000_000_000).toFixed(decimals)}B`;
    } else if (Math.abs(num) >= 1_000_000) {
      return `${(num / 1_000_000).toFixed(decimals)}M`;
    } else if (Math.abs(num) >= 1_000) {
      return `${(num / 1_000).toFixed(decimals)}K`;
    } else {
      return num.toFixed(decimals);
    }
  };

  // Add this function after your other useCallback functions but before renderContent

  // Add the toggleLiveMode function that was missing
  // Update the toggleLiveMode function to save to localStorage
  const toggleLiveMode = useCallback(() => {
    // If in cooldown, prevent enabling live mode
    if (liveModeInCooldown && !liveMode) {
      const timeRemaining = Math.ceil((cooldownEndTime - Date.now()) / 1000);
      showToast(
        `Please wait ${timeRemaining} seconds before re-enabling live mode`,
        "warning"
      );
      return;
    }

    // Reset API calls counter when toggling
    apiCallsCount.current = 0;

    // Toggle and save the state
    setLiveMode((prevMode) => {
      const newMode = !prevMode;

      // Save to localStorage
      try {
        localStorage.setItem("leaderboard_live_mode", newMode.toString());
      } catch (e) {
        console.warn("Could not save to localStorage", e);
      }

      return newMode;
    });
  }, [liveMode, liveModeInCooldown, cooldownEndTime, showToast]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [currentPage]);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  const handlePageNavigation = (direction) => {
    if (direction === "prev" && currentPage > 1) {
      setCurrentPage((prev) => prev - 1);
    } else if (direction === "next" && currentPage < totalPages) {
      setCurrentPage((prev) => prev + 1);
    }
  };

  // Debugging functions
  // useEffect(() => {
  //   window._debugRefresh = () => {
  //     console.log("-- Debug Info --");
  //     console.log("Is refreshing:", isRefreshing);
  //     console.log(
  //       "Last refresh time:",
  //       new Date(lastRefreshTime).toLocaleTimeString()
  //     );
  //     console.log("Live mode:", liveMode);
  //     console.log("API error:", apiError);
  //     console.log("SWR cache:", data);
  //     console.log("User wallet:", walletClaim?.walletAddress);
  //     console.log("User holder data:", userHolderData);
  //   };

  //   window._forceRefresh = async () => {
  //     try {
  //       console.log("Forcing API refresh...");
  //       const response = await fetch("/api/holders?refresh=true&debug=true", {
  //         headers: {
  //           "Cache-Control": "no-cache, no-store, must-revalidate",
  //           Pragma: "no-cache",
  //         },
  //       });
  //       const data = await response.json();
  //       console.log("API response:", data);
  //       return data;
  //     } catch (err) {
  //       console.error("Force refresh failed:", err);
  //     }
  //   };

  //   return () => {
  //     delete window._debugRefresh;
  //     delete window._forceRefresh;
  //   };
  // }, [
  //   isRefreshing,
  //   lastRefreshTime,
  //   liveMode,
  //   apiError,
  //   data,
  //   walletClaim,
  //   userHolderData,
  // ]);

  // Add these functions before your renderContent function in LeaderboardClient
  const renderTableHeaders = useCallback(() => {
    return mounted ? (
      <div className="table-header">
        <div className="header-content">
          <span>Rank</span>
          <span>Wallet Address</span>
          <span>Holdings</span>
          <span>Percentage</span>
          <span>Value (USD)</span>
        </div>
      </div>
    ) : null;
  }, [mounted]);

  const renderVirtualizedList = useCallback(() => {
    if (!mounted) return null;

    return rowVirtualizer.getVirtualItems().map((virtualRow) => {
      const holder = holders[virtualRow.index];
      if (!holder) return null;

      const rankTitle = getRankTitle(holder.rank);
      const isUserWallet =
        walletClaim &&
        holder.address.toLowerCase() ===
          walletClaim.walletAddress.toLowerCase();
      const walletColor = isUserWallet
        ? generateWalletColor(holder.address)
        : null;

      return (
        <div
          key={holder.address}
          className={`holder-row`}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: `${virtualRow.size}px`,
            transform: `translateY(${virtualRow.start}px)`,
          }}
        >
          <div
            className={`holder-content ${
              holder.rank === 1 && isAnimating ? "animating" : ""
            }`}
            style={
              isUserWallet
                ? {
                    background: `linear-gradient(90deg, 
                      rgba(${parseInt(
                        walletColor.slice(4, -1).split(",")[0]
                      )}, ${parseInt(
                      walletColor.slice(4, -1).split(",")[1]
                    )}, ${parseInt(
                      walletColor.slice(4, -1).split(",")[2]
                    )}, 0.1) 0%,
                      rgba(${parseInt(
                        walletColor.slice(4, -1).split(",")[0]
                      )}, ${parseInt(
                      walletColor.slice(4, -1).split(",")[1]
                    )}, ${parseInt(
                      walletColor.slice(4, -1).split(",")[2]
                    )}, 0.05) 100%
                    )`,
                    borderLeft: `4px solid ${walletColor}`,
                    boxShadow: `0 0 20px ${walletColor}33`,
                  }
                : {}
            }
          >
            <div className="rank-container">
              <span className="rank">#{holder.rank}</span>
              <div className="rank-badge" style={{ color: rankTitle.color }}>
                {rankTitle.badge}
              </div>
              <div className="rank-title" style={{ color: rankTitle.color }}>
                {rankTitle.title}
              </div>
            </div>
            <div className="address">
              <div className="address-container">
                <Link
                  href={`https://basescan.org/address/${holder.address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="address-link"
                >
                  {holder.address}
                </Link>
                {holder.social &&
                  holder.social.showProfile !== false &&
                  holder.social.twitter && (
                    <Link
                      href={`/public-profile/${holder.social.twitter}`}
                      className="twitter-link"
                    >
                      {holder.social.profileImage !== null ? (
                        <img
                          src={holder.social.profileImage}
                          alt={holder.social.name || "User"}
                          width={20}
                          height={20}
                          className="twitter-avatar"
                        />
                      ) : (
                        <div
                          className="avatar-placeholder"
                          style={{ width: 20, height: 20 }}
                        ></div>
                      )}
                      <span className="twitter-username">
                        @{holder.social.twitter}
                      </span>
                    </Link>
                  )}
              </div>
            </div>
            <div className="holdings">
              <AnimatedNumber
                value={parseFloat(holder.balance_formatted).toFixed(2)}
                duration={1000}
                formatValue={(value) => value.toFixed(2)}
              />
            </div>
            <div className="percentage">
              <AnimatedNumber
                value={parseFloat(holder.percentage).toFixed(2)}
                duration={1000}
                formatValue={(value) => value.toFixed(2)}
              />
              %
            </div>
            <div className="value">
              <AnimatedNumber
                value={parseFloat(holder.usdValue)}
                duration={1000}
                formatValue={(value) =>
                  value.toLocaleString(undefined, {
                    style: "currency",
                    currency: "USD",
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })
                }
              />{" "}
              $
            </div>
            {isUserWallet && (
              <div
                className="wallet-indicator"
                style={{
                  position: "absolute",
                  right: "10px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: walletColor,
                  padding: "4px 12px",
                  borderRadius: "4px",
                  fontSize: "0.8rem",
                  fontWeight: "600",
                }}
              ></div>
            )}
            {holder.rank <= 10 && (
              <div className="holder-graph">
                <div className="graph-label">Holdings % vs Average</div>
                <div className="graph-container">
                  <div
                    className="graph-bar"
                    style={{
                      width: `${Math.min(100, (holder.percentage / 5) * 100)}%`,
                      background: `linear-gradient(90deg, 
                        rgba(98, 134, 252, 0.8),
                        rgba(98, 134, 252, 0.4))`,
                    }}
                  />
                  <div className="graph-avg-marker" style={{ left: "10%" }} />
                </div>
                <div className="graph-info">
                  <span className="holder-value">
                    {/* Use optional chaining and ensure we're working with a number */}
                    {typeof holder?.percentage === "number"
                      ? `Your: ${holder.percentage.toFixed(2)}%`
                      : `Your: ${parseFloat(holder?.percentage || 0).toFixed(
                          2
                        )}%`}
                  </span>
                  <span className="avg-value">Avg: 0.5%</span>
                </div>
              </div>
            )}
          </div>
        </div>
      );
    });
  }, [mounted, holders, rowVirtualizer, walletClaim, isAnimating]);

  // Move this line here - BEFORE the renderMobileVirtualizedList function
  const addressFormat = useResponsiveAddressFormat();

  // Add this function to your Leaderboard.js component
  const renderMobileVirtualizedList = useCallback(() => {
    if (!mounted) return null;

    // Instead of using virtualization for mobile, render all rows directly
    return holders.map((holder, index) => {
      if (!holder) return null;

      const rankTitle = getRankTitle(holder.rank);
      const isUserWallet =
        walletClaim &&
        holder.address.toLowerCase() ===
          walletClaim.walletAddress.toLowerCase();
      const walletColor = isUserWallet
        ? generateWalletColor(holder.address)
        : null;
      const isUpdated = updatedHolders.has(holder.address.toLowerCase());
      const isExpanded = expandedRows.has(holder.address);

      return (
        <div
          key={holder.address}
          className="holder-row-mobile"
          style={{
            position: "relative", // Changed from absolute positioning
            width: "100%",
            minHeight: isExpanded ? "auto" : "50px",
            marginBottom: "8px",
            overflow: "visible",
          }}
        >
          <div
            className={`mobile-holder-card ${
              isUserWallet ? "user-wallet" : ""
            } ${holder.rank === 1 && isAnimating ? "animating" : ""} ${
              isExpanded ? "expanded" : ""
            }`}
            onClick={() => toggleRowExpand(holder.address)}
            onTouchStart={(e) => handleSwipeStart(e, holder.address)}
            style={
              isUserWallet ? { borderLeft: `4px solid ${walletColor}` } : {}
            }
          >
            <div className="mobile-card-main">
              <div className="mobile-rank">
                <span className="rank-value">#{holder.rank}</span>
                <span className="rank-badge">{rankTitle.badge}</span>
              </div>

              <div className="mobile-address">
                <span className="address-text">
                  {`${holder.address.substring(
                    0,
                    addressFormat.prefixLength
                  )}...${holder.address.substring(
                    holder.address.length - addressFormat.suffixLength
                  )}`}
                </span>
                <div className="address-actions">
                  <button
                    className="mobile-copy-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigator.clipboard.writeText(holder.address);
                      showToast("Address copied", "success");
                    }}
                  >
                    📋
                  </button>
                  <a
                    href={`https://basescan.org/address/${holder.address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mobile-view-link"
                    onClick={(e) => e.stopPropagation()}
                  >
                    🔍
                  </a>
                </div>
              </div>

              <div className="mobile-holdings">
                <span className="holdings-value"></span>
              </div>

              <div className="mobile-dropdown">
                <button
                  className="expand-toggle"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleRowExpand(holder.address);
                  }}
                >
                  {isExpanded ? "▲" : "▼"}
                </button>
              </div>
            </div>

            {isExpanded && (
              <div
                className="mobile-expanded-content"
                style={{
                  height: "auto",
                  overflow: "visible",
                  maxHeight: "none",
                }}
              >
                <div className="mobile-stats-grid">
                  <div className="mobile-stat-item">
                    <span className="stat-label">Value</span>
                    <span className="stat-value">
                      <AnimatedNumber
                        value={parseFloat(holder.usdValue).toFixed(2)}
                        duration={1000}
                        formatValue={(value) =>
                          value.toLocaleString(undefined, {
                            style: "currency",
                            currency: "USD",
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })
                        }
                      />
                    </span>
                  </div>
                  <div className="mobile-stat-item">
                    <span className="stat-label">%</span>
                    <span className="stat-value">
                      {typeof holder.percentage === "number"
                        ? `${holder.percentage.toFixed(2)}%`
                        : `${parseFloat(holder?.percentage || 0).toFixed(2)}%`}
                    </span>
                  </div>
                  <div className="mobile-stat-item">
                    <span className="stat-label">Tokens</span>
                    <span className="stat-value">
                      {parseFloat(holder.balance_formatted).toFixed(2)}
                    </span>
                  </div>
                  {holder.is_contract && (
                    <div className="mobile-stat-item full-width">
                      <span className="contract-note">Contract</span>
                    </div>
                  )}
                </div>

                {holder.social && holder.social.twitter && (
                  <div className="mobile-social">
                    <Link
                      href={`/public-profile/${holder.social.twitter}`}
                      className="twitter-profile-link"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {holder.social.profileImage ? (
                        <img
                          src={holder.social.profileImage}
                          alt={holder.social.name || "User"}
                          width={16}
                          height={16}
                          className="twitter-avatar"
                        />
                      ) : (
                        <div className="avatar-placeholder"></div>
                      )}
                      <span className="twitter-username">
                        @{holder.social.twitter}
                      </span>
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      );
    });
  }, [
    mounted,
    holders,
    walletClaim,
    isAnimating,
    updatedHolders,
    expandedRows,
    toggleRowExpand,
    showToast,
    addressFormat, // Add this dependency
  ]);

  // Add this function to your Leaderboard.js component
  const handleSwipeStart = useCallback(
    (e, address) => {
      const touchStartX = e.touches[0].clientX;
      const touchThreshold = 50;

      const handleTouchMove = (e) => {
        const currentX = e.touches[0].clientX;
        const diff = currentX - touchStartX;

        // If swiped right significantly, expand the row
        if (diff > touchThreshold) {
          toggleRowExpand(address);
          document.removeEventListener("touchmove", handleTouchMove);
        }
        // If swiped left significantly, collapse the row
        else if (diff < -touchThreshold) {
          if (expandedRows.has(address)) {
            toggleRowExpand(address);
          }
          document.removeEventListener("touchmove", handleTouchMove);
        }
      };

      document.addEventListener("touchmove", handleTouchMove);

      const handleTouchEnd = () => {
        document.removeEventListener("touchmove", handleTouchMove);
        document.removeEventListener("touchend", handleTouchEnd);
      };

      document.addEventListener("touchend", handleTouchEnd);
    },
    [expandedRows, toggleRowExpand]
  );

  // =============================================
  // 3. RENDER LOGIC - Using conditional rendering inside the return
  // =============================================

  // Prepare rendering content based on state
  const loadingContent = (
    <div style={{ marginTop: "60px" }} className="leaderboard-container-bg">
      <div className="leaderboard-container">
        <h2 className="leaderboard-title">Loading holders data...</h2>
        <div className="loading-spinner-leaderboard" />
      </div>
    </div>
  );

  const errorContent = (
    <div className="leaderboard-container-bg">
      <div className="leaderboard-container">
        <MaintenanceMessage
          error={apiError || error?.message || ""}
          onRetry={handleRefresh}
        />
      </div>
    </div>
  );

  const emptyDataContent = (
    <div style={{ marginTop: "60px" }} className="leaderboard-container-bg">
      <div className="leaderboard-container">
        <h2 className="leaderboard-title">No holder data available</h2>
      </div>
    </div>
  );

  // Function to determine what to render
  const renderContent = () => {
    if (!mounted) return null;
    if (isLoading) return loadingContent;
    if (
      (data?.maintenanceMode || error || apiError) &&
      (!data?.holders || data.holders.length === 0)
    )
      return errorContent;
    if (!data || !data.holders || data.holders.length === 0)
      return emptyDataContent;

    // Main content rendering
    return (
      <div
        className={`leaderboard-container-bg ${
          darkMode ? "dark-mode" : "light-mode"
        }`}
        style={{
          marginTop: "20px",
        }}
      >
        <div className="theme-toggle" onClick={toggleTheme}>
          {darkMode ? "☀️" : "🌙"}
        </div>

        <motion.div
          style={{
            overflowX: "hidden",
          }}
          className="leaderboard-container fade-in"
        >
          {session && (
            <>
              {isCheckingPosition || isCheckingClaim ? (
                <div className="user-wallet-stats loading">
                  <div className="wallet-stats-loading">
                    <div className="loading-shimmer"></div>
                    <div className="stat-items-loading">
                      <div className="stat-item-loader"></div>
                      <div className="stat-item-loader"></div>
                      <div className="stat-item-loader"></div>
                    </div>
                  </div>
                </div>
              ) : walletClaim ? (
                <div className="user-wallet-stats">
                  <div className="user-stats-header">
                    <h3>Your Position</h3>
                    <div className="wallet-address-ld">
                      {walletClaim.walletAddress.substring(0, 6)}...
                      {walletClaim.walletAddress.substring(
                        walletClaim.walletAddress.length - 4
                      )}
                      <button
                        className="copy-button-ld"
                        onClick={() => {
                          navigator.clipboard.writeText(
                            walletClaim.walletAddress
                          );
                          showToast("Wallet address copied!", "success");
                        }}
                        title="Copy to clipboard"
                      >
                        📋
                      </button>
                    </div>
                  </div>

                  <div className="user-stats-content">
                    <div className="user-stat-card rank-card">
                      <div className="stat-value">
                        {userHolderData
                          ? `#${
                              userHolderData.rank || holderPosition?.rank || "?"
                            }`
                          : "..."}
                      </div>
                      <div className="stat-label">Position</div>
                    </div>

                    <div className="user-stat-card holdings-card">
                      <div className="stat-value">
                        {userHolderData
                          ? Number(userHolderData.balance_formatted).toFixed(2)
                          : holderPosition?.data?.balance_formatted
                          ? Number(
                              holderPosition.data.balance_formatted
                            ).toFixed(2)
                          : "..."}
                      </div>
                      <div className="stat-label">Tokens</div>
                    </div>

                    <div className="user-stat-card value-card">
                      <div className="stat-value">
                        {userHolderData
                          ? `$${Number(userHolderData.usdValue).toLocaleString(
                              undefined,
                              {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              }
                            )}`
                          : holderPosition?.data?.usdValue
                          ? `$${Number(
                              holderPosition.data.usdValue
                            ).toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}`
                          : "..."}
                      </div>
                      <div className="stat-label">Value</div>
                    </div>
                  </div>
                </div>
              ) : null}
            </>
          )}

          <div
            style={{
              marginTop: "20px",
            }}
            className="leaderboard-stats"
          >
            <div className="stat-item">
              <span className="stat-label">Total Supply</span>
              <span className="stat-value">
                <span className="desktop-only">
                  {formatSupply(totalSupply)}
                </span>
                <span className="mobile-only">
                  {formatSupply(totalSupply, true)}
                </span>
              </span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Price:</span>
              <span className="stat-value">
                <AnimatedNumber
                  value={Number(tokenPrice)}
                  duration={1000}
                  formatValue={(value) =>
                    value.toLocaleString(undefined, {
                      style: "currency",
                      currency: "USD",
                      minimumFractionDigits: 8,
                      maximumFractionDigits: 8,
                    })
                  }
                />
              </span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Total Holders:</span>
              <span className="stat-value">
                <AnimatedNumber
                  value={data?.holders?.length || 0}
                  duration={1500}
                  formatValue={(value) => value.toLocaleString()}
                />
              </span>
            </div>

            {/* First toggle in the leaderboard-stats div */}
            {/* <div className="live-mode-toggle">
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={liveMode}
                  onChange={() => setLiveMode(!liveMode)}
                />
                <span className="toggle-slider"></span>
              </label>
              <span className="toggle-label">
                {liveMode ? "Live Updates" : "Standard"}
              </span>
              {liveMode && (
                <div className="live-indicator">
                  <div className="pulse-dot"></div>
                </div>
              )}
            </div> */}
          </div>
          <div className="token-stats-container">
            <div
              style={{
                position: "relative",
              }}
              className="token-info"
            >
              <img
                src={defaultTokenLogo}
                alt="Token Logo"
                width={48}
                height={48}
                className="token-logo"
              />
              <div className="token-details">
                <h3>
                  {dexData?.mainPair?.baseToken?.name || "LockChain"} (
                  {dexData?.mainPair?.baseToken?.symbol || "LOCK"})
                </h3>
                <div
                  style={{
                    position: "absolute",
                    right: "10px",
                    top: "10px",
                  }}
                  className="leaderboard-title"
                >
                  {/* <h2>LockChain Holders</h2> */}
                  {/* <div className="leaderboard-controls">
                    <button
                      className="theme-toggle"
                      onClick={toggleTheme}
                      aria-label="Toggle theme"
                    >
                      {darkMode ? "☀️" : "🌙"}
                    </button>
                  </div> */}
                </div>
                <div className="social-links">
                  {STATIC_SOCIAL_LINKS.map((social) => (
                    <Link
                      key={social.type}
                      href={social.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="social-link"
                    >
                      {social.type}
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            <div className="market-stats">
              <div className="stat-grid">
                <div className="stat-box">
                  <h4>Price Change</h4>
                  <div className="price-changes">
                    <span
                      className={`change ${
                        dexData?.mainPair?.priceChange?.h24 > 0
                          ? "positive"
                          : "negative"
                      }`}
                    >
                      24h:{" "}
                      <AnimatedNumber
                        value={Number(dexData?.mainPair?.priceChange?.h24 || 0)}
                        duration={1000}
                        formatValue={(value) => formatNumber(value, 2)}
                      />
                      %
                    </span>
                    <span
                      className={`change ${
                        dexData?.mainPair?.priceChange?.h1 > 0
                          ? "positive"
                          : "negative"
                      }`}
                    >
                      1h:{" "}
                      <AnimatedNumber
                        value={Number(dexData?.mainPair?.priceChange?.h1 || 0)}
                        duration={1000}
                        formatValue={(value) => formatNumber(value, 2)}
                      />
                      %
                    </span>
                  </div>
                </div>
                <div className="stat-box">
                  <h4>Liquidity</h4>
                  <p>
                    <AnimatedNumber
                      value={dexData?.mainPair?.liquidity?.usd || 0}
                      duration={1500}
                      formatValue={(value) => "$" + formatNumber(value, 2)}
                    />
                  </p>
                </div>
                <div className="stat-box">
                  <h4>24h Volume</h4>
                  <p>
                    <AnimatedNumber
                      value={dexData?.mainPair?.volume?.h24 || 0}
                      duration={1500}
                      formatValue={(value) => "$" + formatNumber(value, 2)}
                    />
                  </p>
                </div>
                <div className="stat-box">
                  <h4>24h Transactions</h4>
                  <div className="txn-stats">
                    <span className="buys">
                      Buys: {dexData?.mainPair?.txns?.h24?.buys || 0}
                    </span>
                    <span className="sells">
                      Sells: {dexData?.mainPair?.txns?.h24?.sells || 0}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Second toggle after token-stats-container */}
          <div className="live-mode-toggle">
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={liveMode}
                onChange={toggleLiveMode} // Use the safe toggle function
                disabled={isRefreshing || liveModeInCooldown}
              />
              <span className="toggle-slider"></span>
            </label>
            <span className="toggle-label">
              {liveMode ? "Live Updates On" : "Live Updates Off"}
            </span>
            {liveMode && (
              <span className="live-indicator">
                <span className="live-dot"></span>
                <span className="api-calls">
                  {apiCallsCount.current}/{API_CALL_LIMIT} calls
                </span>
              </span>
            )}
            {liveModeInCooldown && (
              <span className="cooldown-indicator">
                <span className="cooldown-dot"></span>
                <span className="cooldown-text">
                  Cooldown: {Math.ceil((cooldownEndTime - Date.now()) / 1000)}s
                </span>
              </span>
            )}
          </div>

          {/* Update your refresh button container */}

          <div className="ld-refresh-button-container">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing || liveMode}
              className={`ld-refresh-button ${
                liveMode ? "live-mode-active" : ""
              }`}
            >
              {isRefreshing ? (
                <>
                  <span className="spinner"></span>
                  Refreshing...
                </>
              ) : (
                <>
                  <span>🔄</span>
                  {liveMode ? "Live Updates Active" : "Refresh Data"}
                </>
              )}
            </button>

            {!liveMode && (
              <div className="refresh-hint">
                Last update:{" "}
                {lastRefreshTime
                  ? new Date(lastRefreshTime).toLocaleTimeString()
                  : "Never"}
              </div>
            )}
            {liveMode && (
              <div className="refresh-hint">
                <span className="live-dot"></span>
                Direct from Moralis - Updating every 10s
              </div>
            )}
          </div>

          <p
            className="data-note"
            style={{
              textAlign: "center",
              color: "#666",
              fontSize: "0.9rem",
              marginBottom: "20px",
            }}
          >
            Data is based on recent transactions and may not reflect real-time
            holdings
          </p>
          <div
            ref={(el) => {
              scrollRef.current = el;
              tableContainerRef.current = el;
            }}
            className={`leaderboard-table-container ${
              isMobileView ? "mobile-view" : ""
            }`}
            style={{
              height: "600px", // Keep this consistent
              overflow: "auto",
              position: "relative",
              width: "100%",
              margin: "0 auto",
            }}
          >
            {isMobileView ? (
              <div
                style={{
                  height: `${Math.min(
                    rowVirtualizer.getTotalSize(),
                    holders.length * 65 // Adjust to a more appropriate height
                  )}px`,
                  width: "100%",
                  position: "relative",
                  margin: "0 auto",
                }}
              >
                {renderMobileVirtualizedList()}
              </div>
            ) : (
              <>
                {renderTableHeaders()}
                <div
                  style={{
                    height: `${Math.min(
                      rowVirtualizer.getTotalSize(),
                      holders.length * 60
                    )}px`,
                    width: "100%",
                    position: "relative",
                    minWidth: "800px",
                    margin: "0 auto",
                  }}
                >
                  {renderVirtualizedList()}
                </div>
              </>
            )}
          </div>

          <div ref={inViewRef} style={{ height: "20px" }} />

          <div className="pagination-container">
            <button
              className="pagination-button"
              onClick={() => handlePageNavigation("prev")}
              disabled={currentPage === 1}
            >
              ←
            </button>

            <div className="pagination-numbers">
              {[...Array(totalPages)].map((_, index) => {
                const pageNumber = index + 1;
                if (
                  pageNumber <= 3 ||
                  pageNumber > totalPages - 3 ||
                  (pageNumber >= currentPage - 1 &&
                    pageNumber <= currentPage + 1)
                ) {
                  return (
                    <button
                      key={pageNumber}
                      className={`pagination-number ${
                        pageNumber === currentPage ? "active" : ""
                      }`}
                      onClick={() => paginate(pageNumber)}
                    >
                      {pageNumber}
                    </button>
                  );
                } else if (
                  (pageNumber === 4 && currentPage > 5) ||
                  (pageNumber === totalPages - 3 &&
                    currentPage < totalPages - 4)
                ) {
                  return (
                    <span key={pageNumber} className="pagination-ellipsis">
                      ...
                    </span>
                  );
                }
                return null;
              })}
            </div>

            <button
              className="pagination-button"
              onClick={() => handlePageNavigation("next")}
              disabled={currentPage === totalPages}
            >
              →
            </button>

            <div className="pagination-info">
              Page{" "}
              <button
                className="page-link"
                onClick={() => setIsModalOpen(true)}
                title="Click to jump to a specific page"
              >
                {currentPage}
              </button>{" "}
              of{" "}
              <button
                className="page-link"
                onClick={() => setIsModalOpen(true)}
                title="Click to jump to a specific page"
              >
                {totalPages}
              </button>
            </div>
          </div>

          <Modal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            title="Jump to Page"
          >
            <div className="modal-content">
              <input
                type="number"
                min="1"
                max={totalPages}
                value={currentPage}
                onChange={(e) => {
                  const page = parseInt(e.target.value, 10);
                  if (page >= 1 && page <= totalPages) {
                    setCurrentPage(page);
                  }
                }}
                className="page-input"
              />
              <button
                onClick={() => setIsModalOpen(false)}
                className="modal-close-button"
              >
                Go
              </button>
            </div>
          </Modal>
        </motion.div>
      </div>
    );
  };

  // Add this function to your Leaderboard.js component
  const openFullscreenChat = () => {
    // Store wallet data and holder data in localStorage
    if (userWalletData) {
      try {
        localStorage.setItem("userWalletData", JSON.stringify(userWalletData));
      } catch (error) {
        console.error("Error storing wallet data:", error);
      }
    }

    if (userHolderData) {
      try {
        localStorage.setItem("userHolderData", JSON.stringify(userHolderData));
      } catch (error) {
        console.error("Error storing holder data:", error);
      }
    }

    // Navigate to chat page
    router.push("/chat");
  };

  // Final return
  return renderContent();
}
