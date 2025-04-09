"use client";

import React, { useState, useRef, useEffect } from "react";
import { HexColorPicker } from "react-colorful";
import { IoColorPaletteOutline } from "react-icons/io5";

export default function ColorPicker({ color, onChange, label }) {
  const [currentColor, setCurrentColor] = useState(color || "#ffffff");
  const [isOpen, setIsOpen] = useState(false);
  const pickerRef = useRef(null);
  const selectorRef = useRef(null);

  // Update local state when the prop changes
  useEffect(() => {
    if (color && color !== currentColor) {
      setCurrentColor(color);
    }
  }, [color]);

  // New approach: Create a portal for the color picker to avoid event bubbling issues
  const handleButtonClick = (e) => {
    e.stopPropagation();
    setIsOpen(!isOpen);
  };

  const handleColorChange = (newColor) => {
    setCurrentColor(newColor);
    onChange(newColor);
  };

  // Use a global mousedown listener with checks for both refs
  useEffect(() => {
    const handleClickOutside = (e) => {
      // Only close if the user clicks outside both the button and the picker
      const isOutsideButton =
        pickerRef.current && !pickerRef.current.contains(e.target);
      const isOutsidePicker =
        selectorRef.current && !selectorRef.current.contains(e.target);

      // And not clicking on any colorful related elements
      const isColorfulElement = e.target.closest(".react-colorful") !== null;

      if (isOpen && isOutsideButton && isOutsidePicker && !isColorfulElement) {
        setIsOpen(false);
      }
    };

    // Add event listener to window
    window.addEventListener("mousedown", handleClickOutside, { capture: true });
    return () => {
      window.removeEventListener("mousedown", handleClickOutside, {
        capture: true,
      });
    };
  }, [isOpen]);

  // Helper function to determine text color based on background
  const getContrastColor = (hexColor) => {
    if (!hexColor || typeof hexColor !== "string") return "#000000";

    // Remove the hash character if it exists
    hexColor = hexColor.replace("#", "");

    // Handle invalid hex values
    if (hexColor.length !== 6) return "#000000";

    // Parse the color components
    const r = parseInt(hexColor.substr(0, 2), 16);
    const g = parseInt(hexColor.substr(2, 2), 16);
    const b = parseInt(hexColor.substr(4, 2), 16);

    // Check for NaN values (invalid hex color)
    if (isNaN(r) || isNaN(g) || isNaN(b)) return "#000000";

    // Calculate the brightness (YIQ formula)
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;

    // Return white for dark colors, black for light colors
    return brightness < 128 ? "#ffffff" : "#000000";
  };

  return (
    <div className="color-picker-container">
      <div className="color-picker-trigger" ref={pickerRef}>
        {label && <span className="color-picker-label">{label}</span>}
        <button
          className="color-swatch"
          onClick={handleButtonClick}
          style={{ backgroundColor: currentColor }}
          title="Pick a color"
        >
          <IoColorPaletteOutline
            className="picker-icon"
            style={{ color: getContrastColor(currentColor) }}
          />
        </button>
      </div>

      {isOpen && (
        <div
          className="color-picker-popover"
          ref={selectorRef}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="color-picker-wrapper"
            onClick={(e) => e.stopPropagation()}
          >
            <HexColorPicker
              color={currentColor}
              onChange={handleColorChange}
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
              }}
            />
            <div className="color-picker-input-row">
              <input
                className="color-picker-input"
                type="text"
                value={currentColor}
                onChange={(e) => handleColorChange(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                spellCheck="false"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
