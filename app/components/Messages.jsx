"use client";
import React, {
  useState,
  useEffect,
  useRef,
  forwardRef,
  useCallback,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import SimpleEmojiPicker from "./SimpleEmojiPicker";
import SimpleMobileEmojiPicker from "./SimpleMobileEmojiPicker";
import { BsEmojiSmile } from "react-icons/bs";
import { useToast } from "../context/ToastContext";
import {
  MdFormatColorText,
  MdFormatColorFill,
  MdModeEdit,
} from "react-icons/md";
import "../styles/Messages.css";
import MessagePreview from "./MessagePreview";
import DraggableComponent from "./DraggableComponent";
import ColorPicker from "./ColorPicker";
import {
  IoAddCircleOutline,
  IoSaveOutline,
  IoTrashOutline,
} from "react-icons/io5";
import MessageArchive from "./MessageArchive";
import "../styles/MessageArchive.css";
import debounce from "lodash.debounce";
// Firebase imports
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  limit,
  getDocs,
  where, // Make sure 'where' is imported
} from "firebase/firestore";
import { db } from "../lib/firebase"; // Make sure this points to your client-side Firebase config
import { useGlobalMessages } from "../context/GlobalMessagesContext";

const MAX_VISIBLE_MESSAGES = 14;
const COOLDOWN_TIME = 30000; // 30 seconds

// toastify function

// Constants for Themes, Fonts, Animations (keep as they were)
const MESSAGE_THEMES = [
  // Default dark theme - clean and minimal
  {
    name: "Default",
    bgColor: "rgba(14, 14, 14, 0.95)",
    textColor: "#ffffff",
  },

  // Enhanced Bitcoin theme with blockchain graphic pattern
  {
    name: "Bitcoin Gold",
    gradient: "linear-gradient(135deg, #f7931a, #f4ba36, #ffd700)",
    textColor: "#000000",
  },

  // Ethereum theme - gradients from the ETH color palette
  {
    name: "Ethereum",
    gradient: "linear-gradient(135deg, #627eea, #3c58c4)",
    textColor: "#ffffff",
  },

  // Cyberpunk theme - neon, futuristic, crypto aesthetic
  {
    name: "Cyberpunk",
    gradient: "linear-gradient(135deg, #ff00ff, #00ffff)",
    textColor: "#ffffff",
  },

  // Dark mode theme with subtle blue accents
  {
    name: "Night Trader",
    gradient: "linear-gradient(135deg, #1a1a2e, #16213e)",
    textColor: "#4da8da",
  },

  // Blockchain theme - inspired by blockchain visualization
  {
    name: "Blockchain",
    gradient: "linear-gradient(135deg, #0f2027, #203a43, #2c5364)",
    textColor: "#7affaf",
  },

  // Modern crypto exchange UI inspired theme
  {
    name: "Exchange",
    bgColor: "#121212",
    textColor: "#32cb65",
  },

  // Metaverse-inspired bright theme
  {
    name: "Metaverse",
    gradient: "linear-gradient(135deg, #5433ff, #20bdff, #a5fecb)",
    textColor: "#ffffff",
  },

  // NFT marketplace inspired theme
  {
    name: "NFT Gallery",
    gradient: "linear-gradient(135deg, #24243e, #302b63, #0f0c29)",
    textColor: "#f8f8f2",
  },

  // NEW THEME 1: Solana-inspired theme with vibrant gradients
  {
    name: "Solana Wave",
    gradient: "linear-gradient(135deg, #9945FF, #14F195)",
    textColor: "#ffffff",
  },

  // NEW THEME 2: Dark crypto theme with red accents - inspired by bearish market sentiment
  {
    name: "Bear Market",
    gradient: "linear-gradient(135deg, #1a1a1a, #2d2d2d)",
    textColor: "#ff4545",
  },

  // NEW THEME 3: DeFi theme with futuristic blue-green hues
  {
    name: "DeFi Protocol",
    gradient: "linear-gradient(135deg, #005C97, #363795, #2CB5E8)",
    textColor: "#E0F7FA",
  },
];
const PREMIUM_FONTS = [
  { name: "Default", value: "inherit" },
  { name: "Roboto", value: "'Roboto', sans-serif" },
  { name: "Montserrat", value: "'Montserrat', sans-serif" },
  { name: "Poppins", value: "'Poppins', sans-serif" },
  { name: "Playfair Display", value: "'Playfair Display', serif" },
  { name: "Pacifico", value: "'Pacifico', cursive" },
  { name: "Fira Code", value: "'Fira Code', monospace" },
  { name: "Nunito", value: "'Nunito', sans-serif" },
  { name: "Raleway", value: "'Raleway', sans-serif" },
  { name: "Dancing Script", value: "'Dancing Script', cursive" },
  { name: "Oswald", value: "'Oswald', sans-serif" },
  { name: "Space Grotesk", value: "'Space Grotesk', sans-serif" },
  { name: "Caveat", value: "'Caveat', cursive" },
];
const PREMIUM_ANIMATIONS = [
  { name: "None", value: null },
  { name: "Pulse Glow", value: "pulse" },
  { name: "Gradient Shift", value: "gradient" },
  { name: "Rainbow Flow", value: "rainbow" },
  { name: "Neon Glow", value: "glow" },
];

// Add this new constant for text effects
const TEXT_EFFECTS = [
  { name: "None", value: null },
  { name: "Shadow", value: "shadow" },
  { name: "Neon", value: "neon" },
  { name: "Metallic", value: "metallic" },
  { name: "Retro", value: "retro" },
  { name: "Glitch", value: "glitch" },
  { name: "Holographic", value: "holographic" },
  { name: "Matrix", value: "matrix" },
];

// Add this new constant for font sizes
const FONT_SIZES = [
  { name: "Default", value: "inherit" },
  { name: "Small", value: "0.9rem" },
  { name: "Medium", value: "1rem" },
  { name: "Large", value: "1.2rem" },
  { name: "X-Large", value: "1.4rem" },
];

// Add this new constant
const FONT_PRESETS = [
  {
    name: "Modern",
    fontFamily: "'Montserrat', sans-serif",
    fontWeight: "normal",
    fontSize: "1rem",
  },
  {
    name: "Elegant",
    fontFamily: "'Playfair Display', serif",
    fontStyle: "italic",
    fontSize: "1.1rem",
  },
  {
    name: "Playful",
    fontFamily: "'Pacifico', cursive",
    fontSize: "1.2rem",
  },
  {
    name: "Code",
    fontFamily: "'Fira Code', monospace",
    fontSize: "0.9rem",
  },
  {
    name: "Handwritten",
    fontFamily: "'Caveat', cursive",
    fontSize: "1.3rem",
  },
];

// Add a Tooltip component
const Tooltip = ({ children, text, position = "top" }) => {
  return (
    <div className="tooltip-container">
      {children}
      <div className={`tooltip ${position}`}>{text}</div>
    </div>
  );
};

// Add this helper function to your component file
const formatRank = (rank) => {
  if (!rank) return "";
  return `#${rank}`;
};

