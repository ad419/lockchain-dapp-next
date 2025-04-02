"use client";

import { useEffect, useMemo, useState, useRef } from "react";
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
import defaultTokenLogo from "../images/logo.png"; // Add your default token image
import Messages from "./Messages";

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

const fetcher = async (url) => {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error("Network response was not ok");
    }
    return response.json();
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

export default function LeaderboardClient({ initialData }) {
  const { data: session } = useSession();
  const [mounted, setMounted] = useState(false);
  const scrollRef = useRef(null);
  const { ref: inViewRef, inView } = useInView();

  const [currentPage, setCurrentPage] = useState(1);
  const [holdersPerPage] = useState(20);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const animationTimeoutRef = useRef(null);

  const [userHolderData, setUserHolderData] = useState(null);
  const [userHolderIndex, setUserHolderIndex] = useState(null);
  const [userWalletData, setUserWalletData] = useState(null);
  const [claimChecked, setClaimChecked] = useState(false);

  // Update the SWR hook to include polling
  const { data, error, isLoading, mutate } = useSWR("/api/holders", {
    refreshInterval: 3000, // Poll every 3 seconds
    dedupingInterval: 1000,
    revalidateOnFocus: true,
    onSuccess: (data) => {
      // Update user holder data when new data arrives
      if (userWalletData?.walletAddress && data?.holders) {
        const holderIndex = data.holders.findIndex(
          (holder) =>
            holder.address.toLowerCase() ===
            userWalletData.walletAddress.toLowerCase()
        );

        if (holderIndex !== -1) {
          setUserHolderData((prevData) => ({
            ...prevData,
            ...data.holders[holderIndex],
            rank: holderIndex + 1,
          }));
        }
      }
    },
  });

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
    if (session?.user?.name) {
      async function fetchWalletClaim() {
        try {
          const response = await fetch(
            `/api/check-wallet-claim?twitterUsername=${encodeURIComponent(
              session.user.name
            )}`
          );

          if (!response.ok) throw new Error("Failed to fetch wallet claim");

          const claimData = await response.json();

          if (claimData.hasClaimed && claimData.claim) {
            setUserWalletData(claimData.claim);

            // Find user's position in full holders list
            if (data?.holders?.length > 0) {
              const holderIndex = data.holders.findIndex(
                (holder) =>
                  holder.address.toLowerCase() ===
                  claimData.claim.walletAddress.toLowerCase()
              );

              if (holderIndex !== -1) {
                const holderData = data.holders[holderIndex];
                // Set user holder data with correct rank
                setUserHolderData({
                  ...holderData,
                  rank: holderIndex + 1,
                });
              }
            }
          }
          setClaimChecked(true);
        } catch (error) {
          console.error("Error fetching wallet claim:", error);
        }
      }

      fetchWalletClaim();
    }
  }, [session?.user?.name, data?.holders]);

  useEffect(() => {
    if (userWalletData?.walletAddress && data?.holders) {
      const holderIndex = data.holders.findIndex(
        (holder) =>
          holder.address.toLowerCase() ===
          userWalletData.walletAddress.toLowerCase()
      );

      if (holderIndex !== -1) {
        setUserHolderData((prevData) => ({
          ...prevData,
          ...data.holders[holderIndex],
          rank: holderIndex + 1,
        }));
      }
    }
  }, [data?.holders, userWalletData]);

  useEffect(() => {
    if (!session) {
      setClaimChecked(false);
      setUserWalletData(null);
      setUserHolderData(null);
      setUserHolderIndex(null);
    }
  }, [session]);

  // Add a refresh effect when messages are sent
  useEffect(() => {
    const messageUpdateInterval = setInterval(() => {
      mutate(); // Force refresh holdings data
    }, 5000); // Check every 5 seconds

    return () => clearInterval(messageUpdateInterval);
  }, [mutate]);

  // Add WebSocket connection for real-time updates if available
  useEffect(() => {
    let ws;
    try {
      ws = new WebSocket(
        process.env.NEXT_PUBLIC_WS_URL || "wss://your-websocket-url"
      );

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === "holdings_update") {
          mutate(); // Refresh data when holdings update received
        }
      };

      ws.onerror = (error) => {
        console.error("WebSocket error:", error);
      };

      return () => {
        if (ws) ws.close();
      };
    } catch (error) {
      console.error("WebSocket connection failed:", error);
    }
  }, [mutate]);

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

  const totalPages = Math.ceil((data?.holders?.length ?? 0) / holdersPerPage);

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

  if (error) {
    return (
      <div style={{ marginTop: "60px" }} className="leaderboard-container-bg">
        <div className="leaderboard-container">
          <h2 className="leaderboard-title text-red-500">
            Error loading holders data
          </h2>
          <p>{error.message}</p>
          <details>
            <summary>Error Details</summary>
            <pre>{JSON.stringify(error, null, 2)}</pre>
          </details>
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
        userWalletData &&
        holder.address.toLowerCase() ===
          userWalletData.walletAddress.toLowerCase();
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
                    href={`https://twitter.com/${holder.social.twitter}`}
                    target="_blank"
                    rel="noopener noreferrer"
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
    <div style={{ marginTop: "60px" }} className="leaderboard-container-bg">
      <motion.div className="leaderboard-container fade-in">
        {userWalletData && userHolderData && (
          <div className="user-wallet-stats">
            <div className="user-holder-info">
              <span className="label">Your Wallet:</span>
              <span className="value">{userWalletData.walletAddress}</span>
              <span className="label">Position:</span>
              <span className="value">#{userHolderData.rank}</span>
              <span className="label">Holdings:</span>
              <span className="holdings">
                {Number(userHolderData.balance_formatted).toFixed(2)} tokens
              </span>
              <span className="label">Value:</span>
              <span className="value">
                ${Number(userHolderData.usdValue).toFixed(2)}
              </span>
            </div>
          </div>
        )}
        <h2 className="leaderboard-title">Top 500 Token Holders</h2>
        <div className="leaderboard-stats">
          <div className="stat-item">
            <span className="stat-label">Total Supply:</span>
            <span className="stat-value">
              <AnimatedNumber value={totalSupply} duration={2000} /> Tokens
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
                e.target.onerror = null; // Prevent infinite loop
                e.target.src = defaultTokenLogo.src;
              }}
            />
            <div className="token-details">
              <h3>
                {dexData?.mainPair?.baseToken?.name || "Token"} (
                {dexData?.mainPair?.baseToken?.symbol || "SYMBOL"})
              </h3>
              <div className="social-links">
                {dexData?.mainPair?.info?.socials?.map((social) => (
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
          ref={scrollRef}
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
              height: `${rowVirtualizer.getTotalSize()}px`,
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
        <Messages session={session} userWalletData={userWalletData} />
      </motion.div>
    </div>
  );
}
