import React from "react";

export default function MessagePreview({ style, username, text, userImage }) {
  // Extract style properties with defaults
  const {
    bgColor = "rgba(14, 14, 14, 0.95)",
    textColor = "#ffffff",
    gradient = null,
    glow = false,
    sticker = null,
    fontFamily = "inherit",
    fontWeight = "normal",
    fontStyle = "normal",
    animationType = null,
  } = style || {};

  // Create base style
  const messageStyle = {
    background: gradient || bgColor,
    color: textColor,
    borderRadius: "12px",
    padding: "12px 15px",
    position: "relative",
    fontFamily,
    fontWeight,
    fontStyle,
    width: "100%",
    overflow: "hidden",
  };

  // Add box shadow for glow effect
  if (glow) {
    messageStyle.boxShadow = `0 0 15px ${gradient || bgColor}`;
  }

  // Add animation class based on type
  let animationClass = "";
  if (animationType === "pulse") {
    animationClass = "animate-pulse";
  } else if (animationType === "gradient") {
    animationClass = "animate-gradient";
  } else if (animationType === "rainbow") {
    animationClass = "animate-rainbow";
  } else if (animationType === "glow") {
    animationClass = "animate-glow";
  }

  // Default preview text if none provided
  const previewText = text || "This is how your message will look";

  return (
    <div
      className={`message-preview-bubble ${animationClass}`}
      style={messageStyle}
    >
      <div className="preview-avatar">
        {userImage ? (
          <img
            src={userImage}
            alt={username || "user"}
            className="preview-avatar-image"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = "/default-avatar.png";
            }}
          />
        ) : (
          <div className="preview-avatar-placeholder"></div>
        )}
      </div>
      <div className="preview-content">
        <span
          className="preview-username"
          style={{
            color: textColor,
            fontFamily: fontFamily !== "inherit" ? fontFamily : "inherit",
            fontWeight: fontWeight,
          }}
        >
          @{username || "you"}
        </span>
        <p
          className="preview-message"
          style={{
            color: textColor,
            fontFamily: fontFamily !== "inherit" ? fontFamily : "inherit",
            fontWeight,
            fontStyle,
          }}
        >
          {previewText}
        </p>
      </div>
      {sticker && <div className="preview-sticker">{sticker}</div>}
    </div>
  );
}