// Message Component (keep as it was)
const Message = forwardRef(
  (
    {
      msg,
      id, // Get the ID prop
      userWalletData,
      onDismiss,
      index,
      userRank,
      onShowArchive,
      compactMode = false,
    },
    ref
  ) => {
    // Define these variables
    const isOwnMessage = msg.walletAddress === userWalletData?.walletAddress;
    const customStyle = msg.customStyle || {};
    const canUseCustomStyles = true; // Always allow custom styles in global context
    const canUseFonts = true;
    const canUseAnimations = true;
    const showRank = false; // Disable rank in compact mode

    const bgColor =
      customStyle.bgColor ||
      (isOwnMessage ? "rgba(98, 134, 252, 0.15)" : "rgba(14, 14, 14, 0.95)");
    const textColor = customStyle.textColor || "#ffffff";

    const fontWeight = canUseCustomStyles
      ? customStyle.fontWeight || "normal"
      : "normal";
    const fontStyle = canUseCustomStyles
      ? customStyle.fontStyle || "normal"
      : "normal";
    const fontSize = canUseCustomStyles
      ? customStyle.fontSize || "inherit"
      : "inherit";
    const textEffect = canUseAnimations ? customStyle.textEffect || null : null;
    const animationType = canUseAnimations
      ? customStyle.animationType || null
      : null;

    let messageStyle = {
      ...customStyle,
      borderRadius: "12px", // Always ensure rounded corners
      color: textColor,
      backfaceVisibility: "hidden",
      WebkitFontSmoothing: "subpixel-antialiased",
    };

    // Set background properly
    if (customStyle.gradient) {
      messageStyle.background = customStyle.gradient;
    } else {
      messageStyle.background = bgColor;
    }

    // Keep border radius
    messageStyle.borderRadius = "12px";

    // Create a CSS variable to ensure the background style is preserved in compact mode
    if (messageStyle.background) {
      messageStyle["--message-background"] = messageStyle.background;
    }

    // Apply glow effect if specified
    if (customStyle.glow) {
      messageStyle.boxShadow = `0 0 15px ${customStyle.gradient || bgColor}`;
    }

    // Apply any custom font styles
    if (fontSize !== "inherit") {
      messageStyle["--custom-font-size"] = fontSize;
    }

    // Apply animation classes
    let animationClass = "";
    if (animationType === "pulse") animationClass = "animate-pulse";
    else if (animationType === "gradient") animationClass = "animate-gradient";
    else if (animationType === "rainbow") animationClass = "animate-rainbow";
    else if (animationType === "glow") animationClass = "animate-glow";

    // Apply text effect classes
    let textEffectClass = "";
    if (textEffect === "retro") textEffectClass = "retro";
    else if (textEffect === "matrix") textEffectClass = "matrix";
    else if (textEffect === "metallic") textEffectClass = "metallic";
    else if (textEffect === "neon") textEffectClass = "neon";
    else if (textEffect === "glitch") textEffectClass = "glitch";

    // Create proper class names for the message
    const messageClass = `message-float ${
      isOwnMessage ? "own-message" : ""
    } ${animationClass} ${compactMode ? "compact" : ""}`;

    // Get avatar
    const profileImage =
      msg.profileImage ||
      "https://api.dicebear.com/7.x/bottts/svg?seed=" + msg.walletAddress;

    // Helper function to format rank
    const formatRank = (rank) => {
      if (!rank) return "";
      return `#${rank}`;
    };

    return (
      <motion.div
        id={id} // Add the ID here
        ref={ref}
        className={messageClass}
        initial={{ opacity: 0, x: 50, scale: 0.9 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        exit={{ opacity: 0, x: -50, transition: { duration: 0.2 } }}
        transition={{
          type: "spring",
          stiffness: 50,
          damping: 20,
          delay: index * 0.05,
        }}
        style={messageStyle}
      >
        <div className="message-avatar-wrapper">
          <img
            className="message-avatar"
            src={profileImage}
            alt="User avatar"
          />
          {showRank && (
            <div className="message-rank">
              {formatRank(msg.rank || userRank)}
            </div>
          )}
        </div>
        <div className="message-content">
          <div className="message-username">{msg.username || "Anonymous"}</div>
          <p
            className={`message-text ${textEffectClass}`}
            style={{
              fontWeight,
              fontStyle,
            }}
          >
            {msg.text}
          </p>
          {msg.sticker && <div className="message-sticker">{msg.sticker}</div>}
        </div>
        {onDismiss && (
          <button
            className="message-close"
            onClick={() => onDismiss(msg.id)}
            aria-label="Dismiss message"
          >
            ×
          </button>
        )}
      </motion.div>
    );
  }
);

Message.displayName = "Message";

// ChatFab Component (keep as it was)
const ChatFab = ({
  onClick,
  showInput,
  messageCount,
  onToggleMessages,
  showMessages,
  hasMessages,
}) => {
  return (
    <div className={`mobile-chat-controls ${showInput ? "input-open" : ""}`}>
      {hasMessages && !showInput && (
        <motion.button
          className="messages-toggle-mobile"
          onClick={onToggleMessages}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ opacity: 0, scale: 0 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          aria-label={showMessages ? "Hide messages" : "Show messages"}
        >
          <span className="fab-icon">{showMessages ? "👁️" : "👓"}</span>
        </motion.button>
      )}
      <motion.button
        className="chat-fab"
        onClick={onClick}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        {showInput ? (
          <span className="fab-icon">×</span>
        ) : (
          <>
            <span className="fab-icon">💬</span>
            {messageCount > 0 && (
              <span className="fab-badge">
                {messageCount > 99 ? "99+" : messageCount}
              </span>
            )}
          </>
        )}
      </motion.button>
    </div>
  );
};

const StyleSuggestions = ({ suggestions, onSelectSuggestion, onClose }) => {
  return (
    <motion.div
      className="style-suggestions-panel"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <div className="suggestions-header">
        <h4>AI Style Suggestions</h4>
        <button onClick={onClose} className="close-button">
          ×
        </button>
      </div>
      <div className="suggestions-list">
        {suggestions.map((suggestion, index) => (
          <div
            key={`suggestion-${index}`}
            className="style-suggestion"
            onClick={() => onSelectSuggestion(suggestion.style)}
          >
            <MessagePreview
              style={suggestion.style}
              username={suggestion.previewName || "you"}
              text={suggestion.previewText || "This is a suggested style"}
            />
            <div className="suggestion-info">
              <h5>{suggestion.name}</h5>
              <p>{suggestion.description}</p>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

// Main Messages Component
export default function Messages({
  session,
  userWalletData,
  userHolderData,
  compactMode = false,
  inGlobalContext = false,
}) {
  // Move this line up here with other state variables
  const [isMounted, setIsMounted] = useState(false);

  // Existing state
  const userRank = userHolderData?.rank || null;
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [cooldown, setCooldown] = useState(false);
  const [cooldownTime, setCooldownTime] = useState(0);
  const [showInput, setShowInput] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const [isMobile, setIsMobile] = useState(false);
  const [newMessageCount, setNewMessageCount] = useState(0);
  const [lastSeenMessageId, setLastSeenMessageId] = useState(null);
  const [showMessages, setShowMessages] = useState(true);

  // Customization state
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [customStyle, setCustomStyle] = useState({});
  const [showStyleOptions, setShowStyleOptions] = useState(false);
  const [activeStyleTab, setActiveStyleTab] = useState("themes");
  const [customThemes, setCustomThemes] = useState([]);
  const [isEditingCustomTheme, setIsEditingCustomTheme] = useState(false);
  const [customThemeColors, setCustomThemeColors] = useState({
    name: "My Theme",
    bgColor: "#151515",
    textColor: "#ffffff",
    useGradient: false,
    gradientStart: "#1a237e",
    gradientEnd: "#0288d1",
  });
  const [editingThemeId, setEditingThemeId] = useState(null);
  const [previewStyle, setPreviewStyle] = useState({});

  // Connection & Fetching State
  const [lastMessageLoad, setLastMessageLoad] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState("connecting");
  const connectionRetries = useRef(0);
  const unsubscribeRef = useRef(null); // Still useful for listener cleanup potentially
  const [isTabVisible, setIsTabVisible] = useState(true);

  const { showToast } = useToast();

  // *** NEW STATE FOR OPTIMIZED LISTENER ***
  const [latestInitialTimestamp, setLatestInitialTimestamp] = useState(null);

  // Add to your Messages component state
  const [textEffect, setTextEffect] = useState(null);
  const [fontSize, setFontSize] = useState("inherit");

  // Add first-time user guide
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    const hasSeenOnboarding = localStorage.getItem("hasSeenChatOnboarding");
    if (!hasSeenOnboarding && session) {
      setShowOnboarding(true);
    }
  }, [session]);

  const completeOnboarding = () => {
    localStorage.setItem("hasSeenChatOnboarding", "true");
    setShowOnboarding(false);
  };

  // Add these state variables to your Messages component
  const [showStyleSuggestions, setShowStyleSuggestions] = useState(false);
  const [styleSuggestions, setStyleSuggestions] = useState([]);
  const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState(false);

  // --- Effects ---

  // Load/Save style preferences from localStorage
  useEffect(() => {
    if (session?.user?.id) {
      try {
        const savedStyle = localStorage.getItem(
          `messageStyle_${session.user.id}`
        );
        if (savedStyle) {
          const parsedStyle = JSON.parse(savedStyle);
          setCustomStyle(parsedStyle);
        }
        const savedThemes = localStorage.getItem(
          `customThemes_${session.user.id}`
        );
        if (savedThemes) {
          const parsedThemes = JSON.parse(savedThemes);
          setCustomThemes(parsedThemes);
        }
      } catch (error) {
        console.error("Error loading styles from localStorage:", error);
      }
    }
  }, [session?.user?.id]);

  // Save style preferences when they change
  useEffect(() => {
    if (session?.user?.id && Object.keys(customStyle).length > 0) {
      try {
        localStorage.setItem(
          `messageStyle_${session.user.id}`,
          JSON.stringify(customStyle)
        );
      } catch (error) {
        console.error("Error saving style preferences:", error);
      }
    }
  }, [customStyle, session?.user?.id]);

  // Save custom themes when they change
  useEffect(() => {
    if (session?.user?.id && customThemes.length > 0) {
      // Save even if only one theme exists
      try {
        localStorage.setItem(
          `customThemes_${session.user.id}`,
          JSON.stringify(customThemes)
        );
      } catch (error) {
        console.error("Error saving custom themes:", error);
      }
    }
  }, [customThemes, session?.user?.id]);

  // Keyboard shortcut (Ctrl/Cmd + M)
  useEffect(() => {
    const handleKeyPress = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "m") {
        e.preventDefault();
        setShowInput((prev) => !prev);
        if (!showInput && inputRef.current) {
          setTimeout(() => inputRef.current?.focus(), 100);
        }
      }
    };
    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [showInput]);

  // Add keyboard shortcuts for power users
  useEffect(() => {
    const handleKeyboardShortcuts = (e) => {
      // Ctrl/Cmd + M already used for toggling chat

      // Ctrl/Cmd + E for emoji picker
      if ((e.ctrlKey || e.metaKey) && e.key === "e" && showInput) {
        e.preventDefault();
        setShowEmojiPicker((prev) => !prev);
      }

      // Ctrl/Cmd + T for theme options
      if ((e.ctrlKey || e.metaKey) && e.key === "t" && showInput) {
        e.preventDefault();
        setShowStyleOptions((prev) => !prev);
        setActiveStyleTab("themes");
      }

      // Escape key to close panels
      if (e.key === "Escape") {
        if (showEmojiPicker) {
          setShowEmojiPicker(false);
          return;
        }
        if (showStyleOptions) {
          setShowStyleOptions(false);
          return;
        }
        if (showInput) {
          setShowInput(false);
        }
      }
    };

    window.addEventListener("keydown", handleKeyboardShortcuts);
    return () => window.removeEventListener("keydown", handleKeyboardShortcuts);
  }, [showInput, showEmojiPicker, showStyleOptions]);

  // Cooldown timer logic
  useEffect(() => {
    let timer;
    if (cooldown && cooldownTime > 0) {
      timer = setTimeout(() => {
        setCooldownTime((prevTime) => Math.max(0, prevTime - 1));
      }, 1000);
    } else if (cooldown && cooldownTime === 0) {
      setCooldown(false); // Ensure cooldown boolean is reset
    }
    return () => clearTimeout(timer);
  }, [cooldown, cooldownTime]);

  // Device detection (Mobile/Desktop)
  useEffect(() => {
    const checkDevice = () => {
      const isMobileDevice = window.innerWidth <= 768;
      setIsMobile(isMobileDevice);
    };

    checkDevice();
    window.addEventListener("resize", checkDevice);
    return () => window.removeEventListener("resize", checkDevice);
  }, []);

  // Track new message count when input is closed
  useEffect(() => {
    if (messages.length > 0 && !showInput) {
      const newestMessageId = messages[0]?.id; // Assuming messages are sorted desc
      if (lastSeenMessageId && lastSeenMessageId !== newestMessageId) {
        const lastSeenIndex = messages.findIndex(
          (msg) => msg.id === lastSeenMessageId
        );
        if (lastSeenIndex !== -1) {
          // Count messages newer than the last seen one
          setNewMessageCount(lastSeenIndex); // Index is the count of newer items
        } else {
          // If last seen not found (purged?), estimate based on length diff or reset
          setNewMessageCount(
            messages.length > MAX_VISIBLE_MESSAGES
              ? MAX_VISIBLE_MESSAGES
              : messages.length
          ); // Max count or total count
        }
      }
    }
    // Set initial last seen ID when messages first load or input closes
    if (messages.length > 0 && !lastSeenMessageId) {
      setLastSeenMessageId(messages[0].id);
    }
  }, [messages, showInput, lastSeenMessageId]);

  // Reset new message counter when chat input is opened
  useEffect(() => {
    if (showInput && messages.length > 0) {
      setLastSeenMessageId(messages[0]?.id); // Mark the latest as seen
      setNewMessageCount(0);
    }
  }, [showInput, messages]);

  // Auto-dismiss messages on mobile (Staggered)
  useEffect(() => {
    // Clear previous timers if messages change or isMobile status changes
    const timers = [];
    if (isMobile && messages.length > 0) {
      messages.forEach((msg, index) => {
        // Example: Dismiss older messages faster, newer ones slower
        // Or just a simple stagger like before:
        const delay = 30000 + index * 1000; // Base 30s + 1s stagger per message
        const timer = setTimeout(() => {
          dismissMessage(msg.id);
        }, delay);
        timers.push(timer);
      });
    }
    // Cleanup function to clear all scheduled timers
    return () => {
      timers.forEach(clearTimeout);
    };
    // Rerun if messages array *reference* changes or isMobile changes
  }, [messages, isMobile]);

  // Tab visibility handling (Optional: Could pause listener if needed)
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsTabVisible(document.visibilityState === "visible");
      if (document.visibilityState === "hidden") {
        // Optional: Could unsubscribe here to save reads when tab is hidden
        // if (unsubscribeRef.current) {
        //     console.log("Tab hidden, pausing listener.");
        //     unsubscribeRef.current();
        //     unsubscribeRef.current = null;
        // }
      } else {
        // Optional: If unsubscribed, need to re-subscribe here
        // console.log("Tab visible, ensuring listener is active.");
        // Need to trigger the main fetching useEffect again, maybe by resetting timestamp
        // setLatestInitialTimestamp(null); // This would trigger refetch
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []); // No dependencies needed here

  // *** OPTIMIZED Firestore Message Fetching Effect ***
  useEffect(() => {
    if (inGlobalContext || !session || !isMounted) {
      // If in global context, don't set up any Firebase listeners
      // Also clear any previous listeners and reset state if needed
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
      return;
    }

    console.log("Setting up Firestore message fetching (standalone mode)");
    setConnectionStatus("connecting");

    let effectActive = true; // Track mount status for async operations
    let unsubscribeListener = null; // Local unsubscribe variable

    const messagesRef = collection(db, "messages");
    const baseQuery = query(messagesRef, orderBy("timestamp", "desc"));

    // 1. Fetch initial batch
    const fetchInitialMessages = async () => {
      console.log("Fetching initial messages...");
      try {
        const initialQuery = query(baseQuery, limit(MAX_VISIBLE_MESSAGES));
        const snapshot = await getDocs(initialQuery);
        if (!effectActive) return; // Don't update state if unmounted

        const initialMessages = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          timestamp:
            doc.data().timestamp?.toDate?.() || new Date(doc.data().timestamp),
        }));

        setMessages(initialMessages);
        setConnectionStatus("connected");
        connectionRetries.current = 0;
        setLastMessageLoad(Date.now());

        const latestTs =
          initialMessages.length > 0
            ? initialMessages[0].timestamp instanceof Date
              ? initialMessages[0].timestamp
              : new Date(initialMessages[0].timestamp)
            : new Date(0); // Use epoch if no messages

        setLatestInitialTimestamp(latestTs); // Trigger listener setup
        console.log("Initial messages loaded. Newest timestamp:", latestTs);
      } catch (error) {
        console.error("Error fetching initial messages:", error);
        if (!isMounted) return;
        setConnectionStatus("disconnected");
        // Implement more robust retry logic if needed
      }
    };

    // 2. Setup listener for new messages
    const setupNewMessagesListener = (lastKnownTimestamp) => {
      if (!lastKnownTimestamp || !isMounted) {
        console.log(
          "Conditions not met for setting up listener (Timestamp/Mount status)."
        );
        return; // Don't set up listener yet
      }

      console.log(
        "Setting up Firestore real-time listener for *new* messages after:",
        lastKnownTimestamp
      );
      const newMessagesQuery = query(
        baseQuery,
        where("timestamp", ">", lastKnownTimestamp)
      );

      unsubscribeListener = onSnapshot(
        // Assign to local variable
        newMessagesQuery,
        (snapshot) => {
          if (!isMounted) return;
          if (!snapshot.empty) {
            const newMessages = snapshot.docs
              .map((doc) => ({
                id: doc.id,
                ...doc.data(),
                timestamp:
                  doc.data().timestamp?.toDate?.() ||
                  new Date(doc.data().timestamp),
              }))
              .sort((a, b) => b.timestamp - a.timestamp); // Ensure descending order

            console.log(`Received ${newMessages.length} new message(s)`);
            if (newMessages.length > 0) {
              setMessages((prevMessages) => {
                const existingIds = new Set(prevMessages.map((msg) => msg.id));
                const uniqueNewMessages = newMessages.filter(
                  (msg) => !existingIds.has(msg.id)
                );
                if (uniqueNewMessages.length === 0) return prevMessages;

                const combined = [...uniqueNewMessages, ...prevMessages];
                const sorted = combined.sort(
                  (a, b) => b.timestamp - a.timestamp
                );
                return sorted.slice(0, MAX_VISIBLE_MESSAGES);
              });

              // Update the latest timestamp using the newest message received
              const newestTimestampInUpdate =
                newMessages[0].timestamp instanceof Date
                  ? newMessages[0].timestamp
                  : new Date(newMessages[0].timestamp);
              setLatestInitialTimestamp(newestTimestampInUpdate); // Update state to reflect latest known time
            }
          }
          setConnectionStatus("connected");
          connectionRetries.current = 0;
        },
        (error) => {
          console.error("Error in Firestore *new* messages listener:", error);
          if (!isMounted) return;
          connectionRetries.current++;
          if (connectionRetries.current > 3) {
            setConnectionStatus("disconnected");
          } else {
            setConnectionStatus("reconnecting");
            // Optional: Add delay before retrying? Maybe handled by `retryConnection` call externally.
          }
        }
      );
    };

    // --- Execution Logic ---
    if (latestInitialTimestamp === null) {
      // If timestamp is null (initial load or after logout/retry), fetch initial messages.
      fetchInitialMessages();
    } else {
      // If timestamp is set, set up the listener for new messages.
      setupNewMessagesListener(latestInitialTimestamp);
    }

    // Cleanup function
    return () => {
      console.log("Cleaning up Firestore message listener effect");
      effectActive = false; // Mark as unmounted
      if (unsubscribeListener) {
        console.log("Unsubscribing from listener.");
        unsubscribeListener();
      }
      unsubscribeListener = null;
    };

    // Dependencies: session (login/logout), latestInitialTimestamp (triggers listener setup after initial fetch or updates)
  }, [session, latestInitialTimestamp, isMounted, inGlobalContext]);

  // --- Functions ---

  // Send Message
  const sendMessage = async (e) => {
    e.preventDefault();
    if (!message.trim() || cooldown || isSubmitting || !session) return;

    setIsSubmitting(true);

    // Show pending animation in the preview
    const pendingStyle = { ...customStyle, sending: true };
    setCustomStyle(pendingStyle);

    try {
      const currentProfileImage =
        userWalletData?.profileImage || session?.user?.image;
      const messageData = {
        text: message.trim(),
        walletAddress: userWalletData?.walletAddress,
        user: session.user.name || userWalletData?.username || "Anonymous", // Add fallback name
        profileImage: currentProfileImage,
        customStyle: customStyle, // Include custom styles
        timestamp: new Date(), // Use client-side timestamp (Firestore server timestamp is better for consistency if possible via backend)
        // Add rank if available - useful for backend rules/filtering
        rank: userRank,
      };

      // POST to your API endpoint which handles adding to Firestore
      const response = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(messageData),
      });

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ message: "Unknown error" }));
        throw new Error(
          `Failed to send message: ${errorData.message || response.statusText}`
        );
      }

      setMessage(""); // Clear input on success
      setShowEmojiPicker(false); // Hide emoji picker
      // Reset preview style if it was being used for theme editing? No, keep style.
      // Set cooldown
      setCooldown(true);
      setCooldownTime(COOLDOWN_TIME / 1000); // Set cooldown in seconds
    } catch (error) {
      console.error("Error sending message:", error);
      // Show user-friendly error (replace alert with a toast notification if available)
      alert(`Error: ${error.message || "Could not send message."}`);
    } finally {
      setIsSubmitting(false);
      setCustomStyle({ ...customStyle, sending: false });
    }
  };

  // Fix the dismissMessage function to work in global context too
  const dismissMessage = useCallback(
    (id) => {
      // If in global context, don't modify state directly
      if (inGlobalContext) {
        // You can trigger an event or call a function from the global context
        // For now, we'll just hide it visually
        const element = document.getElementById(`message-${id}`);
        if (element) {
          element.style.opacity = "0";
          setTimeout(() => {
            element.style.display = "none";
          }, 300);
        }
      } else {
        // Regular behavior for non-global context
        setMessages((prev) => prev.filter((msg) => msg.id !== id));
      }
    },
    [inGlobalContext]
  );

  // Toggle message visibility
  const toggleMessages = () => {
    setShowMessages((prev) => !prev);
  };

  // --- Customization Handlers ---

  // Add haptic feedback for mobile users (if supported)
  const triggerHapticFeedback = () => {
    if (isMounted && isMobile && window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate(50); // Short vibration
    }
  };

  // // Select Emoji (for sticker)
  // const handleSelectEmoji = (emoji) => {
  //   triggerHapticFeedback();
  //   // Update message input directly if input is focused, otherwise add as sticker
  //   if (document.activeElement === inputRef.current) {
  //     setMessage((prev) => prev + emoji);
  //   } else {
  //     // Add as a sticker style (if implementing stickers)
  //     // setCustomStyle((prev) => ({ ...prev, sticker: emoji }));
  //     console.log(
  //       "Emoji selected, but input not focused. Implement sticker logic if needed."
  //     );
  //   }
  //   setShowEmojiPicker(false);
  // };

  // Select Theme
  const handleSelectTheme = (theme) => {
    triggerHapticFeedback();
    const newStyle = {
      // Preserve existing non-theme styles like font, animation? Decide based on UX.
      ...customStyle,
      textColor: theme.textColor,
      // Store an identifier if needed, e.g., for knowing which theme is selected
      selectedThemeId: theme.id || `preset-${theme.name}`,
    };
    if (theme.gradient) {
      newStyle.gradient = theme.gradient;
      delete newStyle.bgColor;
    } else {
      newStyle.bgColor = theme.bgColor;
      delete newStyle.gradient;
    }
    setCustomStyle(newStyle);
    // Apply preview instantly if editing
    if (isEditingCustomTheme) {
      updatePreviewFromThemeColors({ ...customThemeColors, ...newStyle });
    }
  };

  // Reset Style to Default
  const handleResetStyle = () => {
    setCustomStyle({});
    setPreviewStyle({}); // Reset preview too
    if (session?.user?.id) {
      localStorage.removeItem(`messageStyle_${session.user.id}`);
    }
  };

  // Open Theme Editor
  const openThemeEditor = (theme = null) => {
    if (theme) {
      // Edit existing theme (create a copy)
      setEditingThemeId(theme.id || `preset-${theme.name}`); // Keep track if it was based on a preset/custom
      const useGradient = !!theme.gradient;
      let gradientStart = "#1a237e",
        gradientEnd = "#0288d1";
      if (useGradient && theme.gradient) {
        const colors = extractGradientColors(theme.gradient);
        gradientStart = colors[0];
        gradientEnd = colors[1];
      }
      const themeColors = {
        name: `${theme.name} (Copy)`, // Suggest a copy name
        textColor: theme.textColor || "#ffffff",
        useGradient: useGradient,
        gradientStart: gradientStart,
        gradientEnd: gradientEnd,
        bgColor: theme.bgColor || "#151515",
      };
      setCustomThemeColors(themeColors);
      updatePreviewFromThemeColors(themeColors); // Set initial preview
    } else {
      // Create new theme
      setEditingThemeId(null); // No ID means new theme
      const defaultColors = {
        name: "My Custom Theme",
        bgColor: "#151515",
        textColor: "#ffffff",
        useGradient: false,
        gradientStart: "#1a237e",
        gradientEnd: "#0288d1",
      };
      setCustomThemeColors(defaultColors);
      updatePreviewFromThemeColors(defaultColors); // Set initial preview
    }
    setIsEditingCustomTheme(true);
    setActiveStyleTab("themes"); // Switch tab to themes
    setShowStyleOptions(true); // Ensure panel is open
  };

  // Helper to update preview style based on theme editor colors
  const updatePreviewFromThemeColors = (themeColors) => {
    const newPreview = {
      ...customStyle, // Start with base style
      textColor: themeColors.textColor,
      // Preserve text effects and animations from current style
      textEffect: customStyle.textEffect || null,
      animationType: customStyle.animationType,
      fontSize: customStyle.fontSize || "inherit",
    };
    if (themeColors.useGradient) {
      newPreview.gradient = `linear-gradient(135deg, ${themeColors.gradientStart}, ${themeColors.gradientEnd})`;
      delete newPreview.bgColor;
    } else {
      newPreview.bgColor = themeColors.bgColor;
      delete newPreview.gradient;
    }
    setPreviewStyle(newPreview); // Update the separate preview state
  };

  // Update theme editor colors AND preview
  const updateCustomThemeColors = useCallback(
    (updatedColors) => {
      const newColors = { ...customThemeColors, ...updatedColors };
      setCustomThemeColors(newColors);
      updatePreviewFromThemeColors(newColors); // Update preview whenever editor changes
    },
    [customThemeColors, customStyle]
  ); // Include dependencies

  // Save Custom Theme
  const saveCustomTheme = () => {
    const themeId = editingThemeId || `custom-${Date.now()}`; // Generate ID for new themes
    const newTheme = {
      id: themeId,
      name: customThemeColors.name.trim() || "Custom Theme", // Use trimmed name or default
      textColor: customThemeColors.textColor,
      ...(customThemeColors.useGradient
        ? {
            gradient: `linear-gradient(135deg, ${customThemeColors.gradientStart}, ${customThemeColors.gradientEnd})`,
          }
        : { bgColor: customThemeColors.bgColor }),
      isCustom: true, // Mark as custom
    };

    let updatedThemes;
    const existingIndex = customThemes.findIndex(
      (t) => t.id === editingThemeId
    );

    if (existingIndex > -1) {
      // Replace existing theme if ID matched
      updatedThemes = [...customThemes];
      updatedThemes[existingIndex] = newTheme;
    } else {
      // Add as new theme
      updatedThemes = [...customThemes, newTheme];
    }

    setCustomThemes(updatedThemes); // Update state
    handleSelectTheme(newTheme); // Apply the newly saved/edited theme immediately

    // Reset editing state
    setIsEditingCustomTheme(false);
    setEditingThemeId(null);
    setPreviewStyle({}); // Clear preview style
  };

  // Delete Custom Theme
  const deleteCustomTheme = (themeIdToDelete) => {
    const themeToDelete = customThemes.find(
      (theme) => theme.id === themeIdToDelete
    );
    if (!themeToDelete) return; // Theme not found

    const updatedThemes = customThemes.filter(
      (theme) => theme.id !== themeIdToDelete
    );
    setCustomThemes(updatedThemes);

    // If the deleted theme was the currently active one, reset to default style
    const isActiveTheme =
      customStyle.selectedThemeId === themeIdToDelete ||
      (themeToDelete.gradient &&
        themeToDelete.gradient === customStyle.gradient) ||
      (themeToDelete.bgColor && themeToDelete.bgColor === customStyle.bgColor);

    if (isActiveTheme) {
      handleResetStyle(); // Reset to default look
    }
  };

  // Helper to extract gradient colors (keep as it was or improve regex)
  const extractGradientColors = (gradientString) => {
    if (!gradientString) return ["#1a237e", "#0288d1"];
    const colorStopRegex = /#(?:[0-9a-fA-F]{3}){1,2}|rgba?\([^)]+\)/g;
    const colors = gradientString.match(colorStopRegex);
    if (colors && colors.length >= 2) {
      return [colors[0], colors[colors.length - 1]]; // Return first and last color found
    }
    return ["#1a237e", "#0288d1"]; // Fallback
  };

  // *** Simplified retryConnection using the new state ***
  const retryConnection = () => {
    console.log("Attempting to reconnect to Firestore by re-triggering fetch.");
    setConnectionStatus("reconnecting");
    // Resetting the timestamp to null will cause the main useEffect to run
    // its initial fetch logic again, effectively retrying the connection.
    setLatestInitialTimestamp(null);
  };

  // Add this function in your component
  const cancelThemeEditing = () => {
    setIsEditingCustomTheme(false);
    setEditingThemeId(null);
    setPreviewStyle({}); // Clear the preview style
    // Option to reset customThemeColors to default if needed
    setCustomThemeColors({
      name: "My Theme",
      bgColor: "#151515",
      textColor: "#ffffff",
      useGradient: false,
      gradientStart: "#1a237e",
      gradientEnd: "#0288d1",
    });
  };

  // Add this useEffect to detect client-side rendering
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Update your toggleInput function
  const toggleInput = () => {
    const newValue = !showInput;
    setShowInput(newValue);

    // If opening input, automatically hide messages
    if (newValue) {
      setShowMessages(false);
    }
  };

  // Add this function in your component
  const applyMatrixEffect = (element) => {
    if (!element || !element.textContent) return;

    const text = element.textContent;
    element.textContent = "";

    [...text].forEach((char, i) => {
      const span = document.createElement("span");
      span.textContent = char;
      span.style.setProperty("--i", i);
      element.appendChild(span);
    });
  };

  // Use useEffect to apply this after rendering
  useEffect(() => {
    // Find all matrix-styled elements and apply the effect
    const matrixElements = document.querySelectorAll(
      ".message-text.matrix, .preview-message.matrix"
    );
    matrixElements.forEach(applyMatrixEffect);
  }, [customStyle.textEffect, previewStyle.textEffect]); // Add previewStyle dependency

  const handleGetStyleSuggestions = async () => {
    if (!message.trim()) {
      showToast("Please enter a message first", "info");
      return;
    }

    // Show the style options panel if it's not already visible
    if (!showStyleOptions) {
      setShowStyleOptions(true);
    }

    // Switch to the suggestions tab
    setActiveStyleTab("suggestions");

    // Start generating suggestions
    setIsGeneratingSuggestions(true);

    // Generate basic suggestions immediately
    const basicSuggestions = generateBasicSuggestions();
    setStyleSuggestions(basicSuggestions);

    try {
      // Then try to get AI-powered suggestions
      const aiSuggestions = await generateAISuggestions();

      // Combine basic and AI suggestions, removing duplicates
      const combinedSuggestions = [
        ...aiSuggestions,
        ...basicSuggestions.slice(0, 2),
      ];

      setStyleSuggestions(combinedSuggestions);
    } catch (error) {
      console.error("Error generating AI suggestions:", error);
      // We already have basic suggestions displaying, so no need for a fallback
    } finally {
      setIsGeneratingSuggestions(false);
    }
  };

  // Function to generate basic suggestions based on predefined combinations
  const generateBasicSuggestions = () => {
    // Start with predefined style combinations
    const predefinedSuggestions = [
      {
        name: "Modern Crypto",
        description: "Clean, professional look with a modern font",
        style: {
          gradient: "linear-gradient(135deg, #627eea, #3c58c4)",
          textColor: "#ffffff",
          fontFamily: "'Montserrat', sans-serif",
          fontWeight: "bold",
        },
        previewText: message || "A professional crypto message",
      },
      {
        name: "Night Trader",
        description: "Dark theme with neon accents for serious traders",
        style: {
          gradient: "linear-gradient(135deg, #1a1a2e, #16213e)",
          textColor: "#4da8da",
          fontFamily: "'Space Grotesk', sans-serif",
          textEffect: "neon",
        },
        previewText: message || "Market analysis insights",
      },
      // ... other basic suggestions ...
    ];

    // Analyze message and add dynamic themes
    if (message.trim()) {
      try {
        const messageAnalysis = {
          sentiment: getSentimentScore(message),
          contentType: detectContentType(message),
        };

        // Generate dynamic themes based on message analysis
        const dynamicThemes = generateDynamicThemes(messageAnalysis);

        // Return with dynamic themes first
        return [...dynamicThemes, ...predefinedSuggestions];
      } catch (error) {
        console.error("Error generating dynamic themes:", error);
      }
    }

    return predefinedSuggestions;
  };

  // Enhanced AI-powered suggestion generator
  const generateAISuggestions = async () => {
    const messageText = message.trim();
    if (!messageText) return [];

    try {
      // Begin analyzing message content
      const messageAnalysis = {
        length: messageText.length,
        words: messageText.split(/\s+/).length,
        hasEmojis: /[\p{Emoji}]/u.test(messageText),
        hasQuestion: /\?/.test(messageText),
        hasExclamation: /!/.test(messageText),
        allCaps:
          messageText === messageText.toUpperCase() && messageText.length > 3,
        containsCodeSnippet:
          /^```[\s\S]*```$/.test(messageText) ||
          /function\s*\(/.test(messageText) ||
          /{[\s\S]*}/.test(messageText) ||
          /\bconst\b|\blet\b|\bvar\b/.test(messageText),
        containsLink: /https?:\/\/[^\s]+/.test(messageText),
        // Sentiment analysis using keyword approach
        sentiment: getSentimentScore(messageText),
        // Content type detection
        contentType: detectContentType(messageText),
      };

      // Generate dynamic themes first (available immediately)
      const dynamicThemes = generateDynamicThemes(messageAnalysis);

      // Get user's style preferences history
      const stylePreferences = analyzeUserStylePreferences();

      // Prepare data for the AI
      const requestData = {
        message: messageText,
        analysis: messageAnalysis,
        currentStyle: customStyle,
        userPreferences: stylePreferences,
        userThemes: customThemes,
        userRank: userRank,
        defaultThemes: MESSAGE_THEMES,
      };

      // Call the API endpoint
      const response = await fetch("/api/style-suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        throw new Error("Failed to get AI suggestions");
      }

      const data = await response.json();

      // Process and enhance the API suggestions
      const enhancedApiSuggestions = data.suggestions.map((suggestion) => {
        // Calculate score based on match quality
        const score = calculateMatchScore(suggestion, messageAnalysis);

        return {
          ...suggestion,
          matchScore: score,
          previewText: message || suggestion.previewText,
        };
      });

      // Combine dynamically generated themes with API suggestions
      const allSuggestions = [
        ...dynamicThemes, // Put dynamic themes first as they're always highly relevant
        ...enhancedApiSuggestions,
      ];

      // Sort by match score and return
      return allSuggestions.sort((a, b) => b.matchScore - a.matchScore);
    } catch (error) {
      console.error("Error getting AI suggestions:", error);
      // Even if API call fails, return dynamic themes
      return generateDynamicThemes(
        getSentimentScore(messageText),
        detectContentType(messageText)
      );
    }
  };

  // Helper function for basic sentiment analysis
  const getSentimentScore = (text) => {
    // These lists can be expanded for better analysis
    const positiveWords = [
      "good",
      "great",
      "awesome",
      "excellent",
      "amazing",
      "love",
      "happy",
      "excited",
      "bullish",
      "gain",
      "profit",
      "up",
      "high",
      "success",
      "win",
      "congratulations",
      "celebrate",
      "best",
      "perfect",
      "brilliant",
    ];

    const negativeWords = [
      "bad",
      "terrible",
      "awful",
      "hate",
      "sad",
      "disappointed",
      "bearish",
      "loss",
      "crash",
      "down",
      "low",
      "fail",
      "poor",
      "worst",
      "horrible",
      "problem",
      "issue",
      "warning",
      "risk",
      "danger",
    ];

    const questionWords = [
      "what",
      "how",
      "why",
      "when",
      "where",
      "who",
      "which",
    ];

    const textLower = text.toLowerCase();
    const words = textLower.match(/\b(\w+)\b/g) || [];

    let score = 0;
    let positiveMatches = 0;
    let negativeMatches = 0;
    let questionMatches = 0;

    words.forEach((word) => {
      if (positiveWords.includes(word)) positiveMatches++;
      if (negativeWords.includes(word)) negativeMatches++;
      if (questionWords.includes(word)) questionMatches++;
    });

    // Calculate weighted score (-1 to +1)
    score = (positiveMatches - negativeMatches) / Math.max(words.length, 1);

    return {
      score: score,
      isPositive: score > 0.1,
      isNegative: score < -0.1,
      isNeutral: Math.abs(score) <= 0.1,
      isQuestion: questionMatches > 0 || text.includes("?"),
      positiveMatches,
      negativeMatches,
    };
  };

  // Helper function to detect content type
  const detectContentType = (text) => {
    // Pattern matching for different content types
    const patterns = {
      announcement:
        /(announce|introducing|release|launched|new|update|upgrade)/i,
      question: /\?|what|how|why|when|where|who|which/i,
      trading: /(chart|price|market|buy|sell|trade|support|resistance|trend)/i,
      technical:
        /(code|function|api|technical|implementation|class|algorithm)/i,
      celebration:
        /(congrats|congratulations|achievement|milestone|success|win|celebrate)/i,
      warning: /(caution|warning|alert|careful|attention|beware|risk)/i,
    };

    // Score each category
    const scores = {};
    for (const [category, pattern] of Object.entries(patterns)) {
      const matches = (text.match(pattern) || []).length;
      scores[category] = matches;
    }

    // Find the highest scoring category
    let highestCategory = "general";
    let highestScore = 0;

    for (const [category, score] of Object.entries(scores)) {
      if (score > highestScore) {
        highestScore = score;
        highestCategory = category;
      }
    }

    return {
      primaryType: highestCategory,
      scores: scores,
    };
  };

  // Helper function to analyze user style preferences
  const analyzeUserStylePreferences = () => {
    // This would ideally be more sophisticated and persistent across sessions
    const preferences = {
      favoriteColors: [],
      favoriteTextColors: [],
      favoriteFonts: [],
      usesGradients: false,
      usesAnimations: false,
      usesTextEffects: false,
      darkThemePreference: false,
    };

    // Analyze current style
    if (customStyle) {
      if (customStyle.gradient) {
        preferences.usesGradients = true;
        const colors = extractGradientColors(customStyle.gradient);
        preferences.favoriteColors.push(...colors);
      } else if (customStyle.bgColor) {
        preferences.favoriteColors.push(customStyle.bgColor);
      }

      if (customStyle.textColor) {
        preferences.favoriteTextColors.push(customStyle.textColor);
      }

      if (customStyle.fontFamily) {
        preferences.favoriteFonts.push(customStyle.fontFamily);
      }

      if (customStyle.animationType) {
        preferences.usesAnimations = true;
      }

      if (customStyle.textEffect) {
        preferences.usesTextEffects = true;
      }

      // Check for dark theme preference
      if (
        customStyle.bgColor &&
        (customStyle.bgColor.includes("rgba(") ||
          customStyle.bgColor.includes("#"))
      ) {
        // Very simple check - better would use color parsing
        const isDark =
          customStyle.bgColor.includes("rgba(1") ||
          customStyle.bgColor.includes("#0") ||
          customStyle.bgColor.includes("#1") ||
          customStyle.bgColor.includes("#2");
        preferences.darkThemePreference = isDark;
      }
    }

    // Analyze custom themes
    if (customThemes && customThemes.length > 0) {
      customThemes.forEach((theme) => {
        if (theme.gradient) {
          preferences.usesGradients = true;
          const colors = extractGradientColors(theme.gradient);
          preferences.favoriteColors.push(...colors);
        } else if (theme.bgColor) {
          preferences.favoriteColors.push(theme.bgColor);
        }

        if (theme.textColor) {
          preferences.favoriteTextColors.push(theme.textColor);
        }
      });
    }

    return preferences;
  };

  // --- Render ---
  const canUseCustomStyles = userRank !== null && userRank <= 500;
  const canUseFonts = userRank !== null && userRank <= 500; // Example rank check
  const canUseAnimations = userRank !== null && userRank <= 100; // Example rank check

  // Add this to apply compact styling
  const containerClassName = compactMode
    ? "messages-float compact-mode"
    : "messages-float";

  // If in compact mode, hide the fab button
  const showFab = !compactMode && isMobile;

  // If we're in global context, use the messages from context instead of fetching
  const { messages: globalMessages } = inGlobalContext
    ? useGlobalMessages()
    : { messages: [] };
  const messagesToDisplay = inGlobalContext ? globalMessages : messages;

  // Skip all the Firebase fetching logic if in global context
  useEffect(() => {
    if (inGlobalContext) return; // Skip Firebase fetching if we're in global context

    // Your existing Firebase fetching code...
  }, [session, latestInitialTimestamp, isMounted, inGlobalContext]);

  // In the return statement:
  return (
    <>
      {/* Messages Display Area */}
      <AnimatePresence>
        {(showMessages || inGlobalContext) && (
          <motion.div
            className={containerClassName}
            initial={inGlobalContext ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={inGlobalContext ? false : { opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <AnimatePresence mode="popLayout" initial={false}>
              {messagesToDisplay.map((msg, index) => (
                <Message
                  key={msg.id}
                  id={`message-${msg.id}`} // Add this ID attribute
                  msg={msg}
                  userWalletData={userWalletData}
                  userRank={userRank}
                  onDismiss={dismissMessage} // Always pass the dismiss function
                  index={index}
                  compactMode={compactMode}
                  onShowArchive={inGlobalContext ? null : onShowArchive} // Only allow archive in standalone mode
                />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Only render connection indicator and other UI when not in global context */}
      {!inGlobalContext && (
        <>
          {/* Connection Status Indicator */}
          {connectionStatus !== "connected" && (
            <div className="connection-status-indicator">
              {connectionStatus === "connecting" && "Connecting..."}
              {connectionStatus === "reconnecting" && "Reconnecting..."}
              {connectionStatus === "disconnected" && (
                <>
                  Disconnected.{" "}
                  <button onClick={retryConnection} className="retry-button">
                    Retry
                  </button>
                </>
              )}
            </div>
          )}

          {/* TODO: Add MessageArchive Modal display logic here */}
          <AnimatePresence>
            {showInput && session && (
              <motion.div
                className={`chat-input-overlay ${isMobile ? "mobile" : ""}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="chat-input-container">
                  <div className="chat-input-header">
                    <span>Send Message</span>
                    <div className="style-buttons">
                      {/* <Tooltip text="Get AI style suggestions" position="bottom"> */}
                      {/* <button
                      className="style-toggle-button suggestion-btn"
                      onClick={handleGetStyleSuggestions}
                      title="AI Style Suggestions"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        width="24"
                        height="24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M9 3.5V2M14.5 4L15.5 2.5M19 8l1.5-1M4 8l-1-1M7.5 14.5c0 1.5 1 4.5 5 4.5s5-3 5-4.5c0-2-2.5-2.5-2.5-5 0-1.5-1-2.5-2.5-2.5s-2.5 1-2.5 2.5c0 2.5-2.5 3-2.5 5z" />
                      </svg>
                    </button>
                  </Tooltip> */}
                      <Tooltip
                        text="Ctrl+T: Change message style"
                        position="bottom"
                      >
                        <button
                          className="style-toggle-button"
                          onClick={() => setShowStyleOptions(!showStyleOptions)}
                          title="Message Style"
                        >
                          <MdFormatColorFill />
                        </button>
                      </Tooltip>
                      <button
                        className="style-toggle-button"
                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                        title="Add Emoji"
                      >
                        <BsEmojiSmile />
                      </button>
                      <button
                        onClick={() => setShowInput(false)}
                        className="close-button"
                      >
                        ×
                      </button>
                    </div>
                  </div>

                  {/* Input Form */}
                  <form onSubmit={sendMessage} className="chat-input-form">
                    <input
                      ref={inputRef}
                      type="text"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder={
                        cooldown
                          ? `Wait ${cooldownTime > 0 ? cooldownTime : 0}s...`
                          : "Type your message..."
                      }
                      disabled={cooldown}
                      className="chat-input"
                      maxLength={100}
                    />

                    {/* Enhanced AI Style Suggestion Button */}
                    {message.trim().length > 0 && (
                      <button
                        type="button"
                        className={`style-suggestion-btn ${
                          isGeneratingSuggestions ? "generating" : ""
                        }`}
                        onClick={handleGetStyleSuggestions}
                        title="Get AI style suggestions"
                        disabled={
                          isSubmitting || cooldown || isGeneratingSuggestions
                        }
                      >
                        <span className="suggestion-btn-icon">
                          {isGeneratingSuggestions ? (
                            <div className="suggestion-spinner"></div>
                          ) : (
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 24 24"
                              width="18"
                              height="18"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                            >
                              <path d="M9 3.5V2M14.5 4L15.5 2.5M19 8l1.5-1M4 8l-1-1M7.5 14.5c0 1.5 1 4.5 5 4.5s5-3 5-4.5c0-2-2.5-2.5-2.5-5 0-1.5-1-2.5-2.5-2.5s-2.5 1-2.5 2.5c0 2.5-2.5 3-2.5 5z" />
                            </svg>
                          )}
                        </span>
                        <span className="suggestion-btn-text">
                          {isGeneratingSuggestions ? "Analyzing..." : "Style"}
                        </span>
                      </button>
                    )}

                    <button
                      type="submit"
                      disabled={!message.trim() || isSubmitting || cooldown}
                      className="send-button"
                    >
                      {isSubmitting ? "Sending..." : "Send"}
                    </button>
                  </form>

                  {/* User Rank Indicator */}
                  {userRank && (
                    <div className="user-rank-indicator">
                      {userRank <= 500 ? (
                        <div className="premium-user-badge">
                          Premium Messaging Enabled (Rank: #{userRank})
                        </div>
                      ) : (
                        <div className="standard-user-badge">
                          Standard Messaging (Rank: #{userRank})
                        </div>
                      )}
                    </div>
                  )}

                  {/* Style Options Panel */}
                  {showStyleOptions && (
                    <div className="style-options-dropdown">
                      <div className="style-options-header">
                        <div className="style-options-tabs">
                          {/* <button
                        className={`style-tab ${
                          activeStyleTab === "suggestions" ? "active" : ""
                        }`}
                        onClick={() => {
                          setActiveStyleTab("suggestions");
                          if (activeStyleTab !== "suggestions") {
                            handleGetStyleSuggestions(); // Auto-load suggestions when tab is selected
                          }
                        }}
                      >
                        <span className="tab-icon">💡</span> Suggestions
                      </button> */}
                          <button
                            className={`style-tab ${
                              activeStyleTab === "themes" ? "active" : ""
                            }`}
                            onClick={() => setActiveStyleTab("themes")}
                          >
                            Themes
                          </button>
                          {/* Other existing tabs */}
                          <button
                            className={`style-tab ${
                              activeStyleTab === "fonts" ? "active" : ""
                            }`}
                            onClick={() =>
                              canUseFonts && setActiveStyleTab("fonts")
                            }
                            title={
                              !canUseFonts
                                ? "Requires Top 500 Holder Status"
                                : "Font Options"
                            }
                          >
                            Fonts
                          </button>
                          <button
                            className={`style-tab ${
                              activeStyleTab === "animations" ? "active" : ""
                            }`}
                            onClick={() =>
                              canUseAnimations &&
                              setActiveStyleTab("animations")
                            }
                            title={
                              !canUseAnimations
                                ? "Requires Top 100 Holder Status"
                                : "Animation Options"
                            }
                          >
                            Animations
                          </button>
                        </div>

                        {Object.keys(customStyle).length > 0 && (
                          <button
                            className="reset-all-styles"
                            onClick={handleResetStyle}
                            title="Reset all styles"
                          >
                            Reset All
                          </button>
                        )}
                      </div>

                      {/* Themes Section */}
                      {activeStyleTab === "themes" && (
                        <>
                          {!isEditingCustomTheme ? (
                            <>
                              <h4>Color Themes</h4>
                              <div className="theme-grid">
                                {MESSAGE_THEMES.map((theme, index) => (
                                  <div
                                    key={`preset-${index}`}
                                    className={`theme-option ${
                                      customStyle.selectedThemeId ===
                                      `preset-${theme.name}`
                                        ? "selected"
                                        : ""
                                    }`}
                                    style={{
                                      background:
                                        theme.gradient || theme.bgColor,
                                      color: theme.textColor,
                                    }}
                                    onClick={() => handleSelectTheme(theme)}
                                  >
                                    <span className="theme-name">
                                      {theme.name}
                                    </span>
                                    <button
                                      className="edit-theme-btn"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        openThemeEditor(theme);
                                      }}
                                      title="Customize theme"
                                    >
                                      <MdModeEdit />
                                    </button>
                                  </div>
                                ))}

                                {/* Custom themes */}
                                {customThemes.map((theme) => (
                                  <div
                                    key={`custom-${theme.id}`}
                                    className={`theme-option custom-theme ${
                                      customStyle.selectedThemeId === theme.id
                                        ? "selected"
                                        : ""
                                    }`}
                                    style={{
                                      background:
                                        theme.gradient || theme.bgColor,
                                      color: theme.textColor,
                                    }}
                                    onClick={() => handleSelectTheme(theme)}
                                  >
                                    <button
                                      className="delete-theme-btn"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        deleteCustomTheme(theme.id);
                                      }}
                                      title="Delete theme"
                                    >
                                      <IoTrashOutline />
                                    </button>

                                    <span className="theme-name">
                                      {theme.name}
                                    </span>

                                    <button
                                      className="edit-theme-btn"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        openThemeEditor(theme);
                                      }}
                                      title="Customize theme"
                                    >
                                      <MdModeEdit />
                                    </button>
                                  </div>
                                ))}

                                {/* Add button for creating new theme */}
                                <button
                                  className="create-theme-btn"
                                  onClick={() => openThemeEditor()}
                                  title="Create custom theme"
                                >
                                  <IoAddCircleOutline />
                                  <span>Create Theme</span>
                                </button>
                              </div>
                            </>
                          ) : (
                            <div className="custom-theme-editor">
                              <h4>
                                {editingThemeId
                                  ? "Customize Theme"
                                  : "Create Custom Theme"}
                              </h4>

                              {editingThemeId && (
                                <p className="theme-editor-description">
                                  You're creating a copy of an existing theme.
                                  The original theme will not be modified.
                                </p>
                              )}

                              <div className="theme-editor-form">
                                <div className="theme-name-input">
                                  <label>Theme Name</label>
                                  <input
                                    type="text"
                                    value={customThemeColors.name}
                                    onChange={(e) =>
                                      updateCustomThemeColors({
                                        ...customThemeColors,
                                        name: e.target.value,
                                      })
                                    }
                                    placeholder="My Theme"
                                    maxLength={20}
                                  />
                                </div>

                                <div className="custom-theme-form">
                                  <label>
                                    Text Color:
                                    <ColorPicker
                                      color={customThemeColors.textColor}
                                      onChange={(color) =>
                                        updateCustomThemeColors({
                                          ...customThemeColors,
                                          textColor: color,
                                        })
                                      }
                                    />
                                  </label>

                                  <label>
                                    Use Gradient:
                                    <input
                                      type="checkbox"
                                      checked={customThemeColors.useGradient}
                                      onChange={() =>
                                        updateCustomThemeColors({
                                          ...customThemeColors,
                                          useGradient:
                                            !customThemeColors.useGradient,
                                        })
                                      }
                                    />
                                  </label>

                                  {customThemeColors.useGradient ? (
                                    <>
                                      <label>
                                        Gradient Start:
                                        <ColorPicker
                                          color={
                                            customThemeColors.gradientStart
                                          }
                                          onChange={(color) =>
                                            updateCustomThemeColors({
                                              ...customThemeColors,
                                              gradientStart: color,
                                            })
                                          }
                                        />
                                      </label>
                                      <label>
                                        Gradient End:
                                        <ColorPicker
                                          color={customThemeColors.gradientEnd}
                                          onChange={(color) =>
                                            updateCustomThemeColors({
                                              ...customThemeColors,
                                              gradientEnd: color,
                                            })
                                          }
                                        />
                                      </label>
                                    </>
                                  ) : (
                                    <label>
                                      Background Color:
                                      <ColorPicker
                                        color={customThemeColors.bgColor}
                                        onChange={(color) =>
                                          updateCustomThemeColors({
                                            ...customThemeColors,
                                            bgColor: color,
                                          })
                                        }
                                      />
                                    </label>
                                  )}

                                  <div className="custom-theme-buttons">
                                    <button onClick={saveCustomTheme}>
                                      <IoSaveOutline /> Save Theme
                                    </button>
                                    <button onClick={cancelThemeEditing}>
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </>
                      )}

                      {/* Fonts Section */}
                      {activeStyleTab === "fonts" && canUseFonts && (
                        <div className="premium-options">
                          <h4>Premium Font Style (Top 500 Holder)</h4>
                          <div className="font-selector">
                            <select
                              value={customStyle.fontFamily || "inherit"}
                              onChange={(e) =>
                                setCustomStyle((prev) => ({
                                  ...prev,
                                  fontFamily: e.target.value,
                                }))
                              }
                              className="font-select-dropdown"
                            >
                              {PREMIUM_FONTS.map((font) => (
                                <option
                                  key={font.value}
                                  value={font.value}
                                  style={{ fontFamily: font.value }}
                                >
                                  {font.name}
                                </option>
                              ))}
                            </select>

                            <div className="font-style-options">
                              <label>
                                <input
                                  type="checkbox"
                                  checked={customStyle.fontWeight === "bold"}
                                  onChange={() =>
                                    setCustomStyle((prev) => ({
                                      ...prev,
                                      fontWeight:
                                        prev.fontWeight === "bold"
                                          ? "normal"
                                          : "bold",
                                    }))
                                  }
                                />
                                Bold
                              </label>

                              <label>
                                <input
                                  type="checkbox"
                                  checked={customStyle.fontStyle === "italic"}
                                  onChange={() =>
                                    setCustomStyle((prev) => ({
                                      ...prev,
                                      fontStyle:
                                        prev.fontStyle === "italic"
                                          ? "normal"
                                          : "italic",
                                    }))
                                  }
                                />
                                Italic
                              </label>
                            </div>

                            <div className="font-size-selector">
                              <label
                                style={{
                                  color: "#ffffff",
                                }}
                              >
                                Font Size:
                              </label>
                              <select
                                value={customStyle.fontSize || "inherit"}
                                onChange={(e) =>
                                  setCustomStyle((prev) => ({
                                    ...prev,
                                    fontSize: e.target.value,
                                  }))
                                }
                                className="font-select-dropdown"
                              >
                                {FONT_SIZES.map((size) => (
                                  <option key={size.value} value={size.value}>
                                    {size.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>

                          {/* Add the UI component */}
                          <div className="font-presets">
                            <h4>Font Presets</h4>
                            <div className="preset-buttons">
                              {FONT_PRESETS.map((preset) => (
                                <button
                                  key={preset.name}
                                  className="font-preset-button"
                                  style={{ fontFamily: preset.fontFamily }}
                                  onClick={() =>
                                    setCustomStyle((prev) => ({
                                      ...prev,
                                      fontFamily: preset.fontFamily,
                                      fontWeight: preset.fontWeight || "normal",
                                      fontStyle: preset.fontStyle || "normal",
                                      fontSize: preset.fontSize || "inherit",
                                    }))
                                  }
                                >
                                  {preset.name}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Animations Section */}
                      {activeStyleTab === "animations" && canUseAnimations && (
                        <div className="premium-options elite-options">
                          <h4>Premium Animations (Top 100 Holder)</h4>
                          <div className="animation-selector">
                            {PREMIUM_ANIMATIONS.map((animation) => (
                              <div
                                key={animation.value || "none"}
                                className={`animation-option ${
                                  customStyle.animationType === animation.value
                                    ? "selected"
                                    : ""
                                }`}
                                onClick={() =>
                                  setCustomStyle((prev) => {
                                    // Clear animation if "None" is selected
                                    if (animation.value === null) {
                                      const newStyle = { ...prev };
                                      delete newStyle.animationType;
                                      return newStyle;
                                    }
                                    return {
                                      ...prev,
                                      animationType: animation.value,
                                    };
                                  })
                                }
                              >
                                {animation.name}
                              </div>
                            ))}
                          </div>

                          <div className="premium-options elite-options">
                            <h4>Premium Text Effects (Top 100 Holder)</h4>
                            <div className="effect-selector">
                              {TEXT_EFFECTS.map((effect) => (
                                <div
                                  key={effect.value || "none"}
                                  className={`effect-option ${
                                    customStyle.textEffect === effect.value
                                      ? "selected"
                                      : ""
                                  }`}
                                  onClick={() =>
                                    setCustomStyle((prev) => ({
                                      ...prev,
                                      textEffect: effect.value,
                                    }))
                                  }
                                >
                                  {effect.name}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Suggestions Section */}
                      {activeStyleTab === "suggestions" && (
                        <div className="style-suggestions-tab">
                          <h4>AI Style Recommendations</h4>

                          {isGeneratingSuggestions ? (
                            <div className="suggestions-loading">
                              <div className="suggestions-spinner"></div>
                              <p>
                                Analyzing your message and generating
                                personalized style suggestions...
                              </p>
                            </div>
                          ) : (
                            <>
                              {message.trim() === "" ? (
                                <div className="suggestions-placeholder">
                                  <p>
                                    Type a message to get AI style suggestions
                                  </p>
                                  <small>
                                    The AI will analyze your message content and
                                    suggest matching styles
                                  </small>
                                </div>
                              ) : (
                                <>
                                  {styleSuggestions.length > 0 ? (
                                    <>
                                      <div className="suggestions-header-info">
                                        <p>
                                          AI generated {styleSuggestions.length}{" "}
                                          style suggestions for your message
                                        </p>
                                      </div>

                                      <div className="style-suggestions-grid">
                                        {styleSuggestions.map(
                                          (suggestion, index) => (
                                            <div
                                              key={`suggestion-${index}`}
                                              className={`style-suggestion-card ${
                                                suggestion.isGenerated
                                                  ? "generated-suggestion"
                                                  : ""
                                              }`}
                                              onClick={() => {
                                                // Apply the style
                                                setCustomStyle({
                                                  ...customStyle,
                                                  ...suggestion.style,
                                                });

                                                // Show success animation
                                                const card =
                                                  document.querySelector(
                                                    `[data-suggestion-id="${index}"]`
                                                  );
                                                if (card) {
                                                  card.classList.add(
                                                    "suggestion-applied"
                                                  );
                                                  setTimeout(() => {
                                                    card.classList.remove(
                                                      "suggestion-applied"
                                                    );
                                                  }, 1000);
                                                }

                                                // Show toast message
                                                showToast(
                                                  `Applied "${suggestion.name}" style`,
                                                  "success"
                                                );
                                              }}
                                              data-suggestion-id={index}
                                            >
                                              {suggestion.isGenerated && (
                                                <div className="generated-tag">
                                                  <span className="generated-icon">
                                                    ✨
                                                  </span>{" "}
                                                  Generated Now
                                                </div>
                                              )}

                                              <div className="suggestion-match-score">
                                                <span className="match-label">
                                                  Match
                                                </span>
                                                <div className="match-meter">
                                                  <div
                                                    className={`match-fill ${getMatchScoreClass(
                                                      suggestion.matchScore
                                                    )}`}
                                                    style={{
                                                      width: `${
                                                        suggestion.matchScore
                                                          ? Math.round(
                                                              suggestion.matchScore *
                                                                100
                                                            )
                                                          : 80
                                                      }%`,
                                                    }}
                                                  ></div>
                                                </div>
                                                <span className="match-percentage">
                                                  {formatMatchPercentage(
                                                    suggestion.matchScore
                                                  )}
                                                </span>
                                              </div>

                                              <MessagePreview
                                                style={suggestion.style}
                                                username={
                                                  session?.user?.name || "you"
                                                }
                                                text={
                                                  message ||
                                                  suggestion.previewText
                                                }
                                                userImage={
                                                  userWalletData?.profileImage ||
                                                  session?.user?.image
                                                }
                                              />

                                              <div className="suggestion-card-info">
                                                <h5>{suggestion.name}</h5>
                                                <p>{suggestion.description}</p>
                                                {suggestion.basedOn && (
                                                  <span className="suggestion-tag">
                                                    Based on:{" "}
                                                    {suggestion.basedOn}
                                                  </span>
                                                )}
                                              </div>
                                            </div>
                                          )
                                        )}
                                      </div>
                                    </>
                                  ) : (
                                    <div className="no-suggestions">
                                      <p>
                                        No style suggestions available for this
                                        message
                                      </p>
                                      <small>
                                        Try entering a different message or
                                        using the basic themes
                                      </small>
                                    </div>
                                  )}
                                </>
                              )}

                              <div className="suggestions-actions">
                                <button
                                  className="refresh-suggestions-btn"
                                  onClick={handleGetStyleSuggestions}
                                  disabled={
                                    isGeneratingSuggestions ||
                                    message.trim() === ""
                                  }
                                >
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="16"
                                    height="16"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                  >
                                    <path d="M21 2v6h-6M3 12a9 9 0 0 1 15-6.7L21 8M3 22v-6h6M21 12a9 9 0 0 1-15 6.7L3 16" />
                                  </svg>
                                  Refresh Suggestions
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      )}

                      {/* Message Preview */}
                      <div className="message-preview-wrapper">
                        <h4 className="preview-title">Live Preview</h4>
                        <MessagePreview
                          style={
                            isEditingCustomTheme &&
                            Object.keys(previewStyle).length > 0
                              ? previewStyle
                              : customStyle
                          }
                          username={session?.user?.name}
                          text={message || "This is how your message will look"}
                          userImage={
                            userWalletData?.profileImage ||
                            session?.user?.image ||
                            "/default-avatar.png"
                          }
                        />
                      </div>
                    </div>
                  )}

                  {/* Fix for the handleSelectEmoji function */}
                  {/* Update the Emoji picker handler */}
                  {showEmojiPicker && isMounted && (
                    <>
                      {isMobile ? (
                        <div className="mobile-emoji-picker-wrapper">
                          <div
                            className="emoji-picker-backdrop"
                            onClick={() => setShowEmojiPicker(false)}
                          ></div>
                          <div className="mobile-emoji-picker-container">
                            <div className="mobile-emoji-picker-header">
                              <h4>Select Emoji</h4>
                              <button
                                onClick={() => setShowEmojiPicker(false)}
                                className="close-button"
                              >
                                ×
                              </button>
                            </div>
                            <SimpleMobileEmojiPicker
                              onSelect={(emoji) => {
                                setCustomStyle((prev) => ({
                                  ...prev,
                                  sticker: emoji,
                                }));
                                setShowEmojiPicker(false);
                              }}
                              onClose={() => setShowEmojiPicker(false)}
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="desktop-emoji-picker-wrapper">
                          <DraggableComponent
                            initialPosition={{
                              x: isMounted
                                ? Math.min(
                                    window.innerWidth - 350,
                                    Math.max(20, window.innerWidth / 2 - 160)
                                  )
                                : 0,
                              y: 50,
                            }}
                            onClose={() => setShowEmojiPicker(false)}
                          >
                            <SimpleEmojiPicker
                              onSelect={(emoji) => {
                                if (isMounted) triggerHapticFeedback();
                                setCustomStyle((prev) => ({
                                  ...prev,
                                  sticker: emoji,
                                }));
                                setShowEmojiPicker(false);
                              }}
                              onClose={() => setShowEmojiPicker(false)}
                            />
                          </DraggableComponent>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Onboarding Modal */}
          {showOnboarding && (
            <div className="onboarding-overlay">
              <div className="onboarding-modal">
                <h3>Welcome to Chat!</h3>
                <div className="onboarding-steps">
                  <div className="onboarding-step">
                    <div className="step-number">1</div>
                    <div className="step-content">
                      <h4>Send Messages</h4>
                      <p>Press Ctrl+M anytime to open this chat window</p>
                    </div>
                  </div>
                  <div className="onboarding-step">
                    <div className="step-number">2</div>
                    <div className="step-content">
                      <h4>Style Your Messages</h4>
                      <p>
                        Premium users can customize fonts, colors and add
                        effects
                      </p>
                    </div>
                  </div>
                  <div className="onboarding-step">
                    <div className="step-number">3</div>
                    <div className="step-content">
                      <h4>Add Stickers</h4>
                      <p>
                        Click the emoji button to add stickers to your messages
                      </p>
                    </div>
                  </div>
                </div>
                <button
                  className="onboarding-close-btn"
                  onClick={completeOnboarding}
                >
                  Got it!
                </button>
              </div>
            </div>
          )}

          {showFab && (
            <ChatFab
              onClick={toggleInput}
              showInput={showInput}
              messageCount={newMessageCount}
              onToggleMessages={toggleMessages}
              showMessages={showMessages}
              hasMessages={messages.length > 0}
            />
          )}
        </>
      )}
    </>
  );
}

// Add this helper function in your component
const calculateMatchScore = (suggestion, messageAnalysis) => {
  // Start with a base score
  let score = 0.75;

  // Get content type and sentiment from analysis
  const contentType = messageAnalysis.contentType.primaryType;
  const sentiment = messageAnalysis.sentiment;

  // Suggestion name and description in lowercase for matching
  const suggestionName = suggestion.name?.toLowerCase() || "";
  const suggestionDesc = suggestion.description?.toLowerCase() || "";

  // Content type matching (15% impact)
  if (
    suggestionName.includes(contentType) ||
    suggestionDesc.includes(contentType)
  ) {
    score += 0.15;
  }

  // Sentiment matching (10% impact)
  if (
    sentiment.isPositive &&
    (suggestionName.includes("positive") ||
      suggestionDesc.includes("positive") ||
      suggestionName.includes("celebrat") ||
      suggestionDesc.includes("vibrant"))
  ) {
    score += 0.1;
  } else if (
    sentiment.isNegative &&
    (suggestionName.includes("negative") ||
      suggestionDesc.includes("serious") ||
      suggestionDesc.includes("warning"))
  ) {
    score += 0.1;
  }

  // Message length matching (5% impact)
  const messageLength = messageAnalysis.length;
  if (
    (messageLength < 20 && suggestionDesc.includes("short")) ||
    (messageLength > 50 && suggestionDesc.includes("long"))
  ) {
    score += 0.05;
  }

  // Code content matching (20% impact)
  if (
    messageAnalysis.containsCodeSnippet &&
    (suggestionName.includes("code") ||
      suggestionDesc.includes("technical") ||
      suggestionDesc.includes("code"))
  ) {
    score += 0.2;
  }

  // Add a tiny random factor for diversity (1-3%)
  score += Math.random() * 0.02;

  // Cap maximum score at 0.98
  return Math.min(0.98, score);
};

const getMatchScoreClass = (score) => {
  if (!score || isNaN(score)) return "match-medium";
  if (score >= 0.9) return "match-excellent";
  if (score >= 0.8) return "match-good";
  if (score >= 0.7) return "match-medium";
  return "match-basic";
};

const formatMatchPercentage = (score) => {
  if (!score || isNaN(score)) return "85%";
  const percentage = Math.round(score * 100);
  return `${percentage}%`;
};

// Add this function to your component
const generateDynamicThemes = (messageAnalysis) => {
  const { contentType, sentiment } = messageAnalysis;
  const dynamicThemes = [];

  // Theme 1: Generate a theme based on content type
  const contentBasedTheme = generateContentBasedTheme(
    contentType.primaryType,
    sentiment
  );
  dynamicThemes.push({
    name: `${capitalize(contentType.primaryType)} Mood`,
    description: `Custom theme generated for your ${contentType.primaryType} message`,
    style: contentBasedTheme,
    matchScore: 0.92, // High score since it's specifically for this content
    isGenerated: true, // Flag to indicate this is a dynamically generated theme
  });

  // Theme 2: Generate a theme based on sentiment
  const sentimentBasedTheme = generateSentimentBasedTheme(
    sentiment,
    contentType.primaryType
  );
  dynamicThemes.push({
    name: `${getSentimentName(sentiment)} Expression`,
    description: `Reflects the emotion in your message`,
    style: sentimentBasedTheme,
    matchScore: 0.89, // Also high, but slightly lower than content-based
    isGenerated: true,
  });

  return dynamicThemes;
};

// Helper function to generate a theme based on content type
const generateContentBasedTheme = (contentType, sentiment) => {
  // Define color palettes for different content types
  const palettes = {
    announcement: {
      positive: {
        gradient: "linear-gradient(135deg, #3a1c71, #d76d77, #ffaf7b)",
        textColor: "#ffffff",
        fontFamily: "'Montserrat', sans-serif",
        fontWeight: "bold",
      },
      negative: {
        gradient: "linear-gradient(135deg, #232526, #414345)",
        textColor: "#ff9b9b",
        fontFamily: "'Montserrat', sans-serif",
        fontWeight: "bold",
      },
      neutral: {
        gradient: "linear-gradient(135deg, #5614B0, #DBD65C)",
        textColor: "#ffffff",
        fontFamily: "'Poppins', sans-serif",
      },
    },
    question: {
      gradient: "linear-gradient(135deg, #654ea3, #eaafc8)",
      textColor: "#ffffff",
      fontFamily: "'Nunito', sans-serif",
      fontStyle: "italic",
    },
    trading: {
      positive: {
        gradient: "linear-gradient(135deg, #134E5E, #71B280)",
        textColor: "#ffffff",
        fontFamily: "'Space Grotesk', sans-serif",
      },
      negative: {
        gradient: "linear-gradient(135deg, #232526, #414345)",
        textColor: "#ff4a4a",
        fontFamily: "'Space Grotesk', sans-serif",
      },
      neutral: {
        gradient: "linear-gradient(135deg, #0F2027, #203A43, #2C5364)",
        textColor: "#7acdff",
        fontFamily: "'Space Grotesk', sans-serif",
      },
    },
    technical: {
      bgColor: "#1e1e1e",
      textColor: "#4ec9b0",
      fontFamily: "'Fira Code', monospace",
      fontSize: "0.9rem",
    },
    celebration: {
      gradient: "linear-gradient(135deg, #bc4e9c, #f80759)",
      textColor: "#ffffff",
      fontFamily: "'Poppins', sans-serif",
      fontWeight: "bold",
      animationType: "pulse",
    },
    warning: {
      gradient: "linear-gradient(135deg, #434343, #000000)",
      textColor: "#ff4545",
      fontFamily: "'Roboto', sans-serif",
      fontWeight: "bold",
    },
    general: {
      positive: {
        gradient: "linear-gradient(135deg, #2193b0, #6dd5ed)",
        textColor: "#ffffff",
        fontFamily: "'Poppins', sans-serif",
      },
      negative: {
        gradient: "linear-gradient(135deg, #141e30, #243b55)",
        textColor: "#e0e0e0",
        fontFamily: "'Roboto', sans-serif",
      },
      neutral: {
        gradient: "linear-gradient(135deg, #3E5151, #DECBA4)",
        textColor: "#ffffff",
        fontFamily: "'Montserrat', sans-serif",
      },
    },
  };

  // Get the appropriate palette based on content type and sentiment
  let palette;
  if (palettes[contentType]) {
    // If the content type has sentiment-specific palettes
    if (
      typeof palettes[contentType] === "object" &&
      palettes[contentType].positive
    ) {
      if (sentiment.isPositive) {
        palette = palettes[contentType].positive;
      } else if (sentiment.isNegative) {
        palette = palettes[contentType].negative;
      } else {
        palette = palettes[contentType].neutral;
      }
    } else {
      palette = palettes[contentType]; // Use the generic one
    }
  } else {
    // Fallback to general palette
    if (sentiment.isPositive) {
      palette = palettes.general.positive;
    } else if (sentiment.isNegative) {
      palette = palettes.general.negative;
    } else {
      palette = palettes.general.neutral;
    }
  }

  // Add some variation to make each generated theme unique
  const theme = { ...palette };

  // Add a unique aspect based on timestamp to ensure variation
  const hueShift = (new Date().getSeconds() % 20) - 10; // -10 to +10 range

  if (theme.gradient) {
    // No easy way to shift hue in gradient strings, so just add a subtle variation marker
    theme.gradient = theme.gradient.replace(
      "deg,",
      `deg, /* unique:${Math.random().toString(36).substring(7)} */`
    );
  } else if (theme.bgColor && theme.bgColor.startsWith("#")) {
    // Slight color variation for background colors
    theme.bgColor = shiftHexColor(theme.bgColor, hueShift);
  }

  return theme;
};

// Helper function to generate a theme based on sentiment
const generateSentimentBasedTheme = (sentiment, contentType) => {
  let theme = {};

  // Strong positive (excited, enthusiastic)
  if (sentiment.score > 0.3) {
    theme = {
      gradient: "linear-gradient(135deg, #FF8008, #FFC837)",
      textColor: "#ffffff",
      fontFamily: "'Montserrat', sans-serif",
      fontWeight: "bold",
    };
  }
  // Mild positive (happy, satisfied)
  else if (sentiment.score > 0.1) {
    theme = {
      gradient: "linear-gradient(135deg, #56ab2f, #a8e063)",
      textColor: "#ffffff",
      fontFamily: "'Nunito', sans-serif",
    };
  }
  // Neutral (balanced, informational)
  else if (sentiment.score > -0.1) {
    theme = {
      gradient: "linear-gradient(135deg, #3494E6, #EC6EAD)",
      textColor: "#ffffff",
      fontFamily: "'Roboto', sans-serif",
    };
  }
  // Mild negative (concerned, cautious)
  else if (sentiment.score > -0.3) {
    theme = {
      gradient: "linear-gradient(135deg, #614385, #516395)",
      textColor: "#f1f1f1",
      fontFamily: "'Space Grotesk', sans-serif",
    };
  }
  // Strong negative (warning, critical)
  else {
    theme = {
      gradient: "linear-gradient(135deg, #232526, #414345)",
      textColor: "#ff4a4a",
      fontFamily: "'Roboto', sans-serif",
      fontWeight: "bold",
    };
  }

  // Add some content-specific tweaks
  if (contentType === "technical") {
    theme.fontFamily = "'Fira Code', monospace";
    theme.fontSize = "0.9rem";
  } else if (contentType === "celebration") {
    theme.animationType = "pulse";
  } else if (contentType === "question") {
    theme.fontStyle = "italic";
  }

  // Add uniqueness to this theme
  const randomElement = Math.floor(Math.random() * 5);
  if (randomElement === 0) {
    theme.textEffect = sentiment.isNegative ? "shadow" : "neon";
  } else if (randomElement === 1 && !sentiment.isNegative) {
    theme.animationType = "pulse";
  }

  return theme;
};

// Helper function to get a friendly name for sentiment
const getSentimentName = (sentiment) => {
  if (sentiment.score > 0.3) return "Excited";
  if (sentiment.score > 0.1) return "Positive";
  if (sentiment.score > -0.1) return "Neutral";
  if (sentiment.score > -0.3) return "Concerned";
  return "Critical";
};

// Helper function to capitalize first letter
const capitalize = (string) => {
  if (!string) return "";
  return string.charAt(0).toUpperCase() + string.slice(1);
};

// Helper function to shift hex color by a hue amount
const shiftHexColor = (hex, amount) => {
  // Simple implementation - for production you might want a more robust color manipulation
  if (!hex || !hex.startsWith("#")) return hex;

  // Convert hex to RGB
  let r = parseInt(hex.slice(1, 3), 16);
  let g = parseInt(hex.slice(3, 5), 16);
  let b = parseInt(hex.slice(5, 7), 16);

  // Simple shift (not a true hue shift but works for subtle variations)
  r = Math.max(0, Math.min(255, r + amount));
  g = Math.max(0, Math.min(255, g + amount));
  b = Math.max(0, Math.min(255, b + amount));

  // Convert back to hex
  return `#${r.toString(16).padStart(2, "0")}${g
    .toString(16)
    .padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
};
