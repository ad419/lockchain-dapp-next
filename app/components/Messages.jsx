"use client";
import React, {
  useState,
  useEffect,
  useRef,
  forwardRef,
  useCallback,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useSession } from "next-auth/react";
import { useGlobalMessages } from "../context/GlobalMessagesContext";
import "../styles/Messages.css";
import { useWindowSize } from "../hooks/useWindowSize"; // Create this hook if you don't have it

// Constants for message styling
const MESSAGE_THEMES = [
  { name: "Default", bgColor: "rgba(14, 14, 14, 0.95)", textColor: "#ffffff" },
  {
    name: "Bitcoin Gold",
    gradient: "linear-gradient(135deg, #f7931a, #f4ba36, #ffd700)",
    textColor: "#000000",
  },
  {
    name: "Ethereum",
    gradient: "linear-gradient(135deg, #627eea, #3c58c4)",
    textColor: "#ffffff",
  },
  {
    name: "Cyberpunk",
    gradient: "linear-gradient(135deg, #ff00ff, #00ffff)",
    textColor: "#ffffff",
  },
  {
    name: "Night Trader",
    gradient: "linear-gradient(135deg, #1a1a2e, #16213e)",
    textColor: "#4da8da",
  },
  {
    name: "Blockchain",
    gradient: "linear-gradient(135deg, #0f2027, #203a43, #2c5364)",
    textColor: "#7affaf",
  },
  {
    name: "Metaverse",
    gradient: "linear-gradient(135deg, #5433ff, #20bdff, #a5fecb)",
    textColor: "#ffffff",
  },
  {
    name: "NFT Gallery",
    gradient: "linear-gradient(135deg, #24243e, #302b63, #0f0c29)",
    textColor: "#f8f8f2",
  },
];

const PREMIUM_FONTS = [
  { name: "Default", value: "inherit" },
  { name: "Roboto", value: "'Roboto', sans-serif" },
  { name: "Montserrat", value: "'Montserrat', sans-serif" },
  { name: "Poppins", value: "'Poppins', sans-serif" },
  { name: "Space Grotesk", value: "'Space Grotesk', sans-serif" },
  { name: "Fira Code", value: "'Fira Code', monospace" },
];

const TEXT_EFFECTS = [
  { name: "None", value: null },
  { name: "Neon", value: "neon" },
  { name: "Matrix", value: "matrix" },
  { name: "Glitch", value: "glitch" },
];

const PREMIUM_ANIMATIONS = [
  { name: "None", value: null },
  { name: "Pulse", value: "pulse" },
  { name: "Gradient Shift", value: "gradient" },
  { name: "Rainbow", value: "rainbow" },
  { name: "Glow", value: "glow" },
];

// Constants
const MAX_VISIBLE_MESSAGES = 14;

// Generate a crypto effect for special messages
const generateCryptoEffect = (text, isOwnMessage) => {
  // Only apply to certain messages for visual interest
  if (
    text.includes("blockchain") ||
    text.includes("crypto") ||
    text.includes("token") ||
    text.includes("NFT") ||
    Math.random() > 0.8
  ) {
    return isOwnMessage ? "crypto" : "matrix";
  }
  return "";
};

// Update the Message component to support more customization

