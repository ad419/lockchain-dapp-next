"use client";

import { createContext, useState, useEffect } from "react";

// Create context with default values
export const Context = createContext({
  darkMode: false,
  setDarkMode: () => {},
  mounted: false,
});

export function ContextProvider({ children }) {
  const [darkMode, setDarkMode] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Only run on client side
    setMounted(true);

    // Load dark mode preference from localStorage
    try {
      const savedMode = localStorage.getItem("darkMode");
      if (savedMode !== null) {
        setDarkMode(savedMode === "true");
      }
    } catch (error) {
      console.error("Failed to load dark mode preference:", error);
    }
  }, []);

  // Save dark mode preference when it changes
  useEffect(() => {
    if (mounted) {
      try {
        localStorage.setItem("darkMode", darkMode.toString());
      } catch (error) {
        console.error("Failed to save dark mode preference:", error);
      }
    }
  }, [darkMode, mounted]);

  return (
    <Context.Provider value={{ darkMode, setDarkMode, mounted }}>
      {children}
    </Context.Provider>
  );
}
