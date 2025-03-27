"use client";

import { createContext, useState, useEffect } from "react";
import { useTheme } from "next-themes";

export const Context = createContext();

export function ContextProvider({ children }) {
  const [mounted, setMounted] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [progress, setProgress] = useState(0);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    // Check localStorage first
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme) {
      setDarkMode(savedTheme === "dark");
    } else {
      // Fall back to system preference
      const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      setDarkMode(isDark);
    }
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      // Update localStorage and body class when theme changes
      localStorage.setItem("theme", darkMode ? "dark" : "light");
      document.body.classList.toggle("dark-mode", darkMode);
      setTheme(darkMode ? "dark" : "light");
    }
  }, [darkMode, mounted]);

  const contextValue = {
    darkMode,
    setDarkMode: (value) => {
      setDarkMode(value);
      setTheme(value ? "dark" : "light");
    },
    progress,
    setProgress,
    mounted,
  };

  if (!mounted) {
    return <div style={{ visibility: "hidden" }}>{children}</div>;
  }

  return <Context.Provider value={contextValue}>{children}</Context.Provider>;
}
