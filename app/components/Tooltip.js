import { useState, useRef, useEffect } from "react";

export default function Tooltip({ content }) {
  const triggerRef = useRef(null);

  return (
    <div className="tooltip-container" ref={triggerRef}>
      <div className="rank-title" title={content}>
        {content.length > 15 ? content.slice(0, 15) + "..." : content}
      </div>
    </div>
  );
}
