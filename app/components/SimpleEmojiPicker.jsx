"use client";
import { useState, useRef, useEffect } from "react";
import "../styles/Messages.css";

export default function SimpleEmojiPicker({ onSelect, onClose }) {
  // Add ref for the emoji tabs container
  const tabsContainerRef = useRef(null);

  const emojiCategories = [
    {
      name: "Popular",
      emojis: [
        "😀",
        "😂",
        "🔥",
        "💯",
        "👍",
        "❤️",
        "💎",
        "🚀",
        "🌙",
        "🤑",
        "💰",
        "🐳",
        "👑",
        "💪",
        "🏆",
      ],
    },
    {
      name: "Crypto",
      emojis: [
        "💰",
        "💎",
        "🚀",
        "📈",
        "📉",
        "🌕",
        "🔒",
        "🔑",
        "💸",
        "🤑",
        "💹",
        "🏦",
        "💵",
        "💲",
        "🪙",
      ],
    },
    {
      name: "Faces",
      emojis: [
        "😀",
        "😁",
        "😂",
        "🤣",
        "😃",
        "😄",
        "😅",
        "😆",
        "😉",
        "😊",
        "🥰",
        "😍",
        "😘",
        "😎",
        "🤩",
      ],
    },
    {
      name: "Gestures",
      emojis: [
        "👍",
        "👎",
        "👌",
        "✌️",
        "🤞",
        "🤟",
        "🤙",
        "👏",
        "🙌",
        "🤝",
        "💪",
        "🫰",
        "🤌",
        "👊",
        "✊",
      ],
    },
    {
      name: "Symbols",
      emojis: [
        "❤️",
        "🧡",
        "💛",
        "💚",
        "💙",
        "💜",
        "🖤",
        "❓",
        "❗",
        "⭐",
        "🌟",
        "✨",
        "💯",
        "✅",
        "❌",
      ],
    },
  ];

  const [activeCategory, setActiveCategory] = useState("Popular");
  const [recentEmojis, setRecentEmojis] = useState(() => {
    try {
      const saved = localStorage.getItem("recentEmojis");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Add this effect to handle horizontal scrolling on wheel events
  useEffect(() => {
    const tabsElement = tabsContainerRef.current;
    if (!tabsElement) return;

    const handleWheel = (e) => {
      // Prevent the default vertical scroll
      e.preventDefault();

      // Scroll horizontally instead (by the wheel's deltaY value)
      tabsElement.scrollLeft += e.deltaY;
    };

    // Add the event listener
    tabsElement.addEventListener("wheel", handleWheel, { passive: false });

    // Clean up when component unmounts
    return () => {
      tabsElement.removeEventListener("wheel", handleWheel);
    };
  }, []);

  const handleEmojiClick = (emoji) => {
    // Save to recent emojis
    const newRecents = [
      emoji,
      ...recentEmojis.filter((e) => e !== emoji),
    ].slice(0, 8);
    setRecentEmojis(newRecents);

    try {
      localStorage.setItem("recentEmojis", JSON.stringify(newRecents));
    } catch (e) {
      console.error("Error saving recent emojis:", e);
    }

    onSelect(emoji);
  };

  return (
    <div className="emoji-picker">
      <div className="emoji-picker-header">
        <h4>Select Emoji</h4>
      </div>

      {/* Add the ref to the tabs container */}
      <div className="emoji-tabs" ref={tabsContainerRef}>
        {recentEmojis.length > 0 && (
          <button
            className={`emoji-tab ${
              activeCategory === "Recent" ? "active" : ""
            }`}
            onClick={() => setActiveCategory("Recent")}
          >
            Recent
          </button>
        )}
        {emojiCategories.map((category) => (
          <button
            key={category.name}
            className={`emoji-tab ${
              activeCategory === category.name ? "active" : ""
            }`}
            onClick={() => setActiveCategory(category.name)}
          >
            {category.name}
          </button>
        ))}
      </div>

      <div className="emoji-grid-container">
        {activeCategory === "Recent" ? (
          <div className="emoji-grid">
            {recentEmojis.map((emoji, index) => (
              <button
                key={`recent-${index}`}
                className="emoji-button"
                onClick={() => handleEmojiClick(emoji)}
              >
                {emoji}
              </button>
            ))}
          </div>
        ) : (
          <div className="emoji-grid">
            {emojiCategories
              .find((c) => c.name === activeCategory)
              ?.emojis.map((emoji, index) => (
                <button
                  key={`emoji-${index}`}
                  className="emoji-button"
                  onClick={() => handleEmojiClick(emoji)}
                >
                  {emoji}
                </button>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
