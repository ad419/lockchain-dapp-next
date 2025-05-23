"use client";
import React, { useState, useRef, useEffect } from "react";
import { useGlobalMessages } from "../context/GlobalMessagesContext";
import { useSession } from "next-auth/react";
import "../styles/GlobalMessageBubble.css";
import "../styles/Messages.css";

// Define style constants inside the component file
// This ensures they are available where needed
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

const BACKGROUND_ANIMATIONS = [
  { name: "None", value: null },
  { name: "Pulse", value: "bg-pulse" },
  { name: "Gradient Flow", value: "bg-gradient-flow" },
  { name: "Glow", value: "bg-glow" },
  { name: "Shimmer", value: "bg-shimmer" },
  { name: "Cyberpunk", value: "bg-cyberpunk" },
];

// Simple timestamp formatter
const formatMessageTime = (timestamp) => {
  if (!timestamp) return "Just now";
  return new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
};

console.log("GlobalMessageBubble.jsx MessageItem component rendered!");

// Updated MessageItem component with background animations

const MessageItem = ({ message, isOwnMessage }) => {
  return (
    <div className={`lc-message ${isOwnMessage ? "lc-message-own" : ""}`}>
      <div className="lc-message-avatar">
        {message.profileImage ? (
          <img src={message.profileImage} alt={message.user} />
        ) : (
          <span>{(message.user || "?")[0].toUpperCase()}</span>
        )}
      </div>
      <div className="lc-message-content">
        <div className="lc-message-header">
          <span className="lc-message-user">{message.user || "Anonymous"}</span>
          <span className="lc-message-time">
            {formatMessageTime(message.timestamp)}
          </span>
        </div>
        <div
          className={`lc-message-bubble ${
            message.customStyle?.bgAnimation || ""
          }`}
          style={{
            background:
              message.customStyle?.gradient || message.customStyle?.bgColor,
            color: message.customStyle?.textColor,
            fontFamily: message.customStyle?.fontFamily,
          }}
        >
          <div
            className={`lc-message-text ${
              message.customStyle?.textEffect || ""
            }`}
            data-text={message.text}
          >
            {message.text}
          </div>
        </div>
      </div>
    </div>
  );
};

