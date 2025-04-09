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
import Messages from "./Messages"; // Add this import at the top

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

export default function LeaderboardClient({ initialData }) {
  const { data: session } = useSession();
  const [mounted, setMounted] = useState(false);
  const scrollRef = useRef(null);
  const tableContainerRef = useRef(null);
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
  const [walletDataLoading, setWalletDataLoading] = useState(true);

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
      setWalletDataLoading(true); // Set loading to true when starting the fetch

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
        } finally {
          setWalletDataLoading(false); // Set loading to false when fetch completes
        }
      }

      fetchWalletClaim();
    } else {
      setWalletDataLoading(false); // No session, so no loading needed
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

  // Update the useEffect for scroll handling
  useEffect(() => {
    const handleScroll = () => {
      if (!tableContainerRef.current) return;

      // Need to select the table header after the container is mounted
      // Using a more reliable selector
      const tableHeader =
        tableContainerRef.current.querySelector(".table-header");

      if (tableHeader) {
        // Log for debugging
        console.log("Scroll position:", tableContainerRef.current.scrollTop);

        // Check for vertical scroll with a lower threshold
        if (tableContainerRef.current.scrollTop > 5) {
          // Add the class
          tableHeader.classList.add("scrolled-vertical");
          // Debug
          console.log("Added scrolled-vertical class");
        } else {
          // Remove the class
          tableHeader.classList.remove("scrolled-vertical");
          // Debug
          console.log("Removed scrolled-vertical class");
        }

        // Same for horizontal scroll
        if (tableContainerRef.current.scrollLeft > 5) {
          tableContainerRef.current.classList.add("scrolled");
        } else {
          tableContainerRef.current.classList.remove("scrolled");
        }
      } else {
        console.log("Table header not found"); // Debug
      }
    };

    // Add the event listener only when the component is fully mounted
    if (tableContainerRef.current) {
      console.log("Adding scroll listener"); // Debug
      tableContainerRef.current.addEventListener("scroll", handleScroll);

      // Force an initial check after a short delay
      setTimeout(handleScroll, 100);
    }

    return () => {
      if (tableContainerRef.current) {
        tableContainerRef.current.removeEventListener("scroll", handleScroll);
      }
    };
  }, [mounted]); // Add mounted as a dependency to ensure this runs after mounting

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
    <div style={{ marginTop: "60px" }} className="leaderboard-container-bg">
      <motion.div
        style={{
          overflowX: "hidden",
        }}
        className="leaderboard-container fade-in"
      >
        {session && (
          <>
            {walletDataLoading ? (
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
            ) : userWalletData && userHolderData ? (
              <div className="user-wallet-stats">
                <div className="user-stats-header">
                  <h3>Your Position</h3>
                  <div className="wallet-address-ld">
                    {userWalletData.walletAddress.substring(0, 6)}...
                    {userWalletData.walletAddress.substring(
                      userWalletData.walletAddress.length - 4
                    )}
                    <button
                      className="copy-button-ld"
                      onClick={() => {
                        navigator.clipboard.writeText(
                          userWalletData.walletAddress
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
                e.target.onerror = null; // Prevent infinite loop
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
              )}px`, // Limit height to actual content
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

        {/* Add Messages component here */}
        {mounted && (
          <Messages
            session={session}
            userWalletData={userWalletData}
            userHolderData={userHolderData}
          />
        )}
      </motion.div>
    </div>
  );
}
