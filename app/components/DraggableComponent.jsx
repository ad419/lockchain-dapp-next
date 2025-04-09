"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";

export default function DraggableComponent({
  children,
  initialPosition,
  onClose,
}) {
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef(null);

  // Calculate initial position based on props or default
  const initialX = initialPosition?.x || 20;
  const initialY = initialPosition?.y || 50; // Position higher on the screen by default

  // Track window dimensions for positioning logic
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== "undefined" ? window.innerWidth : 1000,
    height: typeof window !== "undefined" ? window.innerHeight : 1000,
  });

  // Update window size on resize
  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Custom drag handler to ensure component stays at least partially on screen
  const handleDragEnd = (event, info) => {
    setIsDragging(false);

    if (dragRef.current) {
      const element = dragRef.current;
      const rect = element.getBoundingClientRect();

      // If the element is dragged completely off-screen, reposition it
      if (rect.right < 30) {
        // Too far left - move back into view
        element.style.transform = `translate(0px, ${
          info.point.y - rect.height / 2
        }px)`;
      } else if (rect.bottom < 30) {
        // Too far up - move back into view
        element.style.transform = `translate(${
          info.point.x - rect.width / 2
        }px, 0px)`;
      } else if (rect.left > windowSize.width - 30) {
        // Too far right - move back into view
        element.style.transform = `translate(${
          windowSize.width - rect.width
        }px, ${info.point.y - rect.height / 2}px)`;
      } else if (rect.top > windowSize.height - 30) {
        // Too far down - move back into view
        element.style.transform = `translate(${
          info.point.x - rect.width / 2
        }px, ${windowSize.height - rect.height}px)`;
      }
    }
  };

  return (
    <motion.div
      ref={dragRef}
      className={`draggable-component ${isDragging ? "dragging" : ""}`}
      initial={{ x: initialX, y: initialY, opacity: 0, scale: 0.95 }}
      animate={{ x: initialX, y: initialY, opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
      drag
      dragElastic={0.1}
      dragMomentum={false}
      onDragStart={() => setIsDragging(true)}
      onDragEnd={handleDragEnd}
      style={{
        position: "fixed",
        zIndex: 99999,
        cursor: isDragging ? "grabbing" : "grab",
        touchAction: "none",
      }}
    >
      <div className="draggable-handle">
        <div className="drag-indicator">
          <span></span>
          <span></span>
          <span></span>
        </div>
        {onClose && (
          <button className="close-picker" onClick={onClose} aria-label="Close">
            ×
          </button>
        )}
      </div>
      <div className="draggable-content">{children}</div>
    </motion.div>
  );
}
