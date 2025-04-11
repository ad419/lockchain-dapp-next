import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import "../styles/MessageArchive.css";

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

  useEffect(() => {
    if (!isOpen || !walletAddress) return;

    const fetchUserMessages = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `/api/user-messages?walletAddress=${walletAddress}`
        );

        if (!response.ok) {
          throw new Error("Failed to fetch user messages");
        }

        const data = await response.json();
        setMessages(data.messages);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching user messages:", error);
        setError("Could not load messages for this user.");
        setLoading(false);
      }
    };

    fetchUserMessages();
  }, [isOpen, walletAddress]);

  if (!isOpen) return null;

  // Get rank badge based on rank
  const getRankBadge = (rank) => {
    if (!rank) return null;

    if (rank === 1) return { emoji: "👑", color: "#FFD700" };
    else if (rank <= 3) return { emoji: "💎", color: "#C0C0C0" };
    else if (rank <= 10) return { emoji: "🛡️", color: "#CD7F32" };
    else return { emoji: "🔒", color: "#6286fc" };
  };

  const rankBadge = getRankBadge(rank);

  return (
    <motion.div
      className="message-archive-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="message-archive-container"
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 50, opacity: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 500 }}
      >
        <div className="archive-header">
          <div className="user-profile">
            <div className="profile-image-container">
              <img
                src={profileImage || "/default-avatar.png"}
                alt={username}
                className="profile-image"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = "/default-avatar.png";
                }}
              />
              {rankBadge && (
                <div
                  className="rank-badge"
                  style={{ backgroundColor: rankBadge.color }}
                >
                  <span>{rankBadge.emoji}</span>
                  {rank && <span className="rank-number">#{rank}</span>}
                </div>
              )}
            </div>
            <div className="user-info">
              <h3>@{username}</h3>
              <div className="wallet-address">
                {walletAddress
                  ? `${walletAddress.substring(
                      0,
                      6
                    )}...${walletAddress.substring(walletAddress.length - 4)}`
                  : "No wallet connected"}
              </div>
            </div>
          </div>
          <button className="close-button" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="archive-content">
          <h4>Message History</h4>

          {loading ? (
            <div className="loading-indicator">
              <div className="spinner"></div>
              <p>Loading messages...</p>
            </div>
          ) : error ? (
            <div className="error-message">{error}</div>
          ) : messages.length === 0 ? (
            <div className="no-messages">No messages found for this user.</div>
          ) : (
            <div className="messages-list">
              {messages.map((msg, index) => (
                <div key={msg.id || index} className="archive-message">
                  <div className="message-time">
                    {new Date(msg.timestamp).toLocaleString()}
                  </div>
                  <div className="message-text">{msg.text}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
