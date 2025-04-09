import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LuClipboard, LuClipboardCheck } from "react-icons/lu";
import { FaRegClock } from "react-icons/fa";
import { IoCloseOutline } from "react-icons/io5";

// Helper function for date formatting without date-fns
const formatDate = (date) => {
  if (!date) return "";
  const d = new Date(date);

  // Format as "MMM d, yyyy h:mm a"
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const month = months[d.getMonth()];
  const day = d.getDate();
  const year = d.getFullYear();

  let hours = d.getHours();
  const minutes = d.getMinutes().toString().padStart(2, "0");
  const ampm = hours >= 12 ? "pm" : "am";

  hours = hours % 12;
  hours = hours ? hours : 12; // the hour '0' should be '12'

  return `${month} ${day}, ${year} ${hours}:${minutes} ${ampm}`;
};

export default function MessageArchive({
  isOpen,
  onClose,
  username,
  walletAddress,
  profileImage,
  rank,
}) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [sortOrder, setSortOrder] = useState("newest"); // 'newest' or 'oldest'
  const [userStats, setUserStats] = useState(null);

  // Fetch user's message history when the component mounts or user changes
  useEffect(() => {
    if (!isOpen || (!username && !walletAddress)) return;

    const fetchUserMessages = async () => {
      setLoading(true);
      try {
        // Build URL with query parameters
        let url = "/api/messages/history?";
        const params = new URLSearchParams();

        if (username) {
          params.append("username", username);
        }

        if (walletAddress) {
          params.append("walletAddress", walletAddress);
        }

        url += params.toString();
        console.log("Fetching from:", url);

        const response = await fetch(url);
        const data = await response.json();

        if (!response.ok) {
          // Check if it's an index error
          if (data.details && data.details.includes("index")) {
            setError("Creating message index. Please try again in a moment.");
            console.log("Index being created:", data.details);
          } else {
            throw new Error(data.error || "Failed to fetch message history");
          }
        } else {
          setMessages(data.messages || []);
        }
      } catch (error) {
        console.error("Error fetching message history:", error);
        setError(
          error.message ||
            "Failed to load message history. Please try again later."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchUserMessages();
  }, [isOpen, username, walletAddress]);

  // Fetch holder data when the component mounts or walletAddress changes
  useEffect(() => {
    if (!isOpen || !walletAddress) return;

    const fetchHolderData = async () => {
      try {
        setUserStats(null); // Clear previous stats while loading

        const response = await fetch(
          `/api/holder-data?address=${walletAddress}`
        );

        const data = await response.json();

        if (response.ok && data.success && data.data) {
          setUserStats({
            rank: data.data.rank || 0,
            balance: data.data.balance_formatted || 0,
            percentage: data.data.percentage || 0,
            usdValue: data.data.usdValue || 0,
          });
        } else {
          console.log("Holder data response:", data);
          // Don't set error state, just log it to console
        }
      } catch (error) {
        console.error("Error fetching holder data:", error);
      }
    };

    fetchHolderData();
  }, [isOpen, walletAddress]);

  const copyToClipboard = async () => {
    if (!walletAddress) return;

    try {
      await navigator.clipboard.writeText(walletAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy wallet address:", err);
    }
  };

  const toggleSortOrder = () => {
    setSortOrder(sortOrder === "newest" ? "oldest" : "newest");
  };

  const sortedMessages = [...messages].sort((a, b) => {
    const dateA = new Date(a.timestamp).getTime();
    const dateB = new Date(b.timestamp).getTime();
    return sortOrder === "newest" ? dateB - dateA : dateA - dateB;
  });

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="message-archive-overlay-archive">
        <motion.div
          className="message-archive-container-archive"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          transition={{ type: "spring", damping: 25 }}
        >
          <div className="message-archive-header-archive">
            <div className="user-profile-archive">
              <div className="user-avatar-archive">
                <img
                  src={profileImage || "/default-avatar.png"}
                  alt={username}
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = "/default-avatar.png";
                  }}
                />
              </div>
              <div className="user-info-archive">
                <h3>{username}</h3>
                {walletAddress && (
                  <div className="wallet-address-archive">
                    <span className="address-text-archive">
                      {walletAddress.substring(0, 6)}...
                      {walletAddress.substring(walletAddress.length - 4)}
                    </span>
                    <button
                      onClick={copyToClipboard}
                      className="copy-btn-archive"
                      title="Copy full address"
                    >
                      {copied ? (
                        <LuClipboardCheck size={16} />
                      ) : (
                        <LuClipboard size={16} />
                      )}
                    </button>
                  </div>
                )}
                {rank && (
                  <div className="user-rank-archive">
                    Rank: <span className="rank-value-archive">#{rank}</span>
                  </div>
                )}
              </div>
            </div>
            <button className="close-btn-archive" onClick={onClose}>
              <IoCloseOutline size={24} />
            </button>
          </div>

          {walletAddress && (
            <div className="user-stats-archive">
              <div className="stats-header-archive">
                <h4>Holder Stats</h4>
                {loading && <div className="mini-spinner-archive"></div>}
              </div>

              {userStats ? (
                <div className="stats-grid-archive">
                  {userStats.rank > 0 && (
                    <div className="stat-item-archive">
                      <div className="stat-label-archive">Rank</div>
                      <div
                        className="stat-value-archive"
                        style={{ color: "#FFD700" }}
                      >
                        #{userStats.rank}
                      </div>
                    </div>
                  )}

                  {userStats.balance > 0 && (
                    <div className="stat-item-archive">
                      <div className="stat-label-archive">Balance</div>
                      <div
                        className="stat-value-archive"
                        style={{ color: "#6286fc" }}
                      >
                        {parseFloat(userStats.balance).toLocaleString(
                          undefined,
                          {
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 2,
                          }
                        )}
                      </div>
                    </div>
                  )}

                  {userStats.usdValue > 0 && (
                    <div className="stat-item-archive">
                      <div className="stat-label-archive">Value</div>
                      <div
                        className="stat-value-archive"
                        style={{ color: "#4cd964" }}
                      >
                        ${parseFloat(userStats.usdValue).toLocaleString()}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="no-stats-message-archive">
                  No holder data available for this wallet
                </div>
              )}
            </div>
          )}

          <div className="message-archive-content-archive">
            <div className="message-history-header-archive">
              <h4>Message History</h4>
              <button
                className="sort-toggle-archive"
                onClick={toggleSortOrder}
                title={`Sort by ${
                  sortOrder === "newest" ? "oldest" : "newest"
                } first`}
              >
                <FaRegClock size={14} />
                {sortOrder === "newest" ? "Newest First" : "Oldest First"}
              </button>
            </div>

            {loading ? (
              <div className="loading-state-archive">
                <div className="spinner-archive"></div>
                <p>Loading messages...</p>
              </div>
            ) : error ? (
              <div className="error-state-archive">
                <p>{error}</p>
              </div>
            ) : sortedMessages.length === 0 ? (
              <div className="empty-state-archive">
                <p>No messages found for this user.</p>
              </div>
            ) : (
              <div className="messages-list-archive">
                {sortedMessages.map((msg) => {
                  // Extract custom style if available
                  const customStyle = msg.customStyle || {};

                  // Apply the message styles similar to how they're applied in Messages.jsx
                  let messageStyle = {
                    color: customStyle.textColor || "#ffffff",
                    borderRadius: "12px",
                  };

                  // Add background - either gradient or solid
                  messageStyle.background =
                    customStyle.gradient ||
                    customStyle.bgColor ||
                    "rgba(14, 14, 14, 0.95)";

                  return (
                    <div
                      key={msg.id}
                      className="message-item-archive"
                      style={messageStyle}
                    >
                      <div className="message-item-header-archive">
                        <span className="message-timestamp-archive">
                          {formatDate(msg.timestamp)}
                        </span>
                      </div>
                      <div className="message-item-content-archive">
                        <p
                          className="message-text-archive"
                          style={{
                            color: customStyle.textColor || "#ffffff",
                            fontFamily:
                              customStyle.fontFamily !== "inherit"
                                ? customStyle.fontFamily
                                : "inherit",
                            fontWeight:
                              customStyle.fontWeight !== "normal"
                                ? customStyle.fontWeight
                                : "normal",
                            fontStyle:
                              customStyle.fontStyle !== "normal"
                                ? customStyle.fontStyle
                                : "normal",
                          }}
                        >
                          {msg.text}
                        </p>
                        {customStyle.sticker && (
                          <div className="archive-message-sticker-archive">
                            {customStyle.sticker}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
