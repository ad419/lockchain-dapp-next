"use client";
import { useState, useRef, useEffect } from "react";
import "../styles/Messages.css";

export default function SimpleMobileEmojiPicker({ onSelect, onClose }) {
  // Create categories with the most useful emojis for mobile
  const emojiCategories = [
    {
      name: "Recent",
      emojis: [],
    },
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
  ];

  const [activeCategory, setActiveCategory] = useState("Popular");
  const [recentEmojis, setRecentEmojis] = useState(() => {
    try {
      // Try to load from localStorage
      const saved = localStorage.getItem("recentEmojis");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const tabsRef = useRef(null);

  // Scroll active tab into view
  useEffect(() => {
    if (tabsRef.current) {
      const activeTab = tabsRef.current.querySelector(".active-tab");
      if (activeTab) {
        activeTab.scrollIntoView({
          behavior: "smooth",
          inline: "center",
          block: "nearest",
        });
      }
    }
  }, [activeCategory]);

  const handleEmojiClick = (emoji) => {
    // Add to recents
    const newRecents = [
      emoji,
      ...recentEmojis.filter((e) => e !== emoji),
    ].slice(0, 8);

    setRecentEmojis(newRecents);

    // Save to localStorage
    try {
      localStorage.setItem("recentEmojis", JSON.stringify(newRecents));
    } catch (e) {
      console.error("Error saving recent emojis:", e);
    }

    // Call the onSelect callback
    onSelect(emoji);
  };

  return (
    <div className="mobile-emoji-picker">
      {/* Category tabs */}
      <div className="mobile-emoji-tabs" ref={tabsRef}>
        {recentEmojis.length > 0 && (
          <button
            className={`mobile-emoji-tab ${
              activeCategory === "Recent" ? "active-tab" : ""
            }`}
            onClick={() => setActiveCategory("Recent")}
          >
            Recent
          </button>
        )}

        {emojiCategories.slice(1).map((category) => (
          <button
            key={category.name}
            className={`mobile-emoji-tab ${
              activeCategory === category.name ? "active-tab" : ""
            }`}
            onClick={() => setActiveCategory(category.name)}
          >
            {category.name}
          </button>
        ))}
      </div>

      {/* Emoji grid */}
      <div className="mobile-emoji-grid-container">
        <div className="mobile-emoji-grid">
          {activeCategory === "Recent" ? (
            recentEmojis.length > 0 ? (
              recentEmojis.map((emoji, index) => (
                <button
                  key={`recent-${index}`}
                  className="mobile-emoji-button"
                  onClick={() => handleEmojiClick(emoji)}
                >
                  {emoji}
                </button>
              ))
            ) : (
              <div className="mobile-emoji-empty">No recent emojis</div>
            )
          ) : (
            emojiCategories
              .find((category) => category.name === activeCategory)
              ?.emojis.map((emoji, index) => (
                <button
                  key={`emoji-${index}`}
                  className="mobile-emoji-button"
                  onClick={() => handleEmojiClick(emoji)}
                >
                  {emoji}
                </button>
              ))
          )}
        </div>
      </div>
    </div>
  );
}
