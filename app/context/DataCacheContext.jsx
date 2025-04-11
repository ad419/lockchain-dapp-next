"use client";

import { createContext, useContext, useState, useEffect } from "react";

// Create context for data cache
const DataCacheContext = createContext({
  profiles: {},
  addProfile: () => {},
  getProfile: () => null,
  clearProfiles: () => {},
  isLoading: true,
});

export function DataCacheProvider({ children }) {
  const [profiles, setProfiles] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  // Add profile to cache
  const addProfile = (username, data) => {
    if (!username || !data) return;

    const lowercasedUsername = username.toLowerCase();

    setProfiles((prev) => ({
      ...prev,
      [lowercasedUsername]: {
        ...data,
        cachedAt: new Date().toISOString(),
      },
    }));

    // Store in localStorage if in browser
    if (typeof window !== "undefined") {
      try {
        const existingProfiles = JSON.parse(
          localStorage.getItem("profiles") || "{}"
        );

        existingProfiles[lowercasedUsername] = {
          ...data,
          cachedAt: new Date().toISOString(),
        };

        localStorage.setItem("profiles", JSON.stringify(existingProfiles));
      } catch (e) {
        console.error("Error saving profile to localStorage:", e);
      }
    }
  };

  // Get profile from cache
  const getProfile = (username) => {
    if (!username) return null;

    const lowercasedUsername = username.toLowerCase();
    return profiles[lowercasedUsername] || null;
  };

  // Clear all profiles
  const clearProfiles = () => {
    setProfiles({});

    if (typeof window !== "undefined") {
      localStorage.removeItem("profiles");
    }
  };

  // Load from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const storedProfiles = JSON.parse(
          localStorage.getItem("profiles") || "{}"
        );
        setProfiles(storedProfiles);
      } catch (e) {
        console.error("Error loading profiles from localStorage:", e);
      } finally {
        setIsLoading(false);
      }
    } else {
      setIsLoading(false);
    }
  }, []);

  return (
    <DataCacheContext.Provider
      value={{
        profiles,
        addProfile,
        getProfile,
        clearProfiles,
        isLoading,
      }}
    >
      {children}
    </DataCacheContext.Provider>
  );
}

export const useDataCache = () => useContext(DataCacheContext);
