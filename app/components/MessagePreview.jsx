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
    fontSize = "inherit",
    animationType = null,
    textEffect = null,
    sending = false,
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
    // Fix: Use a different class name to avoid conflicts
    animationClass = "preview-pulse-glow";
  } else if (animationType === "gradient") {
    animationClass = "animate-gradient";
  } else if (animationType === "rainbow") {
    animationClass = "animate-rainbow";
  } else if (animationType === "glow") {
    animationClass = "animate-glow";
  }

  // Add sending animation class if needed
  if (sending) {
    animationClass += " sending";
  }

  // Default preview text if none provided
  const previewText = text || "This is how your message will look";

  // Text style for normal styling (will be overridden by CSS classes for special effects)
  const textStyle = {
    fontFamily: fontFamily !== "inherit" ? fontFamily : "inherit",
    fontWeight,
    fontStyle,
    fontSize: fontSize || "inherit",
  };

  // For metallic and other effects that require specific styling
  if (textEffect === "metallic") {
    textStyle.WebkitBackgroundClip = "text";
    textStyle.backgroundClip = "text";
    textStyle.color = "transparent";
  }

  return (
    <div
      className={`message-preview-bubble ${animationClass}`}
      style={messageStyle}
    >
      <div className="preview-content">
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
        <div className="preview-text-content">
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
            className={`preview-message ${style.animationType || ""} ${
              style.textEffect || ""
            }`}
            style={textStyle}
            data-text={text} // Important for glitch effect
          >
            {text}
          </p>
        </div>
      </div>
      {sticker && <div className="preview-sticker">{sticker}</div>}
    </div>
  );
}
