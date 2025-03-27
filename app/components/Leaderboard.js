"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { useInView } from "react-intersection-observer";
import { motion } from "framer-motion";
import { useVirtualizer } from "@tanstack/react-virtual";
import useSWR from "swr";
import AnimatedNumber from "./AnimatedNumber";
import Modal from "./Modal";
import Tooltip from "./Tooltip";
import "../styles/Leaderboard.css";
import Link from "next/link";
import Image from "next/image";

const MAX_SUPPLY = 1_000_000_000;
const DEFAULT_TOKEN_DATA = {
  totalSupply: MAX_SUPPLY,
  totalHolders: 0,
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
  1: { title: "The Lockmaster", color: "#FFD700", badge: "👑" },
  2: { title: "Diamond Vault", color: "#C0C0C0", badge: "💎" },
  3: { title: "Diamond Vault", color: "#CD7F32", badge: "💎" },
  4: { title: "Diamond Vault", color: "#6286fc", badge: "💎" },
  5: { title: "Diamond Vault", color: "#6286fc", badge: "💎" },
  6: { title: "Guardian of the Lock", color: "#7DA0FF", badge: "🛡️" },
  7: { title: "Guardian of the Lock", color: "#7DA0FF", badge: "🛡️" },
  8: { title: "Guardian of the Lock", color: "#7DA0FF", badge: "🛡️" },
  9: { title: "Guardian of the Lock", color: "#7DA0FF", badge: "🛡️" },
  10: { title: "Guardian of the Lock", color: "#7DA0FF", badge: "🛡️" },
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

export default function LeaderboardClient({ initialData }) {
  const [mounted, setMounted] = useState(false);
  const scrollRef = useRef(null);
  const { ref: inViewRef, inView } = useInView();

  const [currentPage, setCurrentPage] = useState(1);
  const [holdersPerPage] = useState(20);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const animationTimeoutRef = useRef(null);
  // const animationIntervalRef = useRef(null);

  const { data, error, isLoading } = useSWR("/api/holders", fetcher, {
    fallbackData: { ...DEFAULT_TOKEN_DATA, ...initialData },
    refreshInterval: 15000, // Refresh every 15 seconds
    revalidateOnFocus: true,
    suspense: false,
    keepPreviousData: true,
    shouldRetryOnError: true,
    errorRetryInterval: 5000,
    errorRetryCount: 3,
  });

  // Move useEffect to top level
  useEffect(() => {
    setMounted(true);
  }, []);

  // Update animation effect
  useEffect(() => {
    const startAnimation = () => {
      setIsAnimating(true);
      // Remove the class after 1 minute
      animationTimeoutRef.current = setTimeout(() => {
        setIsAnimating(false);
        // Wait 30 seconds before starting again
        animationTimeoutRef.current = setTimeout(() => {
          startAnimation();
        }, 30000);
      }, 60000); // 1 minute
    };

    // Start the first animation
    startAnimation();

    return () => {
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }
    };
  }, []);

  const {
    totalSupply = MAX_SUPPLY,
    totalHolders = 0,
    tokenPrice = 0,
    dexData = DEFAULT_TOKEN_DATA.dexData,
  } = data || {};

  const indexOfLastHolder = currentPage * holdersPerPage;
  const indexOfFirstHolder = indexOfLastHolder - holdersPerPage;

  // Update virtualization to use currentHolders instead of all holders
  const rowVirtualizer = useVirtualizer({
    count: holdersPerPage,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 60,
    overscan: 5,
    scrollToFn: (offset, { behavior }) => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = 0; // Reset scroll position on page change
      }
    },
  });

  // Update holders memo to include pagination
  const holders = useMemo(() => {
    if (!data?.holders) return [];
    const allHolders = data.holders.map((holder, index) => ({
      ...holder,
      rank: index + 1,
    }));
    return allHolders.slice(indexOfFirstHolder, indexOfLastHolder);
  }, [data?.holders, indexOfFirstHolder, indexOfLastHolder]);

  // Add page change effect
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

  // Early return for non-mounted state
  if (!mounted) return null;

  // Render loading state
  if (isLoading) {
    return (
      <div style={{ marginTop: "60px" }} className="leaderboard-container-bg">
        <div className="leaderboard-container">
          <h2 className="leaderboard-title">Loading holders data...</h2>
          <div className="loading-spinner" />
        </div>
      </div>
    );
  }

  // Render error state
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

  // Ensure data and holders exist before rendering
  if (!data || !data.holders || data.holders.length === 0) {
    return (
      <div style={{ marginTop: "60px" }} className="leaderboard-container-bg">
        <div className="leaderboard-container">
          <h2 className="leaderboard-title">No holder data available</h2>
        </div>
      </div>
    );
  }

  // First, update the table headers function
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

  // Then, update the virtualized list rendering
  const renderVirtualizedList = () => {
    if (!mounted) return null;

    return rowVirtualizer.getVirtualItems().map((virtualRow) => {
      const holder = holders[virtualRow.index];
      if (!holder) return null;

      // Calculate USD value using token price
      const usdValue = Number(holder.value) * Number(tokenPrice);
      const rankTitle = getRankTitle(holder.rank);

      return (
        <div
          key={holder.address}
          className="holder-row"
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
              <Link
                href={`https://bscscan.com/address/${holder.address}`}
                target="_blank"
                rel="noopener noreferrer"
                className="address-link"
              >
                {holder.address}
              </Link>
            </div>
            <div className="holdings">
              <AnimatedNumber
                value={Number(holder.value).toFixed(2)}
                duration={1000}
                formatValue={(value) =>
                  value.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })
                }
              />
            </div>
            <div className="percentage">
              <AnimatedNumber
                value={Number(holder.percentage).toFixed(2)}
                duration={1000}
                formatValue={(value) =>
                  value.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })
                }
              />
              %
            </div>
            <div className="value">
              <AnimatedNumber
                value={usdValue.toFixed(2)}
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
              $
            </div>
          </div>
        </div>
      );
    });
  };

  // Main render
  return (
    <div style={{ marginTop: "60px" }} className="leaderboard-container-bg">
      <motion.div className="leaderboard-container fade-in">
        <h2 className="leaderboard-title">Top 500 Token Holders</h2>
        <div className="leaderboard-stats">
          <div className="stat-item">
            <span className="stat-label">Total Supply:</span>
            <span className="stat-value">
              <AnimatedNumber value={totalSupply} duration={2000} /> Tokens
            </span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Total Holders:</span>
            <span className="stat-value">
              <AnimatedNumber value={totalHolders} duration={1500} />
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
              src={dexData?.mainPair?.info?.imageUrl || ""}
              alt="Token Logo"
              width={48}
              height={48}
              className="token-logo"
              onError={(e) => {
                e.target.src =
                  "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/smartchain/assets/0x5C85D6C6825aB4032337F11Ee92a72DF936b46F6/logo.png";
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
              // Show first 3, last 3, and 2 around current page
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
      </motion.div>
    </div>
  );
}
