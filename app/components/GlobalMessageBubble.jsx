"use client";
import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGlobalMessages } from "../context/GlobalMessagesContext";
import Messages from "./Messages";
import { useSession } from "next-auth/react";
import "../styles/GlobalMessageBubble.css";

export default function GlobalMessageBubble({
  userWalletData,
  userHolderData,
}) {
  const {
    messages,
    isMinimized,
    unreadCount,
    isLoading,
    toggleMinimized,
    minimize,
  } = useGlobalMessages();

  const { data: session } = useSession();

  return (
    <div className="global-message-container">
      <AnimatePresence>
        {!isMinimized && (
          <motion.div
            className="global-message-expanded"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: "spring", damping: 25 }}
          >
            <div className="global-message-header">
              <h3>Messages</h3>
              <button onClick={minimize} className="close-button">
                ×
              </button>
            </div>
            <div className="global-message-content">
              {isLoading ? (
                <div className="message-loading-state">
                  <div className="message-loading-spinner"></div>
                  <p>Loading messages...</p>
                </div>
              ) : (
                <Messages
                  session={session}
                  userWalletData={userWalletData}
                  userHolderData={userHolderData}
                  compactMode={true}
                  inGlobalContext={true}
                  preserveMessageStyles={true}
                />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        className="global-message-bubble"
        onClick={toggleMinimized}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <span className="bubble-icon">💬</span>
        {unreadCount > 0 && (
          <span className="bubble-badge">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </motion.button>
    </div>
  );
}