export default function GlobalMessageBubble() {
  const {
    messages,
    isMinimized,
    unreadCount,
    isLoading,
    connectionStatus,
    toggleMinimized,
    minimize,
    addMessage,
    currentUser,
    retryConnection,
  } = useGlobalMessages();

  // Local state
  const [messageText, setMessageText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [showLoginAnimation, setShowLoginAnimation] = useState(false);
  const [showStyleOptions, setShowStyleOptions] = useState(false);
  const [customStyle, setCustomStyle] = useState({});
  const [activeStyleTab, setActiveStyleTab] = useState("themes");
  const [customThemeColors, setCustomThemeColors] = useState({
    background: "#1E1E2E",
    textColor: "#FFFFFF",
    gradient: false,
    gradientColor1: "#627eea",
    gradientColor2: "#3c58c4",
  });
  // Add this to your component state declarations (around line 163)
  const [gradientAngle, setGradientAngle] = useState(135);
  const [gradientOrientation, setGradientOrientation] = useState("linear"); // linear or radial
  const [showCustomThemeCreator, setShowCustomThemeCreator] = useState(false);
  const [customThemeName, setCustomThemeName] = useState("My Custom Theme");
  const [savedThemes, setSavedThemes] = useState([]);
  const [selectedThemeId, setSelectedThemeId] = useState(null);

  // Refs
  const inputRef = useRef(null);
  const messagesContainerRef = useRef(null);
  // Add this ref near your other refs (around line 175)
  const styleOptionsRef = useRef(null);

  // Get user session instead of wallet
  const { data: session, status } = useSession();
  const isConnected = status === "authenticated";

  // Focus input when chat opens
  useEffect(() => {
    if (!isMinimized && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 300);
    }
  }, [isMinimized]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesContainerRef.current && messages.length > 0) {
      messagesContainerRef.current.scrollTop =
        messagesContainerRef.current.scrollHeight;
    }
  }, [messages.length]);

  // Load saved style on component mount
  useEffect(() => {
    try {
      const savedStyle = localStorage.getItem("chatCustomStyle");
      if (savedStyle) {
        setCustomStyle(JSON.parse(savedStyle));
      }
    } catch (error) {
      console.error("Error loading style from localStorage:", error);
    }
  }, []);

  // Add useEffect to load saved themes from localStorage on component mount
  useEffect(() => {
    const savedThemesStr = localStorage.getItem("savedChatThemes");
    if (savedThemesStr) {
      try {
        setSavedThemes(JSON.parse(savedThemesStr));
      } catch (error) {
        console.error("Error loading saved themes:", error);
      }
    }
  }, []);

  // Handle viewport height for mobile browsers
  useEffect(() => {
    // Set initial viewport height as a CSS variable
    const setViewportHeight = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty("--vh", `${vh}px`);
    };

    // Set it initially
    setViewportHeight();

    // Update on resize and orientation change
    window.addEventListener("resize", setViewportHeight);
    window.addEventListener("orientationchange", setViewportHeight);

    return () => {
      window.removeEventListener("resize", setViewportHeight);
      window.removeEventListener("orientationchange", setViewportHeight);
    };
  }, []);

  // Handle focusing on the input field
  useEffect(() => {
    const handleFocus = () => {
      // Add a slight delay to ensure the keyboard is fully up
      setTimeout(() => {
        // Scroll to the input field when it receives focus
        if (inputRef.current) {
          inputRef.current.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });

          // On iOS specifically, we may need to scroll the entire page
          window.scrollTo(0, document.body.scrollHeight);
        }

        // Scroll messages to bottom as well
        if (messagesContainerRef.current) {
          messagesContainerRef.current.scrollTop =
            messagesContainerRef.current.scrollHeight;
        }
      }, 300);
    };

    // Add focus listener to input field
    const inputElement = inputRef.current;
    if (inputElement) {
      inputElement.addEventListener("focus", handleFocus);
    }

    return () => {
      if (inputElement) {
        inputElement.removeEventListener("focus", handleFocus);
      }
    };
  }, [isMinimized]); // Re-add listeners when chat is opened/closed

  // Add this effect after your other useEffect blocks

  // Prevent zoom on touch devices
  useEffect(() => {
    const preventZoom = (e) => {
      if (e.touches.length > 1) {
        e.preventDefault();
      }
    };

    const preventFocusZoom = () => {
      // Add a very slight delay before setting the font size back
      setTimeout(() => {
        const viewportMeta = document.querySelector('meta[name="viewport"]');
        if (viewportMeta) {
          viewportMeta.setAttribute(
            "content",
            "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"
          );
        }
      }, 100);
    };

    document.addEventListener("touchstart", preventZoom, { passive: false });

    // Apply to your input element
    const inputElement = inputRef.current;
    if (inputElement) {
      inputElement.addEventListener("focus", preventFocusZoom);
    }

    return () => {
      document.removeEventListener("touchstart", preventZoom);
      if (inputElement) {
        inputElement.removeEventListener("focus", preventFocusZoom);
      }
    };
  }, [isMinimized]);

  // Add this useEffect to handle clicking outside the style panel (after your other useEffects)
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        showStyleOptions &&
        styleOptionsRef.current &&
        !styleOptionsRef.current.contains(event.target) &&
        // Don't close if clicking on the style toggle button
        !event.target.closest(".lc-chat-tool-btn")
      ) {
        setShowStyleOptions(false);
      }
    };

    // Add event listener when style options are shown
    if (showStyleOptions) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    // Clean up
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showStyleOptions]);

  // Handle login animation
  const handleLoginPrompt = () => {
    setShowLoginAnimation(true);
    setTimeout(() => setShowLoginAnimation(false), 2000);
  };

  // Toggle style options
  const toggleStyleOptions = () => {
    setShowStyleOptions(!showStyleOptions);
  };

  // Select a theme
  const handleSelectTheme = (theme, themeId = null) => {
    // Store the selected theme ID
    setSelectedThemeId(themeId);

    const newStyle = {
      ...customStyle,
      textColor: theme.textColor,
    };

    if (theme.gradient) {
      newStyle.gradient = theme.gradient;
      delete newStyle.bgColor;
    } else {
      newStyle.bgColor = theme.bgColor;
      delete newStyle.gradient;
    }

    setCustomStyle(newStyle);
    localStorage.setItem("chatCustomStyle", JSON.stringify(newStyle));
  };

  // Select a font
  const handleSelectFont = (font) => {
    setCustomStyle({
      ...customStyle,
      fontFamily: font,
    });
    localStorage.setItem(
      "chatCustomStyle",
      JSON.stringify({
        ...customStyle,
        fontFamily: font,
      })
    );
  };

  // Select a text effect
  const handleSelectTextEffect = (effect) => {
    setCustomStyle({
      ...customStyle,
      textEffect: effect,
    });
    localStorage.setItem(
      "chatCustomStyle",
      JSON.stringify({
        ...customStyle,
        textEffect: effect,
      })
    );
  };

  // Select an animation
  const handleSelectAnimation = (animation) => {
    setCustomStyle({
      ...customStyle,
      animationType: animation,
    });
    localStorage.setItem(
      "chatCustomStyle",
      JSON.stringify({
        ...customStyle,
        animationType: animation,
      })
    );
  };

  // Handle background animations
  const handleSelectBgAnimation = (animation) => {
    setCustomStyle({
      ...customStyle,
      bgAnimation: animation,
    });
    localStorage.setItem(
      "chatCustomStyle",
      JSON.stringify({
        ...customStyle,
        bgAnimation: animation,
      })
    );
  };

  // Handle color input changes
  const handleColorChange = (type, value) => {
    const updatedColors = {
      ...customThemeColors,
      [type]: value,
    };

    setCustomThemeColors(updatedColors);

    // Create a temporary preview style that doesn't affect the saved style
    const previewStyle = {
      ...customStyle,
      textColor: updatedColors.textColor,
    };

    if (updatedColors.gradient) {
      const gradientString =
        gradientOrientation === "linear"
          ? `linear-gradient(${gradientAngle}deg, ${updatedColors.gradientColor1}, ${updatedColors.gradientColor2})`
          : `radial-gradient(circle, ${updatedColors.gradientColor1}, ${updatedColors.gradientColor2})`;

      previewStyle.previewGradient = gradientString;
    } else {
      previewStyle.previewBgColor = updatedColors.background;
    }

    // Update the temporary preview without saving to localStorage
    setCustomStyle(previewStyle);
  };

  // Toggle gradient mode
  const toggleGradientMode = () => {
    const updatedGradient = !customThemeColors.gradient;

    const updatedColors = {
      ...customThemeColors,
      gradient: updatedGradient,
    };

    setCustomThemeColors(updatedColors);

    // Update preview immediately when switching modes
    const previewStyle = {
      ...customStyle,
      textColor: updatedColors.textColor,
    };

    if (updatedGradient) {
      previewStyle.previewGradient = `linear-gradient(135deg, ${updatedColors.gradientColor1}, ${updatedColors.gradientColor2})`;
      delete previewStyle.previewBgColor;
    } else {
      previewStyle.previewBgColor = updatedColors.background;
      delete previewStyle.previewGradient;
    }

    setCustomStyle(previewStyle);
  };

  // Apply custom theme
  const applyCustomTheme = () => {
    const newStyle = {
      ...customStyle,
      textColor: customThemeColors.textColor,
    };

    // Remove preview properties
    delete newStyle.previewGradient;
    delete newStyle.previewBgColor;

    if (customThemeColors.gradient) {
      const gradientString =
        gradientOrientation === "linear"
          ? `linear-gradient(${gradientAngle}deg, ${customThemeColors.gradientColor1}, ${customThemeColors.gradientColor2})`
          : `radial-gradient(circle, ${customThemeColors.gradientColor1}, ${customThemeColors.gradientColor2})`;

      newStyle.gradient = gradientString;
      newStyle.gradientType = gradientOrientation;
      newStyle.gradientAngle = gradientAngle;
      delete newStyle.bgColor;
    } else {
      newStyle.bgColor = customThemeColors.background;
      delete newStyle.gradient;
      delete newStyle.gradientType;
      delete newStyle.gradientAngle;
    }

    setCustomStyle(newStyle);
    localStorage.setItem("chatCustomStyle", JSON.stringify(newStyle));

    // Add visual feedback for successful application
    const applyButton = document.querySelector(".lc-apply-custom-theme");
    if (applyButton) {
      applyButton.textContent = "✓ Theme Applied!";
      setTimeout(() => {
        applyButton.textContent = "Apply";
      }, 1500);
    }
  };

  // Update saveCustomTheme function (around line 466)

  const saveCustomTheme = () => {
    // Create theme object
    const newTheme = {
      id: Date.now().toString(),
      name: customThemeName.trim() || "Custom Theme",
      gradient: customThemeColors.gradient,
      bgColor: customThemeColors.background,
      textColor: customThemeColors.textColor,
      gradientColor1: customThemeColors.gradientColor1,
      gradientColor2: customThemeColors.gradientColor2,
      gradientOrientation: gradientOrientation,
      gradientAngle: gradientAngle,
    };

    // Add to saved themes
    const updatedThemes = [...savedThemes, newTheme];
    setSavedThemes(updatedThemes);

    // Save to localStorage
    localStorage.setItem("savedChatThemes", JSON.stringify(updatedThemes));

    // Apply the theme
    applyCustomTheme();

    // Reset theme name
    setCustomThemeName("");

    // Show success feedback
    const saveButton = document.querySelector(".lc-save-theme-btn");
    if (saveButton) {
      saveButton.classList.add("success");
      saveButton.textContent = "✓ Theme Saved!";
      setTimeout(() => {
        saveButton.classList.remove("success");
        saveButton.textContent = "Save Theme";
      }, 1500);
    }
  };

  // Delete a saved theme
  const deleteTheme = (e, themeId) => {
    e.stopPropagation();
    const updatedThemes = savedThemes.filter((theme) => theme.id !== themeId);
    setSavedThemes(updatedThemes);
    localStorage.setItem("savedChatThemes", JSON.stringify(updatedThemes));
  };

  // Update applySavedTheme function (around line 503)

  const applySavedTheme = (theme) => {
    // Set the selected theme ID
    setSelectedThemeId(theme.id);

    // Update custom theme colors with the saved theme
    setCustomThemeColors({
      gradient: theme.gradient,
      background: theme.bgColor,
      textColor: theme.textColor,
      gradientColor1: theme.gradientColor1,
      gradientColor2: theme.gradientColor2,
    });

    // Update gradient angle and orientation if available
    if (theme.gradientAngle !== undefined) {
      setGradientAngle(theme.gradientAngle);
    } else {
      setGradientAngle(135); // Default
    }

    if (theme.gradientOrientation) {
      setGradientOrientation(theme.gradientOrientation);
    } else {
      setGradientOrientation("linear"); // Default
    }

    // Apply the theme styling
    const themeStyle = {
      textColor: theme.textColor,
    };

    if (theme.gradient) {
      // Use saved gradient settings if available
      const gradientString =
        theme.gradientOrientation === "radial"
          ? `radial-gradient(circle, ${theme.gradientColor1}, ${theme.gradientColor2})`
          : `linear-gradient(${theme.gradientAngle || 135}deg, ${
              theme.gradientColor1
            }, ${theme.gradientColor2})`;

      themeStyle.gradient = gradientString;
      themeStyle.gradientType = theme.gradientOrientation || "linear";
      themeStyle.gradientAngle = theme.gradientAngle || 135;
    } else {
      themeStyle.bgColor = theme.bgColor;
    }

    setCustomStyle({
      ...customStyle,
      ...themeStyle,
    });

    localStorage.setItem(
      "chatCustomStyle",
      JSON.stringify({
        ...customStyle,
        ...themeStyle,
      })
    );
  };

  // Add this new useEffect at the end of your other useEffect hooks

  // // Handle browser bottom navigation bar
  // useEffect(() => {
  //   // Function to handle visibility changes (when browser UI shows/hides)
  //   const handleVisibilityChange = () => {
  //     setTimeout(() => {
  //       // Force redraw of chat container to adjust to new viewport
  //       const chatContainer = document.querySelector(".lc-chat-container");
  //       if (chatContainer && !isMinimized) {
  //         // Calculate visible viewport height
  //         const viewportHeight = window.innerHeight;

  //         // Apply a specific height for the chat panel
  //         const chatPanel = document.querySelector(".lc-chat-panel");
  //         if (chatPanel) {
  //           chatPanel.style.height = `${viewportHeight - 0}px`; // 60px for navbar

  //           // Force scroll to bottom
  //           if (messagesContainerRef.current) {
  //             messagesContainerRef.current.scrollTop =
  //               messagesContainerRef.current.scrollHeight;
  //           }

  //           // Ensure input is visible
  //           inputRef.current?.scrollIntoView({
  //             behavior: "smooth",
  //             block: "center",
  //           });
  //         }
  //       }
  //     }, 300); // Small delay to let the browser UI settle
  //   };

  //   // When chat is opened, handle potential browser UI changes
  //   if (!isMinimized) {
  //     handleVisibilityChange();
  //     window.addEventListener("resize", handleVisibilityChange);
  //     window.addEventListener("scroll", handleVisibilityChange);

  //     // For iOS Safari specifically
  //     window.visualViewport?.addEventListener("resize", handleVisibilityChange);
  //     window.visualViewport?.addEventListener("scroll", handleVisibilityChange);

  //     // When keyboard appears or disappears
  //     inputRef.current?.addEventListener("focus", handleVisibilityChange);
  //     inputRef.current?.addEventListener("blur", handleVisibilityChange);
  //   }

  //   return () => {
  //     window.removeEventListener("resize", handleVisibilityChange);
  //     window.removeEventListener("scroll", handleVisibilityChange);
  //     window.visualViewport?.removeEventListener(
  //       "resize",
  //       handleVisibilityChange
  //     );
  //     window.visualViewport?.removeEventListener(
  //       "scroll",
  //       handleVisibilityChange
  //     );
  //     inputRef.current?.removeEventListener("focus", handleVisibilityChange);
  //     inputRef.current?.removeEventListener("blur", handleVisibilityChange);
  //   };
  // }, [isMinimized]);

  // // Add right after your viewport height useEffect (around line 233)

  // // Handle visual viewport changes (especially virtual keyboard)
  // useEffect(() => {
  //   if (typeof window.visualViewport === "undefined") return;

  //   const handleViewportChange = () => {
  //     // Calculate keyboard height
  //     const viewportHeight = window.visualViewport.height;
  //     const windowHeight = window.innerHeight;
  //     const keyboardHeight = windowHeight - viewportHeight;

  //     // Set a CSS variable for keyboard height
  //     document.documentElement.style.setProperty(
  //       "--keyboard-height",
  //       `${keyboardHeight}px`
  //     );

  //     // Add class if keyboard is likely open (keyboard is usually > 150px)
  //     if (keyboardHeight > 150) {
  //       document.body.classList.add("lc-keyboard-active");
  //     } else {
  //       document.body.classList.remove("lc-keyboard-active");
  //     }

  //     // When keyboard is shown, ensure input is visible
  //     if (keyboardHeight > 150 && inputRef.current) {
  //       // Use requestAnimationFrame to wait for layout changes
  //       requestAnimationFrame(() => {
  //         inputRef.current?.scrollIntoView({
  //           behavior: "smooth",
  //           block: "center",
  //         });
  //       });
  //     }
  //   };

  //   // Only add listeners when chat is open
  //   if (!isMinimized) {
  //     window.visualViewport.addEventListener("resize", handleViewportChange);
  //     window.visualViewport.addEventListener("scroll", handleViewportChange);
  //   }

  //   return () => {
  //     window.visualViewport.removeEventListener("resize", handleViewportChange);
  //     window.visualViewport.removeEventListener("scroll", handleViewportChange);
  //   };
  // }, [isMinimized]);

  // Toggle custom theme creator
  const toggleCustomThemeCreator = () => {
    setShowCustomThemeCreator(!showCustomThemeCreator);
  };

  // Send message
  const handleSendMessage = async () => {
    if (!isConnected) {
      handleLoginPrompt();
      return;
    }

    if (messageText.trim() === "" || isSending) return;

    setIsSending(true);
    try {
      const success = await addMessage({
        text: messageText.trim(),
        customStyle: customStyle, // Include the custom style
        userRank: null,
      });
      if (success) {
        setMessageText("");
      }
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setIsSending(false);
    }
  };

  // Handle Enter key
  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey && !isSending) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Get current user walletAddress
  const userWalletAddress =
    currentUser?.walletAddress || session?.user?.walletAddress;

  // Add this function with your other handler functions (around line 600)

  // Reset style to defaults
  const handleResetStyle = () => {
    // Create default style (no customizations)
    const defaultStyle = {};

    // Update state
    setCustomStyle(defaultStyle);

    // Reset theme selection
    setSelectedThemeId(null);

    // Clear from localStorage
    localStorage.removeItem("chatCustomStyle");

    // Reset custom theme colors to defaults
    setCustomThemeColors({
      background: "#1E1E2E",
      textColor: "#FFFFFF",
      gradient: false,
      gradientColor1: "#627eea",
      gradientColor2: "#3c58c4",
    });

    // Reset other style-related states
    setGradientAngle(135);
    setGradientOrientation("linear");

    // Provide visual feedback
    const resetButton = document.querySelector(".lc-style-reset");
    if (resetButton) {
      resetButton.textContent = "✓ Reset";
      setTimeout(() => {
        resetButton.textContent = "Reset";
      }, 1500);
    }
  };

  return (
    <div
      className={`lc-chat-container ${isMinimized ? "minimized" : "expanded"}`}
    >
      {!isMinimized ? (
        <div className="lc-chat-panel">
          {/* Header */}
          <div className="lc-chat-header">
            <div className="lc-chat-header-left">
              <div className={`lc-chat-status ${connectionStatus}`}></div>
              <h3 className="lc-chat-header-title">LOCKCHAIN GLOBAL CHAT</h3>
            </div>
            <div className="lc-chat-header-controls">
              <button
                className="lc-chat-control-btn"
                onClick={minimize}
                aria-label="Close chat"
              >
                ×
              </button>
            </div>
          </div>

          {/* Messages area */}
          <div className="lc-chat-messages" ref={messagesContainerRef}>
            {isLoading ? (
              <div className="lc-chat-loading">
                <div className="loading-spinner"></div>
                <p>Loading messages...</p>
              </div>
            ) : connectionStatus === "disconnected" ? (
              <div className="lc-chat-error">
                <p>Could not connect to global chat</p>
                <button className="lc-chat-retry-btn" onClick={retryConnection}>
                  Reconnect
                </button>
              </div>
            ) : messages.length === 0 ? (
              <div className="lc-chat-empty">
                <div className="lc-chat-empty-icon">💬</div>
                <p className="lc-chat-empty-title">No messages yet</p>
                <p className="lc-chat-empty-text">
                  Be the first to join the conversation!
                </p>
              </div>
            ) : (
              <div className="message-stream">
                {messages
                  .slice() // Create a copy of the array to avoid mutating the original
                  .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)) // Sort by timestamp ascending
                  .map((msg) => (
                    <MessageItem
                      key={msg.id}
                      message={msg}
                      isOwnMessage={msg.walletAddress === userWalletAddress}
                    />
                  ))}
              </div>
            )}
          </div>

          {/* Input area */}
          <div className="lc-chat-input-area">
            {isConnected && (
              <button
                className="lc-chat-tool-btn"
                onClick={toggleStyleOptions}
                aria-label="Message style options"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                </svg>
              </button>
            )}

            <input
              ref={inputRef}
              type="text"
              className="lc-chat-input"
              placeholder={
                !isConnected
                  ? "Sign in to chat..."
                  : isSending
                  ? "Sending..."
                  : "Type your message..."
              }
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              onKeyPress={handleKeyPress}
              style={{ fontSize: "16px" }} // Add this to prevent zoom on iOS
              disabled={
                isSending || connectionStatus === "disconnected" || !isConnected
              }
            />

            <button
              className={`lc-chat-send-btn ${
                !isConnected ? "lc-chat-wallet-required" : ""
              }`}
              onClick={isConnected ? handleSendMessage : handleLoginPrompt}
              disabled={
                (isConnected && messageText.trim() === "") ||
                isSending ||
                connectionStatus === "disconnected"
              }
              aria-label={isConnected ? "Send message" : "Sign in"}
            >
              {isSending ? (
                <div className="lc-send-loading">
                  <span className="lc-send-loading-dot"></span>
                  <span className="lc-send-loading-dot"></span>
                  <span className="lc-send-loading-dot"></span>
                </div>
              ) : !isConnected ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="lc-wallet-icon"
                  width="18"
                  height="18"
                >
                  <path d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="lc-send-icon"
                  width="18"
                  height="18"
                >
                  <path d="M3.478 2.404a.75.75 0 0 0-.926.941l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.404Z" />
                </svg>
              )}
            </button>
          </div>

          {/* Style options panel */}
          {showStyleOptions && (
            <div className="lc-style-options-panel" ref={styleOptionsRef}>
              <div className="lc-style-panel-header">
                <div className="lc-style-panel-header-content">
                  <h3 className="lc-style-panel-title">Message Style</h3>
                  <p className="lc-style-panel-subtitle">
                    Customize how your messages appear
                  </p>
                </div>
                <button
                  className="lc-style-panel-close"
                  onClick={() => setShowStyleOptions(false)}
                  aria-label="Close style panel"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>

              {/* Rest of your style panel content remains the same */}
              <div className="lc-style-tabs">
                <button
                  className={`lc-style-tab ${
                    activeStyleTab === "themes" ? "active" : ""
                  }`}
                  onClick={() => setActiveStyleTab("themes")}
                >
                  Themes
                </button>
                <button
                  className={`lc-style-tab ${
                    activeStyleTab === "fonts" ? "active" : ""
                  }`}
                  onClick={() => setActiveStyleTab("fonts")}
                >
                  Fonts
                </button>
                <button
                  className={`lc-style-tab ${
                    activeStyleTab === "effects" ? "active" : ""
                  }`}
                  onClick={() => setActiveStyleTab("effects")}
                >
                  Effects
                </button>
                {Object.keys(customStyle).length > 0 && (
                  <button className="lc-style-reset" onClick={handleResetStyle}>
                    Reset
                  </button>
                )}
              </div>

              {/* Themes with add button */}
              {activeStyleTab === "themes" && (
                <>
                  <div className="lc-theme-grid">
                    {MESSAGE_THEMES.map((theme, index) => (
                      <div
                        key={index}
                        className={`lc-theme-option ${
                          selectedThemeId === `preset-${index}`
                            ? "selected"
                            : ""
                        }`}
                        style={{
                          background: theme.gradient || theme.bgColor,
                          color: theme.textColor,
                        }}
                        onClick={() =>
                          handleSelectTheme(theme, `preset-${index}`)
                        }
                      >
                        <span>{theme.name}</span>
                      </div>
                    ))}

                    {/* Add custom themes from saved list */}
                    {savedThemes.map((theme) => (
                      <div
                        key={theme.id}
                        className={`lc-theme-option ${
                          selectedThemeId === theme.id ? "selected" : ""
                        }`}
                        style={{
                          background: theme.gradient
                            ? `linear-gradient(135deg, ${theme.gradientColor1}, ${theme.gradientColor2})`
                            : theme.bgColor,
                          color: theme.textColor,
                        }}
                        onClick={() => applySavedTheme(theme)}
                      >
                        <span>{theme.name}</span>
                      </div>
                    ))}

                    {/* Add Theme Button */}
                    <div
                      className="lc-add-theme-button"
                      onClick={toggleCustomThemeCreator}
                      title="Create custom theme"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                      </svg>
                    </div>
                  </div>

                  {/* Custom Theme Creator */}
                  {showCustomThemeCreator && (
                    <div className="lc-custom-theme-creator">
                      <div className="lc-theme-creator-hint">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="lc-hint-icon"
                        >
                          <circle cx="12" cy="12" r="10"></circle>
                          <path d="M12 16v-4"></path>
                          <path d="M12 8h.01"></path>
                        </svg>
                        <span>
                          Create your own theme by selecting colors and giving
                          it a name
                        </span>
                      </div>

                      {/* Theme Name Input */}
                      <div className="lc-theme-name-input">
                        <label>Theme Name</label>
                        <input
                          type="text"
                          value={customThemeName}
                          onChange={(e) => setCustomThemeName(e.target.value)}
                          placeholder="Enter a name for your theme"
                          maxLength={20}
                        />
                      </div>

                      {/* Gradient Toggle */}
                      <div className="lc-custom-theme-row">
                        <div className="lc-gradient-toggle">
                          <label className="lc-toggle-switch">
                            <input
                              type="checkbox"
                              checked={customThemeColors.gradient}
                              onChange={toggleGradientMode}
                            />
                            <span className="lc-toggle-slider"></span>
                          </label>
                          <span>Use Gradient Background</span>
                        </div>
                      </div>

                      {/* Color Inputs - Vertical Layout */}
                      {customThemeColors.gradient ? (
                        <div className="lc-gradient-colors-container">
                          {/* Gradient Colors */}
                          <div className="lc-color-input-group">
                            <label>Gradient Start Color</label>
                            <div className="lc-color-picker">
                              <input
                                type="color"
                                value={customThemeColors.gradientColor1}
                                onChange={(e) =>
                                  handleColorChange(
                                    "gradientColor1",
                                    e.target.value
                                  )
                                }
                              />
                              <input
                                type="text"
                                value={customThemeColors.gradientColor1}
                                onChange={(e) =>
                                  handleColorChange(
                                    "gradientColor1",
                                    e.target.value
                                  )
                                }
                                maxLength={7}
                              />
                            </div>
                          </div>
                          <div className="lc-color-input-group">
                            <label>Gradient End Color</label>
                            <div className="lc-color-picker">
                              <input
                                type="color"
                                value={customThemeColors.gradientColor2}
                                onChange={(e) =>
                                  handleColorChange(
                                    "gradientColor2",
                                    e.target.value
                                  )
                                }
                              />
                              <input
                                type="text"
                                value={customThemeColors.gradientColor2}
                                onChange={(e) =>
                                  handleColorChange(
                                    "gradientColor2",
                                    e.target.value
                                  )
                                }
                                maxLength={7}
                              />
                            </div>
                          </div>

                          {/* Gradient Type */}
                          <div className="lc-gradient-type">
                            <label>Gradient Type</label>
                            <div className="lc-gradient-type-options">
                              <button
                                className={`lc-gradient-type-btn ${
                                  gradientOrientation === "linear"
                                    ? "active"
                                    : ""
                                }`}
                                onClick={() => setGradientOrientation("linear")}
                              >
                                <svg
                                  width="24"
                                  height="24"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  xmlns="http://www.w3.org/2000/svg"
                                >
                                  <rect
                                    x="2"
                                    y="4"
                                    width="20"
                                    height="16"
                                    rx="2"
                                    fill="url(#linear-gradient)"
                                  />
                                  <defs>
                                    <linearGradient
                                      id="linear-gradient"
                                      x1="2"
                                      y1="12"
                                      x2="22"
                                      y2="12"
                                      gradientUnits="userSpaceOnUse"
                                    >
                                      <stop
                                        stopColor={
                                          customThemeColors.gradientColor1
                                        }
                                      />
                                      <stop
                                        offset="1"
                                        stopColor={
                                          customThemeColors.gradientColor2
                                        }
                                      />
                                    </linearGradient>
                                  </defs>
                                </svg>
                                <span>Linear</span>
                              </button>
                              <button
                                className={`lc-gradient-type-btn ${
                                  gradientOrientation === "radial"
                                    ? "active"
                                    : ""
                                }`}
                                onClick={() => setGradientOrientation("radial")}
                              >
                                <svg
                                  width="24"
                                  height="24"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  xmlns="http://www.w3.org/2000/svg"
                                >
                                  <rect
                                    x="2"
                                    y="4"
                                    width="20"
                                    height="16"
                                    rx="2"
                                    fill="url(#radial-gradient)"
                                  />
                                  <defs>
                                    <radialGradient
                                      id="radial-gradient"
                                      cx="12"
                                      cy="12"
                                      r="10"
                                      gradientUnits="userSpaceOnUse"
                                    >
                                      <stop
                                        stopColor={
                                          customThemeColors.gradientColor1
                                        }
                                      />
                                      <stop
                                        offset="1"
                                        stopColor={
                                          customThemeColors.gradientColor2
                                        }
                                      />
                                    </radialGradient>
                                  </defs>
                                </svg>
                                <span>Radial</span>
                              </button>
                            </div>
                          </div>

                          {/* Angle Slider (only for linear gradients) */}
                          {gradientOrientation === "linear" && (
                            <div className="lc-gradient-angle">
                              <label>Gradient Angle: {gradientAngle}°</label>
                              <div className="lc-gradient-angle-control">
                                <input
                                  type="range"
                                  min="0"
                                  max="360"
                                  value={gradientAngle}
                                  onChange={(e) =>
                                    setGradientAngle(Number(e.target.value))
                                  }
                                  className="lc-gradient-slider"
                                />
                                <div
                                  className="lc-gradient-angle-preview"
                                  style={{
                                    transform: `rotate(${gradientAngle}deg)`,
                                    background: `linear-gradient(to right, ${customThemeColors.gradientColor1}, ${customThemeColors.gradientColor2})`,
                                  }}
                                >
                                  <div className="lc-gradient-angle-arrow"></div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        // Keep your existing solid color picker code
                        <div className="lc-custom-theme-row">
                          <div className="lc-color-input-group">
                            <label>Background Color</label>
                            <div className="lc-color-picker">
                              <input
                                type="color"
                                value={customThemeColors.background}
                                onChange={(e) =>
                                  handleColorChange(
                                    "background",
                                    e.target.value
                                  )
                                }
                              />
                              <input
                                type="text"
                                value={customThemeColors.background}
                                onChange={(e) =>
                                  handleColorChange(
                                    "background",
                                    e.target.value
                                  )
                                }
                                maxLength={7}
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="lc-custom-theme-row">
                        <div className="lc-color-input-group">
                          <label>Text Color</label>
                          <div className="lc-color-picker">
                            <input
                              type="color"
                              value={customThemeColors.textColor}
                              onChange={(e) =>
                                handleColorChange("textColor", e.target.value)
                              }
                            />
                            <input
                              type="text"
                              value={customThemeColors.textColor}
                              onChange={(e) =>
                                handleColorChange("textColor", e.target.value)
                              }
                              maxLength={7}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="lc-theme-creator-actions">
                        <button
                          className="lc-apply-custom-theme"
                          onClick={applyCustomTheme}
                        >
                          Apply
                        </button>

                        <button
                          className="lc-save-theme-btn"
                          onClick={saveCustomTheme}
                        >
                          Save Theme
                        </button>

                        <button
                          className="lc-cancel-custom-theme"
                          onClick={toggleCustomThemeCreator}
                        >
                          Cancel
                        </button>
                      </div>

                      {/* Display user's saved themes */}
                      {savedThemes.length > 0 && (
                        <div className="lc-saved-themes-section">
                          <div className="lc-saved-themes-header">
                            <h4 className="lc-saved-themes-title">
                              Your Saved Themes
                            </h4>
                          </div>

                          {savedThemes.map((theme) => (
                            <div
                              key={theme.id}
                              className="lc-saved-theme-item"
                              onClick={() => applySavedTheme(theme)}
                            >
                              <div
                                className="lc-saved-theme-color"
                                style={{
                                  background: theme.gradient
                                    ? `linear-gradient(135deg, ${theme.gradientColor1}, ${theme.gradientColor2})`
                                    : theme.bgColor,
                                }}
                              ></div>
                              <div className="lc-saved-theme-name">
                                {theme.name}
                              </div>
                              <button
                                className="lc-saved-theme-delete"
                                onClick={(e) => deleteTheme(e, theme.id)}
                                title="Delete theme"
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="14"
                                  height="14"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <path d="M3 6h18"></path>
                                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"></path>
                                  <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                </svg>
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

              {/* Fonts selection */}
              {activeStyleTab === "fonts" && (
                <div className="lc-fonts-grid">
                  {PREMIUM_FONTS.map((font) => (
                    <div
                      key={font.value}
                      className={`lc-font-option ${
                        customStyle.fontFamily === font.value ? "selected" : ""
                      }`}
                      style={{ fontFamily: font.value }}
                      onClick={() => handleSelectFont(font.value)}
                    >
                      <span>{font.name}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Effects section */}
              {activeStyleTab === "effects" && (
                <>
                  <div className="lc-effect-section">
                    <h4>Text Effects</h4>
                    <div className="lc-effects-grid">
                      {TEXT_EFFECTS.map((effect) => (
                        <div
                          key={effect.value || "none"}
                          className={`lc-effect-option ${
                            customStyle.textEffect === effect.value
                              ? "selected"
                              : ""
                          }`}
                          onClick={() => handleSelectTextEffect(effect.value)}
                        >
                          <span>{effect.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="lc-effect-section">
                    <h4>Background Animations</h4>
                    <div className="lc-effects-grid">
                      {BACKGROUND_ANIMATIONS.map((animation) => (
                        <div
                          key={animation.value || "none"}
                          className={`lc-effect-option ${
                            customStyle.bgAnimation === animation.value
                              ? "selected"
                              : ""
                          }`}
                          onClick={() =>
                            handleSelectBgAnimation(animation.value)
                          }
                        >
                          <span>{animation.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Enhanced preview that shows real-time changes */}
              <div className="lc-style-preview">
                <div className="lc-preview-label">Preview</div>
                <div className="lc-preview-container">
                  <div className="lc-preview-user">You</div>
                  <div
                    className={`lc-preview-bubble ${
                      customStyle.bgAnimation || ""
                    }`}
                    style={{
                      background:
                        // For live preview when editing a custom theme
                        customStyle.previewGradient ||
                        customStyle.previewBgColor ||
                        // For normal theme display
                        customStyle.gradient ||
                        customStyle.bgColor ||
                        // Default fallback
                        "rgba(30, 30, 50, 0.5)",
                      color: customStyle.textColor || "white",
                      fontFamily: customStyle.fontFamily || "inherit",
                    }}
                  >
                    <div
                      className={`lc-preview-text ${
                        customStyle.textEffect || ""
                      }`}
                      data-text={messageText || "Preview of your message style"}
                    >
                      {messageText || "Preview of your message style"}
                    </div>
                  </div>
                  <div className="lc-preview-time">Just now</div>
                </div>
              </div>

              {/* Saved themes section */}
            </div>
          )}

          {/* Login prompt overlay */}
          {showLoginAnimation && (
            <div className="lc-login-prompt">
              <div className="lc-login-prompt-content">
                <div className="lc-login-icon">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="lc-login-wallet-icon"
                  >
                    <path
                      d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
                      fill="currentColor"
                    />
                  </svg>
                </div>
                <p className="lc-login-text">Sign in to use chat</p>
                <div className="lc-login-circuit-lines">
                  <div className="lc-circuit-line-1"></div>
                  <div className="lc-circuit-line-2"></div>
                  <div className="lc-circuit-line-3"></div>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <button className="lc-chat-bubble" onClick={toggleMinimized}>
          <span className="lc-chat-bubble-icon">💬</span>
          {unreadCount > 0 && (
            <span className="lc-chat-notification">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>
      )}
    </div>
  );
}