const Message = forwardRef(({ msg, userWalletData, ...props }, ref) => {
  const { data: session } = useSession();

  if (!msg) return null;

  const isOwnMessage =
    msg.user === session?.user?.name ||
    msg.walletAddress === userWalletData?.walletAddress;

  const customStyle = msg.customStyle || {};
  const textEffect =
    customStyle.textEffect || generateCryptoEffect(msg.text, isOwnMessage);
  const animationType = customStyle.animationType || null;

  const formattedWalletAddress = msg.walletAddress
    ? `${msg.walletAddress.slice(0, 4)}...${msg.walletAddress.slice(-4)}`
    : "Anonymous";

  const userInitial = (msg.user || "?")[0].toUpperCase();

  // Build style object for the message bubble
  const bubbleStyle = {
    background: customStyle.gradient || customStyle.bgColor,
    color: customStyle.textColor,
    fontFamily: customStyle.fontFamily,
    fontWeight: customStyle.fontWeight || "normal",
    fontStyle: customStyle.fontStyle || "normal",
    fontSize: customStyle.fontSize || "inherit",
    border: customStyle.border,
    // Add max width to prevent messages from being too wide on mobile
    maxWidth: "85%", // Limit width on all devices
    wordBreak: "break-word", // Ensure long words don't overflow
    overflowWrap: "break-word",
  };

  // Add glow effect if specified
  if (customStyle.glow) {
    bubbleStyle.boxShadow = `0 0 15px ${
      customStyle.gradient || customStyle.bgColor
    }`;
  }

  // Determine animation class
  let animationClass = "";
  if (animationType === "pulse") animationClass = "animate-pulse";
  else if (animationType === "gradient") animationClass = "animate-gradient";
  else if (animationType === "rainbow") animationClass = "animate-rainbow";
  else if (animationType === "glow") animationClass = "animate-glow";

  return (
    <motion.div
      id={props.id}
      ref={ref}
      className={`lc-message ${
        isOwnMessage ? "lc-message-sent" : "lc-message-received"
      } ${animationClass}`}
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      transition={{
        type: "spring",
        stiffness: 500,
        damping: 30,
        mass: 1,
        delay: props.index * 0.03,
      }}
    >
      <div className="lc-message-avatar">
        {msg.profileImage ? (
          <img src={msg.profileImage} alt={msg.user || "User"} />
        ) : (
          userInitial
        )}
        {msg.rank && (
          <div className="lc-message-wallet-badge" data-rank={msg.rank}>
            {msg.rank[0].toUpperCase()}
          </div>
        )}
      </div>

      <div className="lc-message-content">
        <div className="lc-message-meta">
          <span className="lc-message-username">{msg.user || "Anonymous"}</span>
          <span className="lc-message-wallet">{formattedWalletAddress}</span>
        </div>
        <div className="lc-message-bubble" style={bubbleStyle}>
          <div className={`lc-message-text ${textEffect}`} data-text={msg.text}>
            {textEffect === "matrix"
              ? // Create spans for matrix effect
                Array.from(msg.text).map((char, i) => (
                  <span key={i} style={{ "--i": i }}>
                    {char}
                  </span>
                ))
              : msg.text}
          </div>
        </div>
        <div className="lc-message-time">
          {new Date(msg.timestamp).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </div>
      </div>

      {props.onDismiss && (
        <div className="lc-message-actions">
          <button
            className="lc-message-action-btn"
            onClick={() => props.onDismiss(msg.id)}
            aria-label="Dismiss message"
          >
            ×
          </button>
        </div>
      )}

      {customStyle.sticker && customStyle.sticker !== "none" && (
        <div className="lc-message-sticker">
          <motion.div
            drag
            dragConstraints={{
              top: -20,
              left: -20,
              right: 20,
              bottom: 20,
            }}
          >
            {customStyle.sticker}
          </motion.div>
        </div>
      )}
    </motion.div>
  );
});
Message.displayName = "Message";

// Main Component
export default function Messages({
  messages: propMessages,
  userWalletData,
  userHolderData,
  compactMode = false,
  inGlobalContext = true,
  preserveMessageStyles = false,
  visibleRange = { start: 0, end: 50 },
}) {
  const [isMounted, setIsMounted] = useState(false);
  const messagesEndRef = useRef(null);
  const userRank = userHolderData?.rank || null;

  const {
    messages: globalMessages,
    dismissMessage: globalDismissMessage,
    connectionStatus: globalConnectionStatus,
    isLoading,
  } = useGlobalMessages();

  const windowSize = useWindowSize();
  const isMobile = windowSize.width < 768;
  const messagesContainerRef = useRef(null);

  useEffect(() => setIsMounted(true), []);

  const messagesToDisplay = (propMessages || globalMessages || []).filter(
    Boolean
  );

  useEffect(() => {
    if (messagesEndRef.current && !compactMode) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messagesToDisplay, compactMode]);

  const dismissMessage = useCallback(
    (id) =>
      typeof globalDismissMessage === "function" && globalDismissMessage(id),
    [globalDismissMessage]
  );

  const getMessageDate = (timestamp) =>
    new Date(timestamp).toLocaleDateString();

  const today = new Date().toLocaleDateString();
  const yesterday = new Date(Date.now() - 86400000).toLocaleDateString();

  const formatDateLabel = (date) =>
    date === today ? "Today" : date === yesterday ? "Yesterday" : date;

  useEffect(() => {
    const messagesContainer = messagesContainerRef.current;
    if (!messagesContainer || !isMobile) return;

    // This function prevents scroll events from propagating beyond the container
    const handleTouchMove = (e) => {
      const isAtTop = messagesContainer.scrollTop === 0;
      const isAtBottom =
        messagesContainer.scrollHeight - messagesContainer.scrollTop <=
        messagesContainer.clientHeight + 1;

      // Allow scrolling within the container
      if (
        !(isAtTop && e.touches[0].clientY > 50) &&
        !(isAtBottom && e.touches[0].clientY < 50)
      ) {
        e.stopPropagation();
      }
    };

    messagesContainer.addEventListener("touchmove", handleTouchMove, {
      passive: false,
    });

    return () => {
      messagesContainer.removeEventListener("touchmove", handleTouchMove);
    };
  }, [isMobile]);

  return (
    <div
      ref={messagesContainerRef}
      className={`lc-messages-container ${
        isMobile ? "lc-messages-mobile" : ""
      }`}
      style={{
        overflowY: "auto",
        WebkitOverflowScrolling: "touch", // For smooth iOS scrolling
        maxHeight: isMobile ? "calc(70vh - 100px)" : "600px", // Adjust height on mobile
        position: "relative",
        isolation: "isolate", // Create stacking context
      }}
    >
      {globalConnectionStatus && globalConnectionStatus !== "connected" && (
        <div className="lc-message-system">
          <span>
            {globalConnectionStatus === "connecting"
              ? "Connecting to the blockchain network..."
              : "Network disconnected. Reconnecting..."}
          </span>
        </div>
      )}

      {inGlobalContext && (
        <>
          {isLoading ? (
            <div className="lc-messages-loading">
              <div className="lc-messages-loading-icon"></div>
              <h4 className="lc-messages-loading-title">Synchronizing Data</h4>
              <p className="lc-messages-loading-text">
                Fetching messages from the blockchain network...
              </p>
            </div>
          ) : !messagesToDisplay.length ? (
            <div className="lc-messages-empty">
              <div className="lc-messages-empty-icon">💬</div>
              <h4 className="lc-messages-empty-title">No Messages Yet</h4>
              <p className="lc-messages-empty-text">
                Be the first to initiate communication on the LockChain network.
              </p>
            </div>
          ) : null}
        </>
      )}

      <AnimatePresence initial={false}>
        {messagesToDisplay
          .slice(visibleRange.start, visibleRange.end)
          .map((msg, index) => {
            const messageDate = getMessageDate(msg.timestamp);
            const prevMessage = index > 0 ? messagesToDisplay[index - 1] : null;
            const prevDate = prevMessage
              ? getMessageDate(prevMessage.timestamp)
              : null;
            const isNewDate = messageDate !== prevDate;

            return (
              <React.Fragment key={msg.id}>
                {isNewDate && (
                  <div className="lc-message-date-divider">
                    <span className="lc-message-date-text">
                      {formatDateLabel(messageDate)}
                    </span>
                  </div>
                )}
                <Message
                  id={`message-${msg.id}`}
                  msg={msg}
                  userWalletData={userWalletData}
                  userRank={userRank}
                  onDismiss={inGlobalContext ? dismissMessage : undefined}
                  index={index}
                  compactMode={compactMode}
                />
              </React.Fragment>
            );
          })}
      </AnimatePresence>

      <div ref={messagesEndRef} />
    </div>
  );
}
