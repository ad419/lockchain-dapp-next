"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { MdModeEdit } from "react-icons/md";
import { BiCamera } from "react-icons/bi";
import AnimatedNumber from "./AnimatedNumber";
import "../styles/PublicProfile.css";
import { useDataCache } from "../context/DataCacheContext";

// Cache settings
const DEFAULT_REFRESH_COOLDOWN = 10 * 60 * 1000; // 10 minutes in milliseconds

/**
 * Client-side component for interactive profile functionality
 * Uses server-provided initial data for instant loading
 */
const PublicProfileClient = ({
  initialProfileData,
  initialHolderData,
  initialTokenPrice = 0,
  username,
}) => {
  // Add this state to track client-side mounting
  const [isMounted, setIsMounted] = useState(false);

  // Your existing state
  const router = useRouter();
  const { data: session } = useSession();
  const { profiles } = useDataCache();

  // Initialize state with server-provided data
  const [profileData, setProfileData] = useState(initialProfileData);
  const [holderData, setHolderData] = useState(initialHolderData);
  const [tokenPrice, setTokenPrice] = useState(initialTokenPrice);
  const [loading, setLoading] = useState(false);
  const [contentVisible, setContentVisible] = useState(true); // Start visible with SSR data
  const [error, setError] = useState(null);
  const [imageError, setImageError] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshCooldown, setRefreshCooldown] = useState(
    DEFAULT_REFRESH_COOLDOWN
  );
  const [cooldownEnds, setCooldownEnds] = useState(null);
  const [canRefresh, setCanRefresh] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [bio, setBio] = useState(initialProfileData?.bio || "");
  const [status, setStatus] = useState(initialProfileData?.status || "");
  const [profileImage, setProfileImage] = useState(
    initialProfileData?.profileImage || null
  );
  const [bannerImage, setBannerImage] = useState(
    initialProfileData?.bannerImage || null
  );
  const [isSaving, setIsSaving] = useState(false);

  // Refs
  const profileImageRef = useRef(null);
  const bannerImageRef = useRef(null);
  const abortControllerRef = useRef(null);
  const currentUsername = useRef(username);

  // Force update helper for cooldown timer
  const [, updateState] = useState({});
  const forceUpdate = useCallback(() => updateState({}), []);

  // Add this effect to fix hydration issues
  useEffect(() => {
    setIsMounted(true);
  }, []);

  /**
   * Format cooldown time remaining
   */
  const formatCooldownTime = (endTime) => {
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

  /**
   * Format refresh rate for display
   */
  const formatRefreshRate = (milliseconds) => {
    const minutes = milliseconds / (1000 * 60);
    return `${minutes} ${minutes === 1 ? "minute" : "minutes"}`;
  };

  /**
   * Fetch holder data for a wallet address
   */
  const fetchHolderData = async (walletAddress) => {
    if (!walletAddress) return;

    // Use the abort controller for cancellation
    const signal = abortControllerRef.current?.signal;
    if (signal?.aborted) return;

    try {
      // Check if we're refreshing
      const queryParams = isRefreshing ? "?refresh=true" : "";

      console.log(`Fetching holder data for wallet: ${walletAddress}`);

      const response = await fetch(
        `/api/holder-data?address=${walletAddress}${queryParams}`,
        signal ? { signal } : {}
      );

      if (signal?.aborted) return;

      if (!response.ok) {
        throw new Error(`Holder data request failed: ${response.status}`);
      }

      const data = await response.json();

      if (signal?.aborted) return;

      // Update holder data
      setHolderData(
        data.data || {
          rank: 0,
          balance_formatted: "0",
          percentage: "0",
          usdValue: "0",
          firstSeen: new Date().toISOString(),
          lastSeen: new Date().toISOString(),
          totalHolders: 0,
        }
      );

      // Update token price if available
      if (data.tokenPrice) {
        setTokenPrice(data.tokenPrice);
      }

      setLastRefreshed(new Date());
    } catch (error) {
      if (error.name === "AbortError") return;

      console.error("Error fetching holder data:", error);
      // Set fallback data
      setHolderData({
        rank: 0,
        balance_formatted: "0",
        percentage: "0",
        usdValue: "0",
        firstSeen: new Date().toISOString(),
        lastSeen: new Date().toISOString(),
        totalHolders: 0,
      });
    }
  };

  /**
   * Check if current user is viewing their own profile
   */
  useEffect(() => {
    if (session && profileData) {
      // Compare username or twitter username
      const currentUser = session.user.username?.toLowerCase();
      const profileUser = profileData.twitterUsername?.toLowerCase();

      const isOwn = currentUser === profileUser;
      setIsOwnProfile(isOwn);

      if (isOwn) {
        setBio(profileData.bio || "");
        setStatus(profileData.status || "");
        setProfileImage(profileData.profileImage || profileData.image);
        setBannerImage(profileData.bannerImage);
      }
    }
  }, [session, profileData]);

  /**
   * Adjust refresh cooldown based on holder rank
   */
  useEffect(() => {
    // Higher ranked holders get faster refresh rates
    if (holderData?.rank > 0) {
      if (holderData.rank <= 10) {
        setRefreshCooldown(3 * 60 * 1000); // 3 minutes for top 10
      } else if (holderData.rank <= 50) {
        setRefreshCooldown(5 * 60 * 1000); // 5 minutes for top 50
      } else if (holderData.rank <= 100) {
        setRefreshCooldown(8 * 60 * 1000); // 8 minutes for top 100
      } else {
        setRefreshCooldown(10 * 60 * 1000); // 10 minutes for everyone else
      }
    }
  }, [holderData?.rank]);

  /**
   * Restore cooldown state from localStorage
   */
  useEffect(() => {
    const storedCooldown = localStorage.getItem(`profile_cooldown_${username}`);

    if (storedCooldown) {
      try {
        const cooldownData = JSON.parse(storedCooldown);
        const endsAt = new Date(cooldownData.endsAt);
        const now = new Date();

        if (endsAt > now) {
          setCooldownEnds(endsAt);
          setCanRefresh(false);
        } else {
          // Cooldown has expired
          localStorage.removeItem(`profile_cooldown_${username}`);
        }
      } catch (e) {
        console.error("Error parsing cooldown data:", e);
        localStorage.removeItem(`profile_cooldown_${username}`);
      }
    }
  }, [username]);

  /**
   * Update the cooldown timer regularly
   */
  useEffect(() => {
    let timerId = null;

    if (cooldownEnds && !canRefresh) {
      timerId = setInterval(() => {
        const now = new Date();
        if (cooldownEnds <= now) {
          setCanRefresh(true);
          setCooldownEnds(null);
          localStorage.removeItem(`profile_cooldown_${username}`);
          clearInterval(timerId);
        } else {
          forceUpdate(); // Force re-render to update countdown display
        }
      }, 1000);
    }

    return () => {
      if (timerId) clearInterval(timerId);
    };
  }, [cooldownEnds, canRefresh, username, forceUpdate]);

  /**
   * Manual refresh function that respects cooldown
   */
  const refreshProfileData = async () => {
    try {
      if (!canRefresh) return;

      setIsRefreshing(true);

      // Create new abort controller
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      // Start cooldown timer
      const endTime = new Date();
      endTime.setTime(endTime.getTime() + refreshCooldown);
      setCooldownEnds(endTime);
      setCanRefresh(false);

      // Store cooldown in localStorage
      localStorage.setItem(
        `profile_cooldown_${username}`,
        JSON.stringify({
          endsAt: endTime.toISOString(),
          cooldownMs: refreshCooldown,
          startedAt: Date.now(),
        })
      );

      // Fetch fresh profile data with refresh flag
      const response = await fetch(
        `/api/user-profile?username=${encodeURIComponent(
          username
        )}&refresh=true`,
        { signal: abortControllerRef.current.signal }
      );

      if (abortControllerRef.current.signal.aborted) return;

      if (!response.ok) {
        throw new Error(`Profile refresh failed: ${response.status}`);
      }

      const profileData = await response.json();

      if (abortControllerRef.current.signal.aborted) return;

      if (!profileData.success) {
        throw new Error(profileData.message || "User not found");
      }

      // Update profile data
      setProfileData(profileData.user);

      // Fetch holder data if wallet address exists
      if (profileData.user?.walletAddress) {
        await fetchHolderData(profileData.user.walletAddress);
      }

      setLastRefreshed(new Date());
    } catch (error) {
      if (error.name === "AbortError") return;

      console.error("Error refreshing profile:", error);
      setError(error.message);
    } finally {
      if (!abortControllerRef.current?.signal.aborted) {
        setIsRefreshing(false);
      }
    }
  };

  /**
   * Clean up abort controller on unmount
   */
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  /**
   * Handle manual refresh with cooldown
   */
  const handleManualRefresh = () => {
    if (!isRefreshing && canRefresh) {
      refreshProfileData();
    }
  };

  /**
   * Profile image click handler
   */
  const handleProfileImageClick = () => {
    if (!isEditing || !isOwnProfile) return;
    profileImageRef.current?.click();
  };

  /**
   * Banner image click handler
   */
  const handleBannerImageClick = () => {
    if (!isEditing || !isOwnProfile) return;
    bannerImageRef.current?.click();
  };

  /**
   * Handle profile image change
   */
  const handleProfileImageChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setProfileImage(event.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  /**
   * Handle banner image change
   */
  const handleBannerImageChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setBannerImage(event.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  /**
   * Start editing profile
   */
  const startEditing = () => {
    if (!isOwnProfile) return;
    setIsEditing(true);
  };

  /**
   * Cancel editing profile
   */
  const cancelEditing = () => {
    setIsEditing(false);
    // Reset to original values
    if (profileData) {
      setBio(profileData.bio || "");
      setStatus(profileData.status || "");
      setProfileImage(profileData.profileImage || profileData.image);
      setBannerImage(profileData.bannerImage);
    }
  };

  /**
   * Save profile changes
   */
  const saveProfile = async () => {
    if (!isOwnProfile) return;

    setIsSaving(true);

    try {
      const response = await fetch("/api/update-profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: profileData.id,
          username: profileData.username,
          bio,
          status,
          profileImage,
          bannerImage,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to save profile (${response.status})`);
      }

      const result = await response.json();

      if (result.success) {
        // Update the profile data with new values
        setProfileData({
          ...profileData,
          bio,
          status,
          profileImage,
          bannerImage,
        });

        // Exit edit mode
        setIsEditing(false);

        // Force a refresh of the data
        refreshProfileData();
      } else {
        throw new Error(result.message || "Failed to save profile");
      }
    } catch (err) {
      console.error("Error saving profile:", err);
      alert(`Error saving profile: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Format date to readable string
   */
  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(date);
  };

  /**
   * Format account age
   */
  const getAccountAge = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 1) {
      return "Today";
    } else if (diffDays === 1) {
      return "1 day";
    } else if (diffDays < 30) {
      return `${diffDays} days`;
    } else if (diffDays < 365) {
      const months = Math.floor(diffDays / 30);
      return `${months} ${months === 1 ? "month" : "months"}`;
    } else {
      const years = Math.floor(diffDays / 365);
      return `${years} ${years === 1 ? "year" : "years"}`;
    }
  };

  /**
   * Get a unique color based on wallet address or username
   */
  const getWalletColor = (address) => {
    if (!address) return "rgb(64, 63, 173)";

    const hash = address.slice(-6);
    const r = parseInt(hash.slice(0, 2), 16);
    const g = parseInt(hash.slice(2, 4), 16);
    const b = parseInt(hash.slice(4, 6), 16);

    return `rgb(${r}, ${g}, ${b})`;
  };

  // Generate wallet color
  const walletColor = getWalletColor(profileData?.walletAddress || username);

  // Error UI
  if (error) {
    return (
      <div className="profile-page-container">
        <div className="profile-error">
          <h2>Error Loading Profile</h2>
          <p>{error}</p>
          <button className="profile-back-button" onClick={() => router.back()}>
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // Return a simpler version during server rendering
  if (!isMounted) {
    return (
      <div suppressHydrationWarning className="profile-page-container">
        <motion.div
          className="profile-main-card"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Minimal content that won't cause hydration issues */}
          {profileData && (
            <div className="profile-header-section">
              <div
                className="profile-banner-img"
                style={{
                  backgroundImage: profileData?.bannerImage
                    ? `url(${profileData.bannerImage})`
                    : undefined,
                }}
              />
              <div className="profile-avatar-container">
                {profileData?.profileImage ? (
                  <div
                    className="profile-avatar-img"
                    style={{
                      backgroundImage: `url(${profileData.profileImage})`,
                    }}
                  />
                ) : (
                  <div className="profile-avatar-fallback">
                    {(profileData?.name || username).charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="profile-user-info">
                <h1 className="profile-user-name">
                  {profileData?.name || username}
                </h1>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    );
  }

  // Regular render with full content after hydration
  return (
    <div className="profile-page-container">
      {/* Main profile content */}
      <motion.div
        className="profile-main-card"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.5 }}
      >
        {isEditing ? (
          <ProfileEditMode
            bio={bio}
            setBio={setBio}
            status={status}
            setStatus={setStatus}
            profileImage={profileImage}
            bannerImage={bannerImage}
            walletColor={walletColor}
            username={username}
            cancelEditing={cancelEditing}
            saveProfile={saveProfile}
            isSaving={isSaving}
            handleProfileImageClick={handleProfileImageClick}
            handleBannerImageClick={handleBannerImageClick}
            profileImageRef={profileImageRef}
            bannerImageRef={bannerImageRef}
          />
        ) : (
          <ProfileViewMode
            profileData={profileData}
            holderData={holderData}
            tokenPrice={tokenPrice}
            username={username}
            walletColor={walletColor}
            imageError={imageError}
            setImageError={setImageError}
            isOwnProfile={isOwnProfile}
            startEditing={startEditing}
            formatDate={formatDate}
            getAccountAge={getAccountAge}
            lastRefreshed={lastRefreshed}
            isRefreshing={isRefreshing}
            cooldownEnds={cooldownEnds}
            canRefresh={canRefresh}
            formatCooldownTime={formatCooldownTime}
            formatRefreshRate={formatRefreshRate}
            refreshCooldown={refreshCooldown}
            handleManualRefresh={handleManualRefresh}
            router={router}
          />
        )}
      </motion.div>

      {/* Hidden file inputs for image uploads */}
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
};

/**
 * Profile Edit Mode Component
 */
function ProfileEditMode({
  bio,
  setBio,
  status,
  setStatus,
  profileImage,
  bannerImage,
  walletColor,
  username,
  cancelEditing,
  saveProfile,
  isSaving,
  handleProfileImageClick,
  handleBannerImageClick,
  profileImageRef,
  bannerImageRef,
}) {
  return (
    <div className="profile-edit-section">
      <div className="profile-section-title">Edit Your Profile</div>

      <div className="profile-edit-content">
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
        </div>

        <div className="profile-avatar-edit-container">
          <div
            className="profile-avatar-edit"
            onClick={handleProfileImageClick}
            style={{
              backgroundImage: profileImage ? `url(${profileImage})` : "none",
              backgroundColor: !profileImage ? walletColor : "transparent",
              backgroundSize: "cover",
              cursor: "pointer",
            }}
          >
            {!profileImage && (username || "").charAt(0).toUpperCase()}
            <div className="avatar-edit-overlay">
              <BiCamera size={24} />
            </div>
          </div>
        </div>

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
  );
}

/**
 * Profile View Mode Component
 */
function ProfileViewMode({
  profileData,
  holderData,
  tokenPrice,
  username,
  walletColor,
  imageError,
  setImageError,
  isOwnProfile,
  startEditing,
  formatDate,
  getAccountAge,
  lastRefreshed,
  isRefreshing,
  cooldownEnds,
  canRefresh,
  formatCooldownTime,
  formatRefreshRate,
  refreshCooldown,
  handleManualRefresh,
  router,
}) {
  return (
    <>
      {/* Profile Header */}
      <div
        className="profile-banner-img"
        style={{
          backgroundImage: profileData?.bannerImage
            ? `url(${profileData.bannerImage})`
            : `linear-gradient(135deg, ${walletColor}33, #151515)`,
        }}
      />

      <div className="profile-header-section">
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
              {(profileData?.name || username).charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        <div className="profile-user-info">
          <div className="profile-name-row">
            <h1 className="profile-user-name">
              {profileData?.name || username}
            </h1>

            {/* Add wallet connection indicator right here */}
            {profileData?.walletAddress && (
              <div className="profile-wallet-status">
                <span className="status-dot connected"></span>
                <span className="status-text">Wallet Connected</span>
              </div>
            )}

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

          {profileData?.bio && (
            <div className="profile-bio">{profileData.bio}</div>
          )}

          {profileData?.status && (
            <div className="profile-status-display">
              <span className="profile-status-indicator"></span>
              <span className="profile-status-text">{profileData.status}</span>
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

      {/* Stats Grid - Debug with explicit checks */}
      {holderData && (
        <div className="profile-stats-grid">
          {/* Rank and Position - with explicit check */}
          {holderData && Number(holderData.rank) > 0 && (
            <motion.div
              className="profile-stat-card public-profile-rank-card"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <div className="profile-stat-icon">👑</div>
              <div className="profile-stat-title">Leaderboard Rank</div>
              <div className="profile-stat-value public-profile-rank-value">
                <AnimatedNumber
                  value={Number(holderData.rank)}
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

          {/* Token Holdings - with explicit parsing of balance */}
          {holderData && parseFloat(holderData.balance_formatted) > 0 && (
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
                  value={parseFloat(holderData.balance_formatted).toFixed(4)}
                  duration={1000}
                  formatValue={(value) => Number(value).toFixed(2)}
                />
              </div>
              <div className="profile-stat-subtitle">
                {holderData.percentage
                  ? `${parseFloat(holderData.percentage).toFixed(6)}% of supply`
                  : ""}
              </div>
            </motion.div>
          )}

          {/* USD Value - only show if there's a balance and token price */}
          {holderData && parseFloat(holderData.balance_formatted) > 0 && (
            <motion.div
              className="profile-stat-card public-profile-value-card"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <div className="profile-stat-icon">💰</div>
              <div className="profile-stat-title">Holdings Value</div>
              <div className="profile-stat-value public-profile-value-text">
                $
                <AnimatedNumber
                  value={parseFloat(holderData.usdValue || "0").toFixed(2)}
                  duration={1000}
                  formatValue={(value) => Number(value).toFixed(2)}
                />
              </div>
              <div className="profile-stat-subtitle">
                {tokenPrice
                  ? `@ $${parseFloat(tokenPrice).toFixed(8)} per token`
                  : ""}
              </div>
            </motion.div>
          )}
        </div>
      )}

      {/* Holder activity section */}
      {holderData && parseFloat(holderData.balance_formatted) > 0 && (
        <motion.div
          className="profile-activity-section"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <div className="profile-section-title">Holder Activity</div>

          <div className="profile-holder-status">
            {holderData.firstSeen && (
              <div className="profile-status-item">
                <div className="profile-status-label">First Seen</div>
                <div className="profile-status-value">
                  {formatDate(holderData.firstSeen)}
                </div>
              </div>
            )}

            {holderData.lastSeen && (
              <div className="profile-status-item">
                <div className="profile-status-label">Last Active</div>
                <div className="profile-status-value">
                  {formatDate(holderData.lastSeen)}
                </div>
              </div>
            )}

            {holderData.rank === 0 && (
              <div className="profile-status-item profile-status-note">
                <div className="profile-status-label">Note</div>
                <div className="profile-status-value profile-note-text">
                  User has connected their wallet but may not have made any
                  transactions yet. Rankings and token data will appear after
                  transactions are detected.
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Social Links */}
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

      {/* Refresh Section */}
      <div className="profile-refresh-section">
        <div className="profile-refresh-info">
          {isRefreshing ? (
            <span className="profile-refreshing">Refreshing data...</span>
          ) : cooldownEnds && !canRefresh ? (
            <span className="profile-cooldown">
              Next refresh available in {formatCooldownTime(cooldownEnds)}
              <span className="profile-cooldown-note">
                (Refreshing the page won't reset this cooldown)
              </span>
            </span>
          ) : (
            <span className="profile-last-refreshed">
              Last updated: {lastRefreshed.toLocaleTimeString()}
              {holderData?.rank > 0 && (
                <span className="profile-refresh-rate">
                  (auto-refreshes every {formatRefreshRate(refreshCooldown)})
                </span>
              )}
            </span>
          )}
        </div>
        {/* <button
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
        </button> */}
      </div>

      {/* Footer Section */}
      <div className="profile-footer-section">
        <button className="profile-back-button" onClick={() => router.back()}>
          Go Back
        </button>
      </div>

      {/* Message Style Preview */}
      {profileData?.messageStyle && (
        <MessageStylePreview
          messageStyle={profileData.messageStyle}
          profileData={profileData}
        />
      )}
    </>
  );
}

/**
 * Message Style Preview Component
 */
function MessageStylePreview({ messageStyle, profileData }) {
  return (
    <div className="profile-message-style">
      <div className="profile-section-title">Message Style Preview</div>
      <div
        className="message-style-preview"
        style={{
          backgroundColor: messageStyle.bgColor || "rgba(14, 14, 14, 0.95)",
          color: messageStyle.textColor || "#ffffff",
          background: messageStyle.gradient || undefined,
        }}
      >
        <span className="preview-username">
          @{profileData.username || profileData.twitterUsername}
        </span>
        <p className="preview-text">
          This is how my messages will appear in the chat! 💬
        </p>
        {messageStyle.sticker && (
          <div className="profile-message-sticker">{messageStyle.sticker}</div>
        )}
      </div>
    </div>
  );
}

export default PublicProfileClient;
