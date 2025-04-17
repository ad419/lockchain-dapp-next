import { useState, useRef, useEffect } from "react";

function Tooltip({ text, children, position = "top" }) {
  // Add safety check for undefined or null text
  const tooltipText = text || "";

  return (
    <div className="tooltip-container">
      {children}
      <span className={`tooltip-text tooltip-${position}`}>{tooltipText}</span>
    </div>
  );
}

export default Tooltip;
