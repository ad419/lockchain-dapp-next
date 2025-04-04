"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import AnimatedNumber from "./AnimatedNumber";
import { ethers } from "ethers";
// import defaultAvatar from "../images/default-avatar.png";
import "../styles/PublicProfile.css";
import tokenAbi from "../json/token.json";
import { contract, DEFAULT_CHAIN } from "../hooks/constant";

export default function PublicProfile({ username }) {
  const router = useRouter();
  const [profileData, setProfileData] = useState(null);
  const [holderData, setHolderData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [imageError, setImageError] = useState(false);
  const [tokenPrice, setTokenPrice] = useState(0);

  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        setLoading(true);
        
        // Fetch user profile data
        const profileResponse = await fetch(`/api/user-profile?username=${encodeURIComponent(username)}`);
        
        if (!profileResponse.ok) {
          throw new Error("Failed to fetch profile data");
        }
        
        const profileData = await profileResponse.json();
        
        if (!profileData.success) {
          throw new Error(profileData.message || "User not found");
        }
        
        setProfileData(profileData.user);
        
        // If user has a wallet, fetch their holder data
        if (profileData.user?.walletAddress) {
          try {
            const holderResponse = await fetch(`/api/holder-data?address=${profileData.user.walletAddress}`);
            
            if (holderResponse.ok) {
              const holderData = await holderResponse.json();
              setHolderData(holderData.data);
              
              // Get token price
              if (holderData.tokenPrice) {
                setTokenPrice(holderData.tokenPrice);
              }
            } else {
              console.log("Holder data not available");
              // We'll show the profile without holder data
            }
          } catch (holderErr) {
            console.error("Error fetching holder data:", holderErr);
            // Continue without holder data
          }
        }
      } catch (err) {
        console.error("Error fetching profile:", err);
        setError(err.message || "Failed to load profile");
      } finally {
        setLoading(false);
      }
    };

    if (username) {
      fetchProfileData();
    }
  }, [username]);

  // Format date to readable string
  const formatDate = (dateString) => {
    if (!dateString) return "Unknown";
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
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
      return `${months} month${months > 1 ? 's' : ''}`;
    } else {
      const years = Math.floor(diffDays / 365);
      const remainingMonths = Math.floor((diffDays % 365) / 30);
      return `${years} year${years > 1 ? 's' : ''}${remainingMonths > 0 ? `, ${remainingMonths} month${remainingMonths > 1 ? 's' : ''}` : ''}`;
    }
  };

  // Get a unique color based on wallet address
  const getWalletColor = (address) => {
    if (!address) return "#6286fc";
    const hash = address.slice(-6);
    const r = parseInt(hash.slice(0, 2), 16);
    const g = parseInt(hash.slice(2, 4), 16);
    const b = parseInt(hash.slice(4, 6), 16);
    return `rgb(${r}, ${g}, ${b})`;
  };

  if (loading) {
    return (
      <div className="profile-page-container">
        <div className="profile-loading">
          <div className="spinner"></div>
          <p>Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="profile-page-container">
        <div className="profile-error">
          <h2>Profile Not Found</h2>
          <p>{error}</p>
          <button 
            className="back-button"
            onClick={() => router.back()}
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const walletColor = getWalletColor(profileData?.walletAddress);

  return (
    <div className="profile-page-container">
      <motion.div 
        className="profile-card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Profile Header */}
        <div className="profile-header">
          <div className="profile-banner" style={{ 
            background: `linear-gradient(135deg, ${walletColor}33, #151515)` 
          }}/>
          
          <div className="profile-avatar-container">
            {!imageError && profileData?.profileImage ? (
              <Image
                src={profileData.profileImage}
                alt={profileData.name || username}
                width={120}
                height={120}
                className="profile-avatar"
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="profile-avatar-fallback" style={{ background: walletColor }}>
                {(profileData?.name || username).charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          <div className="profile-info">
            <h1 className="profile-name">{profileData?.name || username}</h1>
            <div className="profile-username">@{username}</div>
            
            {profileData?.walletAddress && (
              <div className="wallet-badge">
                <div className="wallet-address">
                  {profileData.walletAddress.substring(0, 6)}...
                  {profileData.walletAddress.substring(profileData.walletAddress.length - 4)}
                </div>
                <Link 
                  href={`https://basescan.org/address/${profileData.walletAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="view-on-chain"
                >
                  View on BaseScan
                </Link>
              </div>
            )}

            {profileData?.joinedAt && (
              <div className="joined-date">
                Member since {formatDate(profileData.joinedAt)} · {getAccountAge(profileData.joinedAt)}
              </div>
            )}
          </div>
        </div>

        {/* Stats Grid - only show if we have holder data */}
        {holderData && (
          <div className="stats-grid">
            {/* Rank and Position - only show if we have rank data */}
            {holderData.rank > 0 && (
              <motion.div 
                className="stat-card rank-card"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
              >
                <div className="stat-icon">👑</div>
                <div className="stat-title">Leaderboard Rank</div>
                <div className="stat-value">
                  <AnimatedNumber
                    value={holderData.rank}
                    duration={1000}
                  />
                </div>
                <div className="stat-subtitle">
                  {holderData.totalHolders > 0 ? 
                    `Top ${((holderData.rank / holderData.totalHolders) * 100).toFixed(2)}%` : 
                    'Ranking data unavailable'}
                </div>
              </motion.div>
            )}

            {/* Token Holdings - only show if we have balance data */}
            {holderData.balance_formatted > 0 && (
              <motion.div 
                className="stat-card holdings-card"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <div className="stat-icon">🔒</div>
                <div className="stat-title">$LOCK Holdings</div>
                <div className="stat-value">
                  <AnimatedNumber
                    value={parseFloat(holderData.balance_formatted)}
                    duration={1000}
                    formatValue={(value) => value.toFixed(2)}
                  />
                </div>
                <div className="stat-subtitle">
                  {holderData.percentage > 0 ? 
                    `${holderData.percentage.toFixed(4)}% of supply` : 
                    'Percentage data unavailable'}
                </div>
              </motion.div>
            )}

            {/* Wallet Info - always show if we have holder data */}
            <motion.div 
              className="stat-card wallet-card"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <div className="stat-icon">💼</div>
              <div className="stat-title">Wallet Status</div>
              <div className="stat-value status-text">Verified</div>
              <div className="stat-subtitle">
                {profileData?.walletConnectedAt ? 
                  `Connected ${getAccountAge(profileData.walletConnectedAt)} ago` : 
                  'Connected wallet'}
              </div>
            </motion.div>
            
            {/* Value in USD - only show if we have value and price data */}
            {holderData.usdValue > 0 && tokenPrice > 0 && (
              <motion.div 
                className="stat-card value-card"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
              >
                <div className="stat-icon">💰</div>
                <div className="stat-title">Portfolio Value</div>
                <div className="stat-value">
                  <AnimatedNumber
                    value={parseFloat(holderData.usdValue)}
                    duration={1000}
                    formatValue={(value) => 
                      value.toLocaleString('en-US', {
                        style: 'currency',
                        currency: 'USD',
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })
                    }
                  />
                </div>
                <div className="stat-subtitle">
                  at ${parseFloat(tokenPrice).toFixed(8)} per token
                </div>
              </motion.div>
            )}
          </div>
        )}

        {/* Activity Section */}
        {holderData && (
          <motion.div 
            className="activity-section"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <h2 className="section-title">Holder Status</h2>
            <div className="holder-status">
              <div className="status-item">
                <div className="status-label">Holder Since</div>
                <div className="status-value">{holderData.firstSeen ? formatDate(holderData.firstSeen) : 'Unknown'}</div>
              </div>
              <div className="status-item">
                <div className="status-label">Last Transaction</div>
                <div className="status-value">{holderData.lastSeen ? formatDate(holderData.lastSeen) : 'Unknown'}</div>
              </div>
              {holderData.txCount && (
                <div className="status-item">
                  <div className="status-label">Total Transactions</div>
                  <div className="status-value">{holderData.txCount}</div>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Social Link */}
        <motion.div 
          className="social-section"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <Link 
            href={`https://twitter.com/${username}`}
            target="_blank"
            rel="noopener noreferrer"
            className="twitter-link"
          >
            <span className="twitter-icon">𝕏</span>
            View on X (Twitter)
          </Link>
        </motion.div>

        <div className="profile-footer">
          <button 
            className="back-button"
            onClick={() => router.back()}
          >
            Go Back
          </button>
        </div>
      </motion.div>
    </div>
  );
}