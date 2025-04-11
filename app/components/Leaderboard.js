"use client";

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
import defaultTokenLogo from "../images/logo.png";
import Messages from "./Messages";
import { useToast } from "../context/ToastContext";
import { useWalletClaim } from "../context/WalletClaimContext";

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

const getRankTitle = (rank) => {
  if (rank <= 10) {
    return RANK_TITLES[rank];
  } else if (rank <= 50) {
    return { title: "The Chosen", color: "#b2b1fc", badge: "⭐" };
  }
  return { title: "Token Holder", color: "#6286fc", badge: "🔒" };
};

const fetcher = async (url, { refreshData } = {}) => {
  try {
    const fetchUrl = refreshData ? `${url}?refresh=true` : url;

    const cachedData = sessionStorage.getItem(`cache_${url}`);
    const cachedTimestamp = sessionStorage.getItem(`cache_timestamp_${url}`);
    const now = Date.now();

    if (cachedData && cachedTimestamp && !refreshData) {
      if (now - parseInt(cachedTimestamp) < 30000) {
        console.log("Using sessionStorage cached data for:", url);
        return JSON.parse(cachedData);
      }
    }

    console.log("Fetching fresh data for:", url);
    const response = await fetch(fetchUrl);

    if (!response.ok) {
      throw new Error(`Network response was not ok: ${response.status}`);
    }

    const data = await response.json();

    try {
      sessionStorage.setItem(`cache_${url}`, JSON.stringify(data));
      sessionStorage.setItem(`cache_timestamp_${url}`, now.toString());
    } catch (e) {
      console.warn("Could not cache in sessionStorage:", e);
    }

    return data;
  } catch (error) {
    console.error("Fetching data failed:", error);

    try {
      const cachedData = sessionStorage.getItem(`cache_${url}`);
      if (cachedData) {
        console.log("Using stale cached data after error");
        return JSON.parse(cachedData);
      }
    } catch (e) {
      console.error("Error retrieving cached data:", e);
    }

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

export default function LeaderboardClient({ initialData }) {
  const { showToast } = useToast();
  const { data: session } = useSession();

  const {
    walletClaim,
    userHolderData,
    userHolderIndex,
    checkHolderPosition,
    isCheckingClaim,
    checkWalletClaim,
  } = useWalletClaim();

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

  // Add an error state to track API errors
  const [apiError, setApiError] = useState(null);

  const {
    data,
    error,
    isLoading,
    mutate: refreshData,
  } = useSWR("/api/holders", fetcher, {
    fallbackData: { ...DEFAULT_TOKEN_DATA, ...initialData },
    refreshInterval: 15000,
    revalidateOnFocus: true,
    suspense: false,
    keepPreviousData: true,
    shouldRetryOnError: true,
    errorRetryInterval: 5000,
    errorRetryCount: 3,
    onError: (err) => {
      console.error("Error fetching holders data:", err);
      setApiError(err.message || "Failed to load leaderboard data");
    },
  });

  // Update the handleRefresh function to refresh all data sources

  const handleRefresh = useCallback(async () => {
    const now = Date.now();
    const timeSinceLastRefresh = now - lastRefreshTime;

    // Only allow refresh every 10 seconds to prevent API spam
    if (isRefreshing || timeSinceLastRefresh < 10000) {
      showToast("Please wait before refreshing again", "info");
      return;
    }

    setIsRefreshing(true);
    setLastRefreshTime(now);
    setApiError(null); // Clear any previous errors

    try {
      // 1. Force refresh API data with the refresh=true query parameter
      await refreshData(async () => {
        const response = await fetch("/api/holders?refresh=true");
        if (!response.ok) {
          throw new Error("Failed to refresh holders data");
        }
        return response.json();
      });

      // 2. If user is logged in, refresh wallet claim data
      if (session && walletClaim) {
        await checkHolderPosition(true); // Force refresh holder position
        await checkWalletClaim(true); // Force refresh wallet claim status
      }

      // Show success message
      showToast("Leaderboard data refreshed successfully!", "success");
    } catch (error) {
      console.error("Error refreshing data:", error);
      setApiError(error.message || "Failed to refresh leaderboard data");
      showToast("Failed to refresh data. Please try again.", "error");
    } finally {
      // Delay setting isRefreshing to false to show the spinner for at least 1 second
      setTimeout(() => setIsRefreshing(false), 1000);
    }
  }, [
    refreshData,
    lastRefreshTime,
    showToast,
    session,
    walletClaim,
    checkHolderPosition,
    checkWalletClaim,
  ]);

  useEffect(() => {
    setMounted(true);
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

  useEffect(() => {
    if (data?.holders?.length > 0) {
      checkHolderPosition(data.holders);
      setClaimChecked(true);
    }
  }, [data?.holders, checkHolderPosition]);

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

  const rowVirtualizer = useVirtualizer({
    count: holdersPerPage,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 60,
    overscan: 5,
    scrollToFn: (offset, { behavior }) => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = 0;
      }
    },
  });

  const holders = useMemo(() => {
    if (!data?.holders) return [];
    const allHolders = data.holders.map((holder, index) => ({
      ...holder,
      rank: index + 1,
    }));
    return allHolders.slice(indexOfFirstHolder, indexOfLastHolder);
  }, [data?.holders, indexOfFirstHolder, indexOfLastHolder]);

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

  if (!mounted) return null;

  if (isLoading) {
    return (
      <div style={{ marginTop: "60px" }} className="leaderboard-container-bg">
        <div className="leaderboard-container">
          <h2 className="leaderboard-title">Loading holders data...</h2>
          <div className="loading-spinner-leaderboard" />
        </div>
      </div>
    );
  }

  // Display the maintenance message when API is in maintenance mode or on error
  if (
    (data?.maintenanceMode || error || apiError) &&
    (!data?.holders || data.holders.length === 0)
  ) {
    return (
      <div className="leaderboard-container-bg">
        <div className="leaderboard-container">
          <MaintenanceMessage
            error={apiError || error?.message || ""}
            onRetry={handleRefresh}
          />
        </div>
      </div>
    );
  }

  if (!data || !data.holders || data.holders.length === 0) {
    return (
      <div style={{ marginTop: "60px" }} className="leaderboard-container-bg">
        <div className="leaderboard-container">
          <h2 className="leaderboard-title">No holder data available</h2>
        </div>
      </div>
    );
  }

  const renderTableHeaders = () =>
    mounted && (
      <div className="table-header">
        <div className="header-content">
          <span>Rank</span>
          <span>Wallet Address</span>
          <span>Holdings</span>
          <span>Percentage</span>
          <span>Value (USD)</span>
        </div>
      </div>
    );

  const renderVirtualizedList = () => {
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
                {holder.social && holder.social.showProfile !== false && (
                  <Link
                    href={`/public-profile/${holder.social.twitter}`}
                    className="twitter-link"
                  >
                    <Image
                      src={holder.social.profileImage}
                      alt={holder.social.name}
                      width={20}
                      height={20}
                      className="twitter-avatar"
                    />
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
          </div>
        </div>
      );
    });
  };

  return (
    <div
      style={{
        paddingTop: "68px",
      }}
      className="leaderboard-container-bg"
    >
      <motion.div
        style={{
          overflowX: "hidden",
        }}
        className="leaderboard-container fade-in"
      >
        {session && (
          <>
            {isCheckingClaim ? (
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
            ) : walletClaim && userHolderData ? (
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
                      }}
                      title="Copy to clipboard"
                    >
                      📋
                    </button>
                  </div>
                </div>

                <div className="user-stats-content">
                  <div className="user-stat-card rank-card">
                    <div className="stat-value">#{userHolderData.rank}</div>
                    <div className="stat-label">Position</div>
                  </div>

                  <div className="user-stat-card holdings-card">
                    <div className="stat-value">
                      {Number(userHolderData.balance_formatted).toFixed(2)}
                    </div>
                    <div className="stat-label">Tokens</div>
                  </div>

                  <div className="user-stat-card value-card">
                    <div className="stat-value">
                      $
                      {Number(userHolderData.usdValue).toLocaleString(
                        undefined,
                        {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        }
                      )}
                    </div>
                    <div className="stat-label">Value</div>
                  </div>
                </div>
              </div>
            ) : null}
          </>
        )}
        <h2 className="leaderboard-title">Top 500 Token Holders</h2>
        <div className="leaderboard-stats">
          <div className="stat-item">
            <span className="stat-label">Total Supply</span>
            <span className="stat-value">
              <span className="desktop-only">{formatSupply(totalSupply)}</span>
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
        </div>
        <div className="token-stats-container">
          <div className="token-info">
            <Image
              src={dexData?.mainPair?.info?.imageUrl || defaultTokenLogo}
              alt="Token Logo"
              width={48}
              height={48}
              className="token-logo"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = defaultTokenLogo.src;
              }}
            />
            <div className="token-details">
              <h3>
                {dexData?.mainPair?.baseToken?.name || "LockChain"} (
                {dexData?.mainPair?.baseToken?.symbol || "LOCK"})
              </h3>
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
                      value={dexData?.mainPair?.priceChange?.h24 || 0}
                      duration={1000}
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
                      value={dexData?.mainPair?.priceChange?.h1 || 0}
                      duration={1000}
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
                  />
                </p>
              </div>
              <div className="stat-box">
                <h4>24h Volume</h4>
                <p>
                  <AnimatedNumber
                    value={dexData?.mainPair?.volume?.h24 || 0}
                    duration={1500}
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

        {/* <div
          className="refresh-button-container"
          style={{
            display: "flex",
            justifyContent: "center",
            margin: "10px 0",
          }}
        >
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="refresh-button"
            style={{
              background: "rgba(98, 134, 252, 0.1)",
              border: "1px solid rgba(98, 134, 252, 0.3)",
              padding: "8px 16px",
              borderRadius: "8px",
              color: "#6286fc",
              fontWeight: "500",
              cursor: isRefreshing ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              transition: "all 0.2s ease",
            }}
          >
            {isRefreshing ? (
              <>
                <span
                  className="spinner"
                  style={{
                    display: "inline-block",
                    width: "16px",
                    height: "16px",
                    border: "2px solid rgba(98, 134, 252, 0.3)",
                    borderTop: "2px solid #6286fc",
                    borderRadius: "50%",
                    animation: "spin 1s linear infinite",
                  }}
                ></span>
                Refreshing...
              </>
            ) : (
              <>
                <span>🔄</span>
                Refresh Data
              </>
            )}
          </button>
        </div> */}

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
          className="leaderboard-table-container"
          style={{
            height: "600px",
            overflow: "auto",
            position: "relative",
            width: "100%",
            margin: "0 auto",
          }}
        >
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
                (pageNumber >= currentPage - 1 && pageNumber <= currentPage + 1)
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
                (pageNumber === totalPages - 3 && currentPage < totalPages - 4)
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
          onSubmit={setCurrentPage}
          totalPages={totalPages}
        />

        {/* {mounted && (
          <Messages
            session={session}
            userWalletData={walletClaim}
            userHolderData={userHolderData}
          />
        )} */}
      </motion.div>
    </div>
  );
}
