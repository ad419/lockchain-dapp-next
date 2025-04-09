"use client";
import React from "react";
import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import AnimatedNumber from "./AnimatedNumber";
import { ethers } from "ethers";
import "../styles/PublicProfile.css";
import tokenAbi from "../json/token.json";
import { contract, DEFAULT_CHAIN } from "../hooks/constant";
import defaultAvatar from "../images/icon.png";
import { MdModeEdit, MdClose, MdSave } from "react-icons/md";
import { BiCamera } from "react-icons/bi";
import { useSession } from "next-auth/react";

export default function PublicProfile({ username }) {
  const router = useRouter();
  const { data: session } = useSession();
  const [profileData, setProfileData] = useState(null);
  const [holderData, setHolderData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [imageError, setImageError] = useState(false);
  const [tokenPrice, setTokenPrice] = useState(0);
  const [refreshInterval, setRefreshInterval] = useState(null);
  const [lastRefreshed, setLastRefreshed] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [contentVisible, setContentVisible] = useState(false);
  const [refreshCooldown, setRefreshCooldown] = useState(10 * 60 * 1000); // Default 10 minutes
  const [cooldownEnds, setCooldownEnds] = useState(null);
  const [canRefresh, setCanRefresh] = useState(true);
  const timerRef = React.useRef(null);

  // New state for profile customization
  const [isEditing, setIsEditing] = useState(false);
  const [bio, setBio] = useState("");
  const [status, setStatus] = useState("");
  const [profileImage, setProfileImage] = useState(null);
  const [bannerImage, setBannerImage] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const profileImageRef = useRef(null);
  const bannerImageRef = useRef(null);
  const [isOwnProfile, setIsOwnProfile] = useState(false);

  const safeParseFloat = (value, defaultValue = 0) => {
    if (value === undefined || value === null) return defaultValue;
    const parsed = parseFloat(value);
    return isNaN(parsed) ? defaultValue : parsed;
  };

  // Format cooldown time remaining
  const formatCooldownTime = (endTime) => {
    if (!endTime) return "";

    const now = new Date();
    const timeRemaining = endTime.getTime() - now.getTime();

    if (timeRemaining <= 0) return "0s";

    const seconds = Math.floor((timeRemaining / 1000) % 60);
    const minutes = Math.floor(timeRemaining / (1000 * 60));

    if (minutes > 0) {
      return `${minutes}m ${seconds.toString().padStart(2, "0")}s`;
    } else {
      return `${seconds}s`;
    }
  };

  // Format refresh rate for display
  const formatRefreshRate = (milliseconds) => {
    const minutes = milliseconds / (1000 * 60);
    return `${minutes} ${minutes === 1 ? "minute" : "minutes"}`;
  };

  // Check if the current user is viewing their own profile
  useEffect(() => {
    if (session && profileData) {
      // Compare username or twitter username
      const currentUser = session.user.username?.toLowerCase();
      const profileUser = profileData.twitterUsername?.toLowerCase();

      setIsOwnProfile(currentUser === profileUser);

      if (currentUser === profileUser) {
        setBio(profileData.bio || "");
        setStatus(profileData.status || "");
        setProfileImage(profileData.profileImage || profileData.image);
        setBannerImage(profileData.bannerImage);
      }
    }
  }, [session, profileData]);

  useEffect(() => {
    // Create a new AbortController for this effect instance
    const abortController = new AbortController();
    const signal = abortController.signal;

    // Keep track if the component is still mounted
    let isMounted = true;

    // Check if this is a fresh load or a reload
    const isFirstLoad =
      sessionStorage.getItem(`profile_loaded_${username}`) !== "true";

    // Add cache functions
    const getCachedData = (key) => {
      try {
        const cached = localStorage.getItem(key);
        if (!cached) return null;

        const { data, timestamp, expiry } = JSON.parse(cached);
        const now = Date.now();

        // Check if cache is still valid
        if (now - timestamp < expiry) {
          return data;
        }

        // Cache expired
        localStorage.removeItem(key);
        return null;
      } catch (e) {
        console.error("Error retrieving cached data:", e);
        return null;
      }
    };

    const setCachedData = (key, data, expiryMs = 5 * 60 * 1000) => {
      try {
        const cacheObject = {
          data,
          timestamp: Date.now(),
          expiry: expiryMs,
        };
        localStorage.setItem(key, JSON.stringify(cacheObject));
      } catch (e) {
        console.error("Error caching data:", e);
      }
    };

    // Function to fetch user data with caching
    const fetchProfileData = async (delayMs = 0) => {
      // Add optional delay to prevent immediate API calls on reload
      if (delayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        if (!isMounted) return; // Check if still mounted after delay
      }

      try {
        console.log(`Fetching profile for username: ${username}`);

        // Check cache first for profile data
        const profileCacheKey = `profile_data_${username}`;
        const cachedProfile = getCachedData(profileCacheKey);

        let profileData;

        if (cachedProfile && !isRefreshing) {
          console.log("Using cached profile data");
          profileData = cachedProfile;
          setProfileData(profileData.user);

          // Update the edit fields with cached data
          if (profileData.user.bio) setBio(profileData.user.bio);
          if (profileData.user.status) setStatus(profileData.user.status);
          if (profileData.user.profileImage)
            setProfileImage(profileData.user.profileImage);
          if (profileData.user.bannerImage)
            setBannerImage(profileData.user.bannerImage);
        } else {
          // Fetch fresh profile data if not cached or explicitly refreshing
          const profileResponse = await fetch(
            `/api/user-profile?username=${encodeURIComponent(username)}`,
            { signal }
          );

          // Check if component is still mounted before proceeding
          if (!isMounted) return;

          if (!profileResponse.ok) {
            console.error(
              `Profile API returned error status: ${profileResponse.status}`
            );
            throw new Error(
              `Failed to fetch profile data (${profileResponse.status})`
            );
          }

          profileData = await profileResponse.json();
          console.log("Fresh profile data received:", profileData);

          // Check if component is still mounted before updating state
          if (!isMounted) return;

          if (!profileData.success) {
            throw new Error(profileData.message || "User not found");
          }

          // Set profile data as soon as it's available
          setProfileData(profileData.user);

          // Update the edit fields with fresh data
          if (profileData.user.bio) setBio(profileData.user.bio);
          if (profileData.user.status) setStatus(profileData.user.status);
          if (profileData.user.profileImage)
            setProfileImage(profileData.user.profileImage);
          if (profileData.user.bannerImage)
            setBannerImage(profileData.user.bannerImage);

          // Cache profile data (expires in 10 minutes)
          setCachedData(profileCacheKey, profileData, 10 * 60 * 1000);
        }

        // Only continue if we have a wallet address
        if (profileData.user?.walletAddress) {
          // Check cache for holder data
          const holderCacheKey = `holder_data_${profileData.user.walletAddress}`;
          const cachedHolder = getCachedData(holderCacheKey);

          if (cachedHolder && !isRefreshing) {
            console.log("Using cached holder data");
            setHolderData(cachedHolder.holderData);
            setTokenPrice(cachedHolder.tokenPrice);
          } else {
            // Fetch only the leaderboard data - fewer API calls
            try {
              const leaderboardResponse = await fetch("/api/holders", {
                signal,
              });

              if (leaderboardResponse.ok) {
                const leaderboardData = await leaderboardResponse.json();
                const holdersList = leaderboardData.holders || [];

                // Find user in the leaderboard
                const userInLeaderboard = holdersList.find(
                  (holder) =>
                    holder.address.toLowerCase() ===
                    profileData.user.walletAddress.toLowerCase()
                );

                if (userInLeaderboard) {
                  // User found in leaderboard
                  const userRank =
                    holdersList.findIndex(
                      (holder) =>
                        holder.address.toLowerCase() ===
                        profileData.user.walletAddress.toLowerCase()
                    ) + 1;

                  // Safe parsing of values
                  const balance = safeParseFloat(
                    userInLeaderboard.balance_formatted
                  );
                  const percentage = safeParseFloat(
                    userInLeaderboard.percentage
                  );
                  const tokenPriceValue = safeParseFloat(
                    leaderboardData.tokenPrice
                  );

                  const updatedHolderData = {
                    ...userInLeaderboard,
                    rank: userRank,
                    totalHolders: holdersList.length,
                    balance_formatted: balance,
                    percentage: percentage,
                    usdValue: balance * tokenPriceValue,
                  };

                  setHolderData(updatedHolderData);
                  setTokenPrice(tokenPriceValue);

                  // Cache holder data (expiry depends on rank)
                  const cacheExpiry =
                    userRank <= 10
                      ? 5 * 60 * 1000
                      : userRank <= 50
                      ? 7 * 60 * 1000
                      : userRank <= 100
                      ? 10 * 60 * 1000
                      : 15 * 60 * 1000;

                  setCachedData(
                    holderCacheKey,
                    {
                      holderData: updatedHolderData,
                      tokenPrice: tokenPriceValue,
                    },
                    cacheExpiry
                  );
                } else {
                  console.log("User not found in leaderboard");
                  // Create default holder data with rank 0 for new users
                  setHolderData({
                    address: profileData.user.walletAddress,
                    rank: 0,
                    totalHolders: holdersList.length,
                    balance_formatted: "0",
                    percentage: "0",
                    usdValue: "0",
                    firstSeen: profileData.user.walletConnectedAt,
                    lastSeen: profileData.user.walletConnectedAt,
                  });
                  setTokenPrice(leaderboardData.tokenPrice || 0);
                }
              }
            } catch (error) {
              console.error("Error fetching holder data:", error);
              // Continue without holder data
            }
          }
        }

        setLastRefreshed(new Date());
      } catch (err) {
        // Only set error if component is still mounted
        if (isMounted) {
          console.error("Detailed error fetching profile:", err);
          setError(err.message || "Failed to load profile");
        }
      } finally {
        // Mark this profile as loaded in the session
        sessionStorage.setItem(`profile_loaded_${username}`, "true");

        // Only update loading state if component is still mounted
        if (isMounted) {
          setLoading(false);
          setIsRefreshing(false);
        }
      }
    };

    // Initial fetch with intelligent caching
    if (username) {
      // Check for existing cached data first
      const profileCacheKey = `profile_data_${username}`;
      const cachedProfile = getCachedData(profileCacheKey);

      if (cachedProfile) {
        // Use cache immediately to show content faster
        setProfileData(cachedProfile.user);

        // Update form values
        if (cachedProfile.user.bio) setBio(cachedProfile.user.bio);
        if (cachedProfile.user.status) setStatus(cachedProfile.user.status);
        if (cachedProfile.user.profileImage)
          setProfileImage(cachedProfile.user.profileImage);
        if (cachedProfile.user.bannerImage)
          setBannerImage(cachedProfile.user.bannerImage);

        // If wallet exists, check for holder cache
        if (cachedProfile.user?.walletAddress) {
          const holderCacheKey = `holder_data_${cachedProfile.user.walletAddress}`;
          const cachedHolder = getCachedData(holderCacheKey);

          if (cachedHolder) {
            setHolderData(cachedHolder.holderData);
            setTokenPrice(cachedHolder.tokenPrice);
          }
        }

        // Show content immediately from cache
        setLoading(false);

        // Then do a background update if needed, with a delay
        const delayMs = isFirstLoad ? 0 : 2000; // Longer delay for refreshes with cache
        fetchProfileData(delayMs);
      } else {
        // No cache, load normally with a short delay on refresh
        const delayMs = isFirstLoad ? 0 : 1000;
        fetchProfileData(delayMs);
      }

      // Set up refresh interval but only if component is mounted
      const interval = setInterval(() => {
        // Only refresh if:
        // 1. Component is mounted
        // 2. Not currently refreshing
        // 3. Page is visible
        // 4. No active cooldown
        if (
          isMounted &&
          !isRefreshing &&
          document.visibilityState === "visible" &&
          canRefresh
        ) {
          setIsRefreshing(true);
          fetchProfileData();
        }
      }, 10 * 60 * 1000); // Default interval

      setRefreshInterval(interval);
    }

    // Cleanup
    return () => {
      // Mark component as unmounted
      isMounted = false;

      // Clear interval
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }

      // Only now abort pending requests
      abortController.abort();

      console.log("Profile component unmounted, requests aborted");
    };
  }, [username]);

  // Add this useEffect to update the cooldown based on user rank
  useEffect(() => {
    if (holderData?.rank) {
      // Set cooldown based on rank
      // Top 10 holders: 5 minutes
      // Top 50 holders: 7 minutes
      // Top 100 holders: 10 minutes
      // Others: 15 minutes
      // New users (rank 0): 5 minutes
      let newCooldown;
      if (holderData.rank === 0) {
        // New users: check more frequently to catch first transactions
        newCooldown = 5 * 60 * 1000; // 5 minutes
      } else if (holderData.rank <= 10) {
        newCooldown = 5 * 60 * 1000; // 5 minutes
      } else if (holderData.rank <= 50) {
        newCooldown = 7 * 60 * 1000; // 7 minutes
      } else if (holderData.rank <= 100) {
        newCooldown = 10 * 60 * 1000; // 10 minutes
      } else {
        newCooldown = 15 * 60 * 1000; // 15 minutes
      }

      setRefreshCooldown(newCooldown);

      // Update automatic refresh interval
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }

      const interval = setInterval(() => {
        if (
          !isRefreshing &&
          document.visibilityState === "visible" &&
          canRefresh
        ) {
          setIsRefreshing(true);
          fetchProfileData();
        }
      }, newCooldown);

      setRefreshInterval(interval);

      // Reset cooldown timer
      setCooldownEnds(null);
      setCanRefresh(true);
    }
  }, [holderData?.rank]);

  // 1. Use localStorage to persist cooldown state
  useEffect(() => {
    // Check localStorage for saved cooldown when component mounts
    const savedCooldown = localStorage.getItem(`profile_cooldown_${username}`);

    if (savedCooldown) {
      try {
        const cooldownData = JSON.parse(savedCooldown);
        const endTime = new Date(cooldownData.endsAt);
        const now = new Date();

        // Only restore cooldown if it hasn't expired yet
        if (endTime > now) {
          setCooldownEnds(endTime);
          setCanRefresh(false);
          console.log(
            `Restored cooldown timer for ${username}, ends at ${endTime.toLocaleTimeString()}`
          );
        } else {
          // Clean up expired cooldown
          localStorage.removeItem(`profile_cooldown_${username}`);
        }
      } catch (e) {
        console.error("Error parsing saved cooldown:", e);
        localStorage.removeItem(`profile_cooldown_${username}`);
      }
    }
  }, [username]);

  // 2. Fix the countdown and update localStorage whenever cooldown changes
  useEffect(() => {
    if (cooldownEnds && !canRefresh) {
      // Save cooldown to localStorage
      localStorage.setItem(
        `profile_cooldown_${username}`,
        JSON.stringify({
          endsAt: cooldownEnds.toISOString(),
          cooldownMs: refreshCooldown,
        })
      );

      // Clear any existing timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      // Create a new timer that updates the component state regularly
      timerRef.current = setInterval(() => {
        const now = new Date();
        const timeRemaining = cooldownEnds.getTime() - now.getTime();

        if (timeRemaining <= 0) {
          setCanRefresh(true);
          setCooldownEnds(null);
          clearInterval(timerRef.current);
          timerRef.current = null;

          // Clear from localStorage
          localStorage.removeItem(`profile_cooldown_${username}`);
        } else {
          // Force a re-render to update the displayed time and progress bar
          forceUpdate();

          // Update the progress bar width directly (for smoother animation)
          const progressBar = document.querySelector(
            ".profile-cooldown-progress"
          );
          if (progressBar) {
            const progressWidth = (timeRemaining / refreshCooldown) * 100;
            progressBar.style.width = `${progressWidth}%`;
          }
        }
      }, 500); // Update more frequently to ensure smooth countdown

      // Set CSS variable for animation
      document.documentElement.style.setProperty(
        "--cooldown-duration",
        `${refreshCooldown / 1000}s`
      );

      return () => {
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      };
    }
  }, [cooldownEnds, canRefresh, refreshCooldown, username]);

  // Add a forceUpdate function using a counter state
  const [, updateState] = useState({});
  const forceUpdate = useCallback(() => updateState({}), []);

  // 3. Update the manual refresh function to handle timer correctly
  const handleManualRefresh = () => {
    if (!isRefreshing && canRefresh) {
      // Start cooldown timer - properly calculate the end time
      const endTime = new Date();
      endTime.setTime(endTime.getTime() + refreshCooldown);
      setCooldownEnds(endTime);
      setCanRefresh(false);

      // Create a new AbortController for this refresh operation
      const refreshController = new AbortController();
      const signal = refreshController.signal;

      const fetchProfileData = async () => {
        try {
          setIsRefreshing(true);
          console.log("Manual refresh started");

          // Fetch user profile data with the new abort signal
          const profileResponse = await fetch(
            `/api/user-profile?username=${encodeURIComponent(username)}`,
            {
              cache: "no-store", // Force fresh data
              signal, // Use the new signal
            }
          );

          if (!profileResponse.ok) {
            throw new Error(
              `Failed to refresh profile data (${profileResponse.status})`
            );
          }

          const profileData = await profileResponse.json();

          if (!profileData.success) {
            throw new Error(profileData.message || "User not found");
          }

          setProfileData(profileData.user);

          // If user has a wallet, fetch holder data
          if (profileData.user?.walletAddress) {
            // Only fetch from leaderboard for refresh to minimize API calls
            const leaderboardResponse = await fetch("/api/holders", {
              cache: "no-store", // Force fresh data
              signal, // Use the new signal
            });

            if (leaderboardResponse.ok) {
              const leaderboardData = await leaderboardResponse.json();
              const holdersList = leaderboardData.holders || [];

              // Find user in the leaderboard
              const userInLeaderboard = holdersList.find(
                (holder) =>
                  holder.address.toLowerCase() ===
                  profileData.user.walletAddress.toLowerCase()
              );

              if (userInLeaderboard) {
                // User found in leaderboard
                const userRank =
                  holdersList.findIndex(
                    (holder) =>
                      holder.address.toLowerCase() ===
                      profileData.user.walletAddress.toLowerCase()
                  ) + 1;

                // Safe parsing of values
                const balance = safeParseFloat(
                  userInLeaderboard.balance_formatted
                );
                const percentage = safeParseFloat(userInLeaderboard.percentage);
                const tokenPriceValue = safeParseFloat(
                  leaderboardData.tokenPrice
                );

                setHolderData({
                  ...userInLeaderboard,
                  rank: userRank,
                  totalHolders: holdersList.length,
                  balance_formatted: balance,
                  percentage: percentage,
                  usdValue: balance * tokenPriceValue,
                });

                setTokenPrice(tokenPriceValue);
              }
            }
          }

          setLastRefreshed(new Date());
        } catch (err) {
          // Check if this is an abort error (user navigated away)
          if (err.name === "AbortError") {
            console.log("Refresh aborted");
          } else {
            console.error("Error during manual refresh:", err);
          }
        } finally {
          setIsRefreshing(false);
        }
      };

      fetchProfileData();
    }
  };

  // Add these new handler functions
  const handleProfileImageClick = () => {
    if (!isEditing || !isOwnProfile) return;
    profileImageRef.current?.click();
  };

  const handleBannerImageClick = () => {
    if (!isEditing || !isOwnProfile) return;
    bannerImageRef.current?.click();
  };

  const handleProfileImageChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = () => {
        setProfileImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleBannerImageChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = () => {
        setBannerImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const startEditing = () => {
    setIsEditing(true);
    setBio(profileData?.bio || "");
    setStatus(profileData?.status || "");
    setProfileImage(profileData?.profileImage || profileData?.image);
    setBannerImage(profileData?.bannerImage);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setBio(profileData?.bio || "");
    setStatus(profileData?.status || "");
    setProfileImage(profileData?.profileImage || profileData?.image);
    setBannerImage(profileData?.bannerImage);
  };

  const saveProfile = async () => {
    if (!isOwnProfile || !session?.user?.id) return;

    setIsSaving(true);

    try {
      // First, upload any images if needed
      let profileImageUrl = profileImage;
      let bannerImageUrl = bannerImage;

      // Only upload profile image if it's a data URL (newly selected file)
      if (profileImage && profileImage.startsWith("data:")) {
        const profileImageResponse = await fetch("/api/upload-profile-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            image: profileImage,
            type: "profile",
            userId: session.user.id,
          }),
        });

        if (profileImageResponse.ok) {
          const data = await profileImageResponse.json();
          profileImageUrl = data.url;
        } else {
          throw new Error("Failed to upload profile image");
        }
      }

      // Only upload banner image if it's a data URL (newly selected file)
      if (bannerImage && bannerImage.startsWith("data:")) {
        const bannerImageResponse = await fetch("/api/upload-profile-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            image: bannerImage,
            type: "banner",
            userId: session.user.id,
          }),
        });

        if (bannerImageResponse.ok) {
          const data = await bannerImageResponse.json();
          bannerImageUrl = data.url;
        } else {
          throw new Error("Failed to upload banner image");
        }
      }

      // Save profile data
      const response = await fetch("/api/update-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: session.user.id,
          username: session.user.username,
          bio: bio,
          status: status,
          profileImage: profileImageUrl,
          bannerImage: bannerImageUrl,
        }),
      });

      if (response.ok) {
        // Update profile data
        setProfileData({
          ...profileData,
          bio,
          status,
          profileImage: profileImageUrl,
          bannerImage: bannerImageUrl,
        });

        setIsEditing(false);

        // Show success message
        alert("Profile updated successfully");
      } else {
        throw new Error("Failed to update profile");
      }
    } catch (error) {
      console.error("Error saving profile:", error);
      alert("Error updating profile: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Format date to readable string
  const formatDate = (dateString) => {
    if (!dateString) return "Unknown";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Format account age
  const getAccountAge = (dateString) => {
    if (!dateString) return "N/A";

    const joinDate = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - joinDate);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 30) {
      return `${diffDays} days`;
    } else if (diffDays < 365) {
      const months = Math.floor(diffDays / 30);
      return `${months} month${months > 1 ? "s" : ""}`;
    } else {
      const years = Math.floor(diffDays / 365);
      const remainingMonths = Math.floor((diffDays % 365) / 30);
      return `${years} year${years > 1 ? "s" : ""}${
        remainingMonths > 0
          ? `, ${remainingMonths} month${remainingMonths > 1 ? "s" : ""}`
          : ""
      }`;
    }
  };

  // Get a unique color based on wallet address
  const getWalletColor = (address) => {
    if (!address) return "#6286fc";

    // Ensure we're working with a string
    const addressStr = String(address);

    // Extract the last 6 characters or use the beginning if it's too short
    const hash =
      addressStr.length >= 6 ? addressStr.slice(-6) : addressStr.padEnd(6, "0");

    // Parse RGB values with fallbacks
    const r = parseInt(hash.slice(0, 2), 16) || 98; // Default: 98
    const g = parseInt(hash.slice(2, 4), 16) || 134; // Default: 134
    const b = parseInt(hash.slice(4, 6), 16) || 252; // Default: 252

    return `rgb(${r}, ${g}, ${b})`;
  };

  useEffect(() => {
    // If we have profile data and holder data, or just profile data after loading completes
    if ((profileData && holderData) || (profileData && !loading)) {
      // Small delay for smooth transition
      const timer = setTimeout(() => {
        setContentVisible(true);
      }, 300);

      return () => clearTimeout(timer);
    }
  }, [profileData, holderData, loading]);

  const walletColor = getWalletColor(profileData?.walletAddress || username);

  if (error) {
    return (
      <div className="profile-page-container">
        <div className="profile-error">
          <h2>Profile Not Found</h2>
          <p>{error}</p>
          <button className="profile-back-button" onClick={() => router.back()}>
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-page-container">
      {/* Always render the skeleton */}
      {!contentVisible && <ProfileSkeleton />}

      {/* Render the actual content once data is loaded with a fade-in effect */}
      <AnimatePresence>
        {contentVisible && (
          <motion.div
            className="profile-main-card"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            {isEditing ? (
              /* Edit Mode Section */
              <div className="profile-edit-section">
                <div className="profile-section-title">Edit Your Profile</div>

                <div className="profile-edit-content">
                  {/* Banner Edit */}
                  <div
                    className="profile-banner-edit"
                    style={{
                      backgroundImage: bannerImage
                        ? `url(${bannerImage})`
                        : `linear-gradient(135deg, ${walletColor}33, #151515)`,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                      cursor: "pointer",
                    }}
                    onClick={handleBannerImageClick}
                  >
                    <div className="banner-edit-overlay">
                      <BiCamera size={24} />
                      <span>Change Banner</span>
                    </div>
                    <input
                      type="file"
                      ref={bannerImageRef}
                      accept="image/*"
                      onChange={handleBannerImageChange}
                      style={{ display: "none" }}
                    />
                  </div>

                  {/* Profile Image Edit */}
                  <div className="profile-avatar-edit-container">
                    <div
                      className="profile-avatar-edit"
                      onClick={handleProfileImageClick}
                      style={{
                        backgroundImage: profileImage
                          ? `url(${profileImage})`
                          : "none",
                        backgroundColor: !profileImage
                          ? walletColor
                          : "transparent",
                        backgroundSize: "cover",
                        cursor: "pointer",
                      }}
                    >
                      {!profileImage &&
                        (username || "").charAt(0).toUpperCase()}
                      <div className="avatar-edit-overlay">
                        <BiCamera size={24} />
                      </div>
                    </div>
                    <input
                      type="file"
                      ref={profileImageRef}
                      accept="image/*"
                      onChange={handleProfileImageChange}
                      style={{ display: "none" }}
                    />
                  </div>

                  {/* Profile Info Edit */}
                  <div className="profile-edit-form">
                    <div className="form-group">
                      <label>Bio (max 150 chars)</label>
                      <textarea
                        value={bio}
                        onChange={(e) => setBio(e.target.value.slice(0, 150))}
                        placeholder="Tell others about yourself..."
                        maxLength={150}
                        className="profile-bio-input"
                      />
                      <div className="char-count">{bio.length}/150</div>
                    </div>

                    <div className="form-group">
                      <label>Status (max 30 chars)</label>
                      <input
                        type="text"
                        value={status}
                        onChange={(e) => setStatus(e.target.value.slice(0, 30))}
                        placeholder="What's on your mind?"
                        maxLength={30}
                        className="profile-status-input"
                      />
                      <div className="char-count">{status.length}/30</div>
                    </div>
                  </div>

                  {/* Edit Actions */}
                  <div className="profile-edit-actions">
                    <button
                      className="profile-cancel-button"
                      onClick={cancelEditing}
                      disabled={isSaving}
                    >
                      Cancel
                    </button>
                    <button
                      className="profile-save-button"
                      onClick={saveProfile}
                      disabled={isSaving}
                    >
                      {isSaving ? "Saving..." : "Save Changes"}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* View Mode */
              <>
                {/* Profile Header */}
                <div className="profile-header-section">
                  <div
                    className="profile-banner-img"
                    style={{
                      background: profileData?.bannerImage
                        ? `url(${profileData.bannerImage})`
                        : `linear-gradient(135deg, ${walletColor}33, #151515)`,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                      position: "relative",
                    }}
                  />

                  <div className="profile-avatar-container">
                    {!imageError && profileData?.profileImage ? (
                      <Image
                        src={profileData.profileImage}
                        alt={profileData?.name || username}
                        width={120}
                        height={120}
                        className="profile-avatar-img"
                        onError={() => setImageError(true)}
                      />
                    ) : (
                      <div
                        className="profile-avatar-fallback"
                        style={{ background: walletColor }}
                      >
                        {(profileData?.name || username)
                          .charAt(0)
                          .toUpperCase()}
                      </div>
                    )}
                  </div>

                  <div className="profile-user-info">
                    <div className="profile-name-row">
                      <h1 className="profile-user-name">
                        {profileData?.name || username}
                      </h1>

                      {isOwnProfile && (
                        <button
                          onClick={startEditing}
                          className="profile-edit-button"
                          title="Edit profile"
                        >
                          <MdModeEdit />
                          <span>Edit</span>
                        </button>
                      )}
                    </div>

                    <div className="profile-handle">@{username}</div>

                    {/* Display bio if available */}
                    {profileData?.bio && (
                      <div className="profile-bio">{profileData.bio}</div>
                    )}

                    {/* Display status if available */}
                    {profileData?.status && (
                      <div className="profile-status-display">
                        <span className="profile-status-indicator"></span>
                        <span className="profile-status-text">
                          {profileData.status}
                        </span>
                      </div>
                    )}

                    {profileData?.walletAddress && (
                      <div className="profile-wallet-badge">
                        <div className="profile-wallet-address">
                          {profileData.walletAddress.substring(0, 6)}...
                          {profileData.walletAddress.substring(
                            profileData.walletAddress.length - 4
                          )}
                        </div>
                        <Link
                          href={`https://basescan.org/address/${profileData.walletAddress}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="profile-chain-link"
                        >
                          View on BaseScan
                        </Link>
                      </div>
                    )}

                    {profileData?.joinedAt && (
                      <div className="profile-join-date">
                        Member since {formatDate(profileData.joinedAt)} ·{" "}
                        {getAccountAge(profileData.joinedAt)}
                      </div>
                    )}
                  </div>
                </div>

                {/* Stats Grid - only show if we have holder data */}
                {holderData && (
                  <div className="profile-stats-grid">
                    {/* Rank and Position - only show if we have rank data */}
                    {holderData.rank > 0 && (
                      <motion.div
                        className="profile-stat-card public-profile-rank-card"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                      >
                        <div className="profile-stat-icon">👑</div>
                        <div className="profile-stat-title">
                          Leaderboard Rank
                        </div>
                        <div className="profile-stat-value public-profile-rank-value">
                          <AnimatedNumber
                            value={holderData.rank}
                            duration={1000}
                          />
                        </div>
                        <div className="profile-stat-subtitle">
                          {holderData.totalHolders > 0 && holderData.rank > 0
                            ? `Top ${(
                                (holderData.rank / holderData.totalHolders) *
                                100
                              ).toFixed(2)}%`
                            : "Ranking data unavailable"}
                        </div>
                      </motion.div>
                    )}

                    {/* Token Holdings - only show if we have balance data */}
                    {holderData.balance_formatted > 0 && (
                      <motion.div
                        className="profile-stat-card public-profile-holdings-card"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                      >
                        <div className="profile-stat-icon">🔒</div>
                        <div className="profile-stat-title">$LOCK Holdings</div>
                        <div className="profile-stat-value public-profile-holdings-value">
                          <AnimatedNumber
                            value={
                              parseFloat(holderData.balance_formatted).toFixed(
                                4
                              ) || 0
                            }
                            duration={1000}
                            formatValue={(value) => value.toFixed(2)}
                          />
                        </div>
                        <div className="profile-stat-subtitle">
                          {holderData.percentage &&
                          typeof holderData.percentage === "number"
                            ? `${holderData.percentage.toFixed(4)}% of supply`
                            : "Percentage data unavailable"}
                        </div>
                      </motion.div>
                    )}

                    {/* Wallet Info - always show if we have holder data */}
                    <motion.div
                      className="profile-stat-card public-profile-wallet-card"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: 0.3 }}
                    >
                      <div className="profile-stat-icon">💼</div>
                      <div className="profile-stat-title">Wallet Status</div>
                      <div className="profile-stat-value public-profile-status-text">
                        Verified
                      </div>
                      <div className="profile-stat-subtitle">
                        {profileData?.walletConnectedAt
                          ? `Connected ${getAccountAge(
                              profileData.walletConnectedAt
                            )} ago`
                          : "Connected wallet"}
                      </div>
                    </motion.div>

                    {/* Value in USD - only show if we have value and price data */}
                    {holderData.usdValue > 0 && tokenPrice > 0 && (
                      <motion.div
                        className="profile-stat-card public-profile-value-card"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.4 }}
                      >
                        <div className="profile-stat-icon">💰</div>
                        <div className="profile-stat-title">
                          Portfolio Value
                        </div>
                        <div className="profile-stat-value public-profile-value-text">
                          <AnimatedNumber
                            value={parseFloat(holderData.usdValue) || 0}
                            duration={1000}
                            formatValue={(value) =>
                              value.toLocaleString("en-US", {
                                style: "currency",
                                currency: "USD",
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })
                            }
                          />
                        </div>
                        <div className="profile-stat-subtitle">
                          at ${parseFloat(tokenPrice).toFixed(8)} per token
                        </div>
                      </motion.div>
                    )}
                  </div>
                )}

                {/* Activity Section */}
                {holderData && (
                  <motion.div
                    className="profile-activity-section"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.4 }}
                  >
                    <h2 className="profile-section-title">
                      Holder Status
                      {holderData.rank === 0 && (
                        <span className="profile-status-pending">
                          (Pending leaderboard update)
                        </span>
                      )}
                    </h2>
                    <div className="profile-holder-status">
                      <div className="profile-status-item">
                        <div className="profile-status-label">
                          Wallet Connected
                        </div>
                        <div className="profile-status-value">
                          {formatDate(
                            profileData.walletConnectedAt ||
                              holderData.firstSeen
                          )}
                        </div>
                      </div>
                      <div className="profile-status-item">
                        <div className="profile-status-label">
                          {holderData.lastSeen !== holderData.firstSeen
                            ? "Last Transaction"
                            : "Status"}
                        </div>
                        <div className="profile-status-value">
                          {holderData.lastSeen !== holderData.firstSeen
                            ? formatDate(holderData.lastSeen)
                            : holderData.rank === 0
                            ? "Waiting for transactions"
                            : "Active"}
                        </div>
                      </div>
                      {holderData.rank === 0 && (
                        <div className="profile-status-item profile-status-note">
                          <div className="profile-status-label">Note</div>
                          <div className="profile-status-value profile-note-text">
                            User has connected their wallet but may not have
                            made any transactions yet. Rankings and token data
                            will appear after transactions are detected.
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}

                {/* Social Link */}
                <motion.div
                  className="profile-social-section"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.5 }}
                >
                  <Link
                    href={`https://twitter.com/${username}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="profile-twitter-link"
                  >
                    <span className="profile-twitter-icon">𝕏</span>
                    View on X (Twitter)
                  </Link>
                </motion.div>

                {/* Update the refresh section in your return JSX */}

                <div className="profile-refresh-section">
                  <div className="profile-refresh-info">
                    {isRefreshing ? (
                      <span className="profile-refreshing">
                        Refreshing data...
                      </span>
                    ) : cooldownEnds && !canRefresh ? (
                      <span className="profile-cooldown">
                        Next refresh available in{" "}
                        {formatCooldownTime(cooldownEnds)}
                        <span className="profile-cooldown-note">
                          (Refreshing the page won't reset this cooldown)
                        </span>
                      </span>
                    ) : (
                      <span className="profile-last-refreshed">
                        Last updated: {lastRefreshed.toLocaleTimeString()}
                        {holderData?.rank > 0 && (
                          <span className="profile-refresh-rate">
                            (auto-refreshes every{" "}
                            {formatRefreshRate(refreshCooldown)})
                          </span>
                        )}
                      </span>
                    )}
                  </div>
                  <button
                    className={`profile-refresh-button ${
                      !canRefresh ? "profile-refresh-cooldown" : ""
                    }`}
                    onClick={handleManualRefresh}
                    disabled={isRefreshing || !canRefresh}
                    style={{
                      position: "relative",
                      overflow: "hidden",
                    }}
                  >
                    {isRefreshing
                      ? "Refreshing..."
                      : !canRefresh
                      ? `Wait ${formatCooldownTime(cooldownEnds)}`
                      : "Refresh Data"}

                    {/* Add a progress bar that animates based on remaining time */}
                    {!canRefresh && cooldownEnds && (
                      <span
                        className="profile-cooldown-progress"
                        style={{
                          position: "absolute",
                          bottom: 0,
                          left: 0,
                          height: "3px",
                          backgroundColor: "rgba(255, 179, 0, 0.5)",
                          width: `${
                            ((cooldownEnds.getTime() - new Date().getTime()) /
                              refreshCooldown) *
                            100
                          }%`,
                        }}
                      />
                    )}
                  </button>
                </div>

                <div className="profile-footer-section">
                  <button
                    className="profile-back-button"
                    onClick={() => router.back()}
                  >
                    Go Back
                  </button>
                </div>

                {profileData?.messageStyle && (
                  <MessageStylePreview
                    messageStyle={profileData.messageStyle}
                  />
                )}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hidden file inputs */}
      <input
        type="file"
        ref={profileImageRef}
        accept="image/*"
        onChange={handleProfileImageChange}
        style={{ display: "none" }}
      />
      <input
        type="file"
        ref={bannerImageRef}
        accept="image/*"
        onChange={handleBannerImageChange}
        style={{ display: "none" }}
      />
    </div>
  );
}

// Keep the ProfileSkeleton component
const ProfileSkeleton = () => {
  // Add responsive sizing based on window width
  const [skeletonWidth, setSkeletonWidth] = useState("90%");

  useEffect(() => {
    const updateWidth = () => {
      const width = window.innerWidth;
      if (width > 1440) {
        setSkeletonWidth("900px"); // Large screens
      } else if (width > 1024) {
        setSkeletonWidth("80%"); // Medium-large screens
      } else if (width > 768) {
        setSkeletonWidth("90%"); // Medium screens
      } else {
        setSkeletonWidth("95%"); // Mobile
      }
    };

    // Set initial width
    updateWidth();

    // Update on resize
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, []);

  return (
    <div className="profile-page-container profile-skeleton-container">
      <div
        className="profile-main-card profile-skeleton-card"
        style={{ maxWidth: skeletonWidth }}
      >
        {/* Skeleton header */}
        <div className="profile-header-section">
          <div className="profile-banner-img profile-skeleton-banner" />
          <div className="profile-avatar-container">
            <div className="profile-avatar-img profile-skeleton-avatar">
              <div className="profile-skeleton-pulse"></div>
            </div>
          </div>
          <div className="profile-user-info">
            <div className="profile-skeleton-name">
              <div className="profile-skeleton-pulse"></div>
            </div>
            <div className="profile-skeleton-handle">
              <div className="profile-skeleton-pulse"></div>
            </div>
            <div className="profile-skeleton-wallet-badge">
              <div className="profile-skeleton-pulse"></div>
            </div>
            <div className="profile-skeleton-join-date">
              <div className="profile-skeleton-pulse"></div>
            </div>
          </div>
        </div>

        {/* Skeleton stats */}
        <div className="profile-stats-grid">
          {[1, 2, 3, 4].map((item) => (
            <div
              key={item}
              className="profile-stat-card profile-skeleton-stat-card"
            >
              <div className="profile-skeleton-icon">
                <div className="profile-skeleton-pulse-circle"></div>
              </div>
              <div className="profile-skeleton-stat-title">
                <div className="profile-skeleton-pulse"></div>
              </div>
              <div className="profile-skeleton-stat-value">
                <div className="profile-skeleton-pulse"></div>
              </div>
              <div className="profile-skeleton-stat-subtitle">
                <div className="profile-skeleton-pulse"></div>
              </div>
            </div>
          ))}
        </div>

        {/* Other skeleton sections */}
        <div className="profile-activity-section">
          <div className="profile-skeleton-section-title">
            <div className="profile-skeleton-pulse"></div>
          </div>
          <div className="profile-holder-status">
            {[1, 2].map((item) => (
              <div
                key={item}
                className="profile-status-item profile-skeleton-status-item"
              >
                <div className="profile-skeleton-status-label">
                  <div className="profile-skeleton-pulse"></div>
                </div>
                <div className="profile-skeleton-status-value">
                  <div className="profile-skeleton-pulse"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// Update the MessageStylePreview to show the advanced styles
const MessageStylePreview = ({ messageStyle }) => {
  if (!messageStyle || Object.keys(messageStyle).length === 0) {
    return null;
  }

  // Get animation class based on animation type
  let animationClass = "";
  if (messageStyle.animationType === "pulse") {
    animationClass = "animate-pulse";
  } else if (messageStyle.animationType === "gradient") {
    animationClass = "animate-gradient";
  } else if (messageStyle.animationType === "glow") {
    animationClass = "animate-glow";
  } else if (messageStyle.animationType === "rainbow") {
    animationClass = "animate-rainbow";
  }

  // Create style object
  const messageStyleObj = {
    background:
      messageStyle.gradient || messageStyle.bgColor || "rgba(14, 14, 14, 0.95)",
    color: messageStyle.textColor || "#ffffff",
    fontFamily: messageStyle.fontFamily || "inherit",
    fontWeight: messageStyle.fontWeight || "normal",
    fontStyle: messageStyle.fontStyle || "normal",
  };

  // Add glow if enabled
  if (messageStyle.glow) {
    messageStyleObj.boxShadow = `0 0 15px ${
      messageStyle.bgColor || "rgba(98, 134, 252, 0.5)"
    }`;
  }

  return (
    <div className="profile-message-style">
      <h4 className="profile-section-title">Message Style</h4>
      <div
        className={`message-style-preview ${animationClass}`}
        style={messageStyleObj}
      >
        <span
          className="preview-username"
          style={{ color: messageStyle.textColor }}
        >
          @{profileData?.username || "user"}
        </span>
        <p className="preview-text">This is how my messages appear</p>

        {messageStyle.sticker && (
          <div className="profile-message-sticker">{messageStyle.sticker}</div>
        )}
      </div>
    </div>
  );
};
